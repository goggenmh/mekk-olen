import { useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../../supabaseClient';
import { useIsMobile } from '../../lib/useIsMobile';
import { Icon } from '../ui/Icon';

interface Bilete { media_type: string; data: string; url: string }
interface Melding {
  rolle: 'user' | 'assistant';
  tekst: string;
  bilete?: Bilete;
  kjelder?: { url: string; tittel: string }[];
  sokte?: boolean;
  feil?: boolean;
}

const DOME = ['Kva er ein latmannsarm?', 'Kva skrue passar i betong?', 'Kva treng ein kunde for å byte dekk sjølv?', 'Skilnaden på syrefast og galvanisert?'];

/** Skaler ned biletet (lengste side 1568 px) og gjer det om til JPEG i base64. */
async function lesBilete(fil: File): Promise<Bilete> {
  const url = URL.createObjectURL(fil);
  const img = await new Promise<HTMLImageElement>((ok, feil) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = feil;
    i.src = url;
  });
  const skala = Math.min(1, 1568 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * skala);
  c.height = Math.round(img.height * skala);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', 0.85);
  return { media_type: 'image/jpeg', data: dataUrl.split(',')[1], url: dataUrl };
}

/** Enkel visning av svaret: avsnitt, punktlister og **feit** tekst. */
function Svartekst({ tekst }: { tekst: string }) {
  const feit = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((del, i) =>
    del.startsWith('**') && del.endsWith('**') ? <strong key={i}>{del.slice(2, -2)}</strong> : del);
  const blokker: ReactNode[] = [];
  let liste: string[] = [];
  const tomListe = () => {
    if (liste.length) blokker.push(<ul key={blokker.length} style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{liste.map((l, i) => <li key={i} style={{ margin: '2px 0' }}>{feit(l)}</li>)}</ul>);
    liste = [];
  };
  for (const linje of tekst.split('\n')) {
    const punkt = linje.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (punkt) { liste.push(punkt[1]); continue; }
    tomListe();
    const t = linje.replace(/^#+\s*/, '');
    if (t.trim()) blokker.push(<p key={blokker.length} style={{ margin: '0 0 8px', fontWeight: linje.startsWith('#') ? 800 : undefined }}>{feit(t)}</p>);
  }
  tomListe();
  return <>{blokker}</>;
}

export function Assistent() {
  const isMobile = useIsMobile();
  const [meldingar, setMeldingar] = useState<Melding[]>([]);
  const [tekst, setTekst] = useState('');
  const [vedlegg, setVedlegg] = useState<Bilete | null>(null);
  const [svarar, setSvarar] = useState(false);
  const filRef = useRef<HTMLInputElement>(null);
  const botnRef = useRef<HTMLDivElement>(null);

  useEffect(() => { botnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [meldingar]);

  const oppdaterSiste = (f: (m: Melding) => Melding) =>
    setMeldingar((prev) => [...prev.slice(0, -1), f(prev[prev.length - 1])]);

  const send = async (sporsmal?: string) => {
    const q = (sporsmal ?? tekst).trim();
    if ((!q && !vedlegg) || svarar) return;
    const ny: Melding = { rolle: 'user', tekst: q, bilete: vedlegg ?? undefined };
    const historikk = [...meldingar.filter((m) => !m.feil), ny];
    setMeldingar([...historikk, { rolle: 'assistant', tekst: '' }]);
    setTekst('');
    setVedlegg(null);
    setSvarar(true);

    try {
      const { data: okt } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${okt.session?.access_token ?? ''}`,
        },
        // Berre det siste biletet blir sendt; eldre bilete blir til ein merknad.
        body: JSON.stringify({
          meldingar: historikk.map((m, i) => ({
            rolle: m.rolle,
            tekst: m.bilete && i !== historikk.length - 1 ? `${m.tekst} [bilete sendt tidlegare]` : m.tekst,
            bilete: m.bilete && i === historikk.length - 1 ? { media_type: m.bilete.media_type, data: m.bilete.data } : undefined,
          })),
        }),
      });
      if (!res.ok || !res.body) {
        const feil = await res.json().catch(() => null);
        throw new Error(feil?.error || 'Fekk ikkje kontakt med assistenten.');
      }
      const lesar = res.body.getReader();
      const dek = new TextDecoder();
      let rest = '';
      for (;;) {
        const { done, value } = await lesar.read();
        if (done) break;
        rest += dek.decode(value, { stream: true });
        const linjer = rest.split('\n');
        rest = linjer.pop() ?? '';
        for (const l of linjer) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          if (ev.t === 'tekst') oppdaterSiste((m) => ({ ...m, tekst: m.tekst + ev.d }));
          else if (ev.t === 'sok') oppdaterSiste((m) => ({ ...m, sokte: true }));
          else if (ev.t === 'kjelder') oppdaterSiste((m) => ({ ...m, kjelder: ev.liste }));
          else if (ev.t === 'feil') oppdaterSiste((m) => ({ ...m, tekst: ev.melding, feil: true }));
        }
      }
    } catch (e) {
      oppdaterSiste((m) => ({ ...m, tekst: e instanceof Error ? e.message : 'Noko gjekk gale.', feil: true }));
    } finally {
      setSvarar(false);
    }
  };

  const veljBilete = async (fil: File | undefined) => {
    if (!fil) return;
    try { setVedlegg(await lesBilete(fil)); } catch { /* ugyldig bilete */ }
    if (filRef.current) filRef.current.value = '';
  };

  const tom = meldingar.length === 0;

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820, margin: '0 auto', minHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 90px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div className="sidetittel">Assistent</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Spør om varer, bruk og kundespørsmål – eller ta bilete av ei vare.</div>
        </div>
        {!tom && (
          <button onClick={() => setMeldingar([])} disabled={svarar} style={{ padding: '8px 13px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Ny samtale
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tom && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 18px 16px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--kort-label)', marginBottom: 10 }}>Prøv til dømes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DOME.map((d) => (
                <button key={d} onClick={() => send(d)} style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{d}</button>
              ))}
            </div>
          </div>
        )}

        {meldingar.map((m, i) => (
          m.rolle === 'user' ? (
            <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {m.bilete && <img src={m.bilete.url} alt="Vedlagt bilete" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 'var(--r)', border: '1px solid var(--border)' }} />}
              {m.tekst && <div style={{ background: 'var(--brand-strong)', color: 'var(--on-brand)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.tekst}</div>}
            </div>
          ) : (
            <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%', background: 'var(--surface)', border: `1px solid ${m.feil ? 'var(--danger-border)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '12px 15px', fontSize: 14, lineHeight: 1.5, color: m.feil ? 'var(--danger)' : 'var(--text)' }}>
              {m.sokte && !m.tekst && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Søkjer på mekk.no …</div>}
              {!m.sokte && !m.tekst && svarar && i === meldingar.length - 1 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Tenkjer …</div>}
              <Svartekst tekst={m.tekst} />
              {m.kjelder && m.kjelder.length > 0 && (
                <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-label)' }}>Kjelder</div>
                  {m.kjelder.map((k) => (
                    <a key={k.url} href={k.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {k.tittel} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        ))}
        <div ref={botnRef} />
      </div>

      {/* Skrivefeltet ligg nede, over botnmenyen på mobil */}
      <div style={{ position: 'sticky', bottom: isMobile ? 'calc(70px + env(safe-area-inset-bottom))' : 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 10, boxShadow: '0 8px 24px rgba(10, 35, 53, 0.10)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vedlegg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={vedlegg.url} alt="Bilete som blir sendt" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }} />
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1 }}>Biletet blir sendt med spørsmålet.</span>
            <button onClick={() => setVedlegg(null)} aria-label="Fjern bilete" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <input ref={filRef} type="file" accept="image/*" capture="environment" onChange={(e) => veljBilete(e.target.files?.[0])} style={{ display: 'none' }} />
          <button onClick={() => filRef.current?.click()} title="Ta eller vel bilete" aria-label="Ta eller vel bilete" style={{ width: 42, height: 42, flex: 'none', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--brand)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="kamera" size={20} />
          </button>
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Kva lurer du på?"
            rows={1}
            autoCapitalize="sentences"
            style={{ flex: 1, minHeight: 42, maxHeight: 140, resize: 'none', padding: '10px 12px', borderRadius: 'var(--r-input)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 15 }}
          />
          <button
            onClick={() => send()}
            disabled={svarar || (!tekst.trim() && !vedlegg)}
            style={{ height: 42, padding: '0 16px', flex: 'none', borderRadius: 'var(--r)', border: 'none', background: 'var(--cta)', color: 'var(--on-cta)', fontSize: 14, fontWeight: 900, cursor: 'pointer', opacity: svarar || (!tekst.trim() && !vedlegg) ? 0.5 : 1 }}
          >
            {svarar ? '…' : 'Spør'}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          Svara kan vere feil. Sjekk pris og lager i kassasystemet. Ikkje skriv inn namn eller telefonnummer til kundar.
        </div>
      </div>
    </div>
  );
}
