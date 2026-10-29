import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { supabase } from '../../supabaseClient';
import { kr, tilIso, feilTekst, type PrisSvar } from '../../lib/utleige';
import { addDays, today, UKE_KORT, weekdayIdx, parseDate, MND } from '../../lib/dates';
import { DEMO } from '../../lib/view';

// Offentleg kundeside (/utleige): ingen innlogging. Snakkar berre med dei
// offentlege funksjonane i databasen (utleige_katalog, utleige_ledigheit,
// utleige_sjekk, utleige_send_forespurnad) – aldri med tabellane direkte.

interface KatalogProdukt {
  id: string; butikk_id: string; butikk: string; namn: string; beskriving: string; kategori: string; bilete_url: string | null;
  dogn_pris: number; halvdag_pris: number | null; helg_pris: number | null; gebyr: number; depositum: number;
  tilbehor: string[]; einingar: number; vilkar: string; hente_tid: string; retur_tid: string; maks_dagar: number;
}
interface Dag { dato: string; ledige: number; totalt: number }
interface Kvittering { nummer: number; start: string; slutt: string; total: number; depositum: number }

const kort: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-card)' };
const label: CSSProperties = { fontSize: 11.5, fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--kort-label)', marginBottom: 6, display: 'block' };
const felt: CSSProperties = { width: '100%', padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 15 };
const cta: CSSProperties = { padding: '12px 18px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 900, cursor: 'pointer' };
const knappAlt: CSSProperties = { padding: '12px 14px', background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' };

interface KorgKvittering { gruppe: string; varer: { nummer: number; produkt: string; total: number; depositum: number }[]; sum: number }

function Bilete({ url, namn, hogd }: { url: string | null; namn: string; hogd: number }) {
  return url ? (
    <img src={url} alt={namn} style={{ width: '100%', height: hogd, objectFit: 'contain', background: '#ffffff', display: 'block' }} />
  ) : (
    <div style={{ height: hogd, background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontWeight: 900, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Bilete kjem</div>
  );
}

export function UtleigeSide({ naviger }: { naviger?: (sti: string) => void } = {}) {
  const [produkt, setProdukt] = useState<KatalogProdukt[] | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [valt, setValt] = useState<KatalogProdukt | null>(null);
  // Ledige einingar i dag per produkt, til «X ledige»-merket på korta.
  const [ledig, setLedig] = useState<Record<string, { ledige: number; totalt: number }>>({});
  // Handlekorg: fleire varer i éi bestilling.
  const [korg, setKorg] = useState<KatalogProdukt[]>([]);
  const [visKorg, setVisKorg] = useState(false);
  const iKorg = (id: string) => korg.some((x) => x.id === id);
  const leggIKorg = (p: KatalogProdukt) => setKorg((k) => (k.some((x) => x.id === p.id) ? k : [...k, p]));
  const fjernFraKorg = (id: string) => setKorg((k) => k.filter((x) => x.id !== id));

  useEffect(() => {
    supabase.rpc('utleige_katalog').then(({ data, error }) => {
      if (error) setFeil(feilTekst(error));
      else setProdukt((data || []) as KatalogProdukt[]);
    });
  }, []);

  useEffect(() => {
    if (!produkt || produkt.length === 0) return;
    const t = today();
    let avbroten = false;
    Promise.all(produkt.map(async (p) => {
      try {
        const { data } = await supabase.rpc('utleige_ledigheit', { p_produkt: p.id, p_fra: t, p_dagar: 1 });
        return { id: p.id, rad: (data as { ledige: number; totalt: number }[] | null)?.[0] };
      } catch {
        return { id: p.id, rad: undefined as { ledige: number; totalt: number } | undefined };
      }
    })).then((res) => {
      if (avbroten) return;
      const m: Record<string, { ledige: number; totalt: number }> = {};
      for (const r of res) if (r.rad) m[r.id] = { ledige: r.rad.ledige, totalt: r.rad.totalt };
      setLedig(m);
    });
    return () => { avbroten = true; };
  }, [produkt]);

  const butikk = produkt?.[0]?.butikk ?? 'MEKK';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ background: 'var(--mekk-navy)', color: '#ffffff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/mekk-logo.png" alt="MEKK" style={{ width: 38, height: 38 }} />
          <div style={{ lineHeight: 1.1, flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>{butikk}</div>
            <div style={{ fontSize: 12.5, color: '#b9cbd8', fontWeight: 700 }}>Utleige av verktøy og maskiner <span style={{ color: 'var(--mekk-teal)' }}>‹</span></div>
          </div>
          {naviger && <button onClick={() => naviger('/utleige/mi-side')} style={{ background: 'none', border: '1px solid #ffffff55', color: '#fff', borderRadius: 'var(--r)', padding: '7px 12px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Mi side ›</button>}
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '22px 16px 60px' }}>
        {feil && <Melding tone="feil">{feil}</Melding>}
        {!produkt && !feil && <div style={{ color: 'var(--text-muted)' }}>Lastar utstyr …</div>}
        {produkt && produkt.length === 0 && <Melding>Utleige er ikkje opna enno. Ta kontakt med butikken.</Melding>}

        {valt ? (
          <Produktside p={valt} onTilbake={() => setValt(null)} />
        ) : visKorg ? (
          <Handlekorg korg={korg} onFjern={fjernFraKorg} onTilbake={() => setVisKorg(false)} onFerdig={() => { setKorg([]); setVisKorg(false); }} />
        ) : produkt && produkt.length > 0 && (
          <>
            <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 6px' }}>Lei utstyret du treng</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 20px', fontSize: 15 }}>Vel utstyr, sjekk ledige datoar og send ein førespurnad. Vi stadfestar så snart vi kan – du betaler når du hentar.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {produkt.map((p) => (
                <div key={p.id} style={{ ...kort, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative' }}>
                    <Bilete url={p.bilete_url} namn={p.namn} hogd={180} />
                    <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--mekk-lime)', color: 'var(--mekk-ink)', padding: '6px 10px', fontWeight: 900, fontStyle: 'italic', fontSize: 15, transform: 'rotate(-3deg)' }}>
                      {kr(p.dogn_pris)}<span style={{ fontSize: 11 }}> / døgn</span>
                    </span>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>{p.namn}</div>
                    {ledig[p.id] && ledig[p.id].totalt > 0 && (
                      <span style={{ alignSelf: 'flex-start', fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                        color: ledig[p.id].ledige > 0 ? 'var(--pill-gronn-fg)' : 'var(--pill-gra-fg)',
                        background: ledig[p.id].ledige > 0 ? 'var(--pill-gronn-bg)' : 'var(--pill-gra-bg)' }}>
                        {ledig[p.id].ledige > 0 ? `${ledig[p.id].ledige} ledige no` : 'Fullt utleigd no'}
                      </span>
                    )}
                    {p.beskriving && <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.beskriving}</div>}
                    {p.helg_pris != null && <div style={{ fontSize: 13, fontWeight: 700 }}>Helg (fre–mån): {kr(p.helg_pris)}</div>}
                    {p.tilbehor.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {p.tilbehor.slice(0, 4).map((t) => <span key={t} style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 8px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 999 }}>{t}</span>)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      <button onClick={() => { setValt(p); window.scrollTo(0, 0); }} style={{ ...cta, flex: 1 }}>Sjå ledigheit ‹</button>
                      <button onClick={() => leggIKorg(p)} disabled={iKorg(p.id)} style={{ ...knappAlt, flex: 'none', opacity: iKorg(p.id) ? 0.6 : 1 }}>{iKorg(p.id) ? 'I korg ✓' : '+ Korg'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {korg.length > 0 && (
              <div style={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'center', marginTop: 18, zIndex: 5 }}>
                <button onClick={() => { setVisKorg(true); window.scrollTo(0, 0); }} style={{ ...cta, boxShadow: '0 6px 20px rgba(10,35,53,0.25)' }}>Sjå handlekorg ({korg.length}) ›</button>
              </div>
            )}
          </>
        )}
      </main>
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>© {new Date().getFullYear()} {butikk}</span>
          {!DEMO && <a href="/intern" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Tilsett – logg inn ›</a>}
        </div>
      </footer>
    </div>
  );
}

function Melding({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'feil' | 'ok' }) {
  const s = tone === 'feil' ? { fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' } : tone === 'ok' ? { fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)' } : { fg: 'var(--text-secondary)', bg: 'var(--surface-alt)' };
  return <div style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: s.bg, color: s.fg, fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{children}</div>;
}

function Produktside({ p, onTilbake }: { p: KatalogProdukt; onTilbake: () => void }) {
  const t = today();
  const [dagar, setDagar] = useState<Dag[]>([]);
  const [fraDato, setFraDato] = useState(addDays(t, 1));
  const [fraTid, setFraTid] = useState(p.hente_tid);
  const [tilDato, setTilDato] = useState(addDays(t, 2));
  const [tilTid, setTilTid] = useState(p.retur_tid);
  // true = neste trykk i kalenderen set returdato (elles hentedato/ny periode).
  const [veljarSlutt, setVeljarSlutt] = useState(false);
  const [svar, setSvar] = useState<{ nokkel: string; pris?: PrisSvar; feil?: string } | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [namn, setNamn] = useState('');
  const [telefon, setTelefon] = useState('');
  const [epost, setEpost] = useState('');
  const [melding, setMelding] = useState('');
  const [vilkar, setVilkar] = useState(false);
  const [visVilkar, setVisVilkar] = useState(false);
  const [sender, setSender] = useState(false);
  const [kvittering, setKvittering] = useState<Kvittering | null>(null);

  useEffect(() => {
    supabase.rpc('utleige_ledigheit', { p_produkt: p.id, p_fra: t, p_dagar: 42 })
      .then(({ data }) => setDagar(((data || []) as Dag[])));
  }, [p.id, t]);

  const start = useMemo(() => (fraDato ? tilIso(fraDato, fraTid) : ''), [fraDato, fraTid]);
  const slutt = useMemo(() => (tilDato ? tilIso(tilDato, tilTid) : ''), [tilDato, tilTid]);

  // Sjekk ledigheit og pris kvar gong perioden endrar seg. Svaret høyrer
  // til perioden det vart spurt om, så gamle svar blir aldri viste.
  const gyldigPeriode = !!start && !!slutt && new Date(slutt) > new Date(start);
  const nokkel = `${start}|${slutt}`;
  useEffect(() => {
    if (!gyldigPeriode) return;
    let avbroten = false;
    supabase.rpc('utleige_sjekk', { p_produkt: p.id, p_start: start, p_slutt: slutt }).then(({ data, error }) => {
      if (avbroten) return;
      setSvar(error ? { nokkel, feil: feilTekst(error) } : { nokkel, pris: data as PrisSvar });
    });
    return () => { avbroten = true; };
  }, [p.id, start, slutt, gyldigPeriode, nokkel]);
  const gjeldande = svar?.nokkel === nokkel ? svar : null;
  const pris = gjeldande?.pris ?? null;
  const sjekkar = gyldigPeriode && !gjeldande;
  const periodeFeil = start && slutt && !gyldigPeriode ? 'Retur må vere etter henting.' : gjeldande?.feil ?? null;

  const ledig = !!pris && (pris.ledige ?? 0) > 0;
  const kanSende = ledig && namn.trim().length >= 2 && telefon.replace(/\D/g, '').length >= 8 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(epost.trim()) && vilkar && !sender;

  const send = async () => {
    if (!kanSende) return;
    setSender(true); setFeil(null);
    const { data, error } = await supabase.rpc('utleige_send_forespurnad', {
      p_produkt: p.id, p_start: start, p_slutt: slutt, p_namn: namn, p_telefon: telefon, p_epost: epost, p_melding: melding, p_vilkar: vilkar,
    });
    setSender(false);
    if (error) { setFeil(feilTekst(error)); return; }
    setKvittering(data as Kvittering);
    window.scrollTo(0, 0);
  };

  // Periodeveljar: første trykk vel henting (og nullstiller retur), andre vel
  // retur. Trykkjer du før hentedagen, startar du på nytt frå den dagen.
  const velgDag = (dato: string) => {
    if (!veljarSlutt) { setFraDato(dato); setTilDato(''); setVeljarSlutt(true); }
    else if (dato > fraDato) { setTilDato(dato); setVeljarSlutt(false); }
    else { setFraDato(dato); setTilDato(''); }
  };
  const datoTekst = (dato: string) => {
    if (!dato) return '';
    const d = parseDate(dato);
    return `${['søn', 'mån', 'tys', 'ons', 'tor', 'fre', 'lau'][d.getDay()]} ${d.getDate()}. ${MND[d.getMonth()]}`;
  };

  if (kvittering) {
    return (
      <div style={{ ...kort, maxWidth: 560, margin: '0 auto', padding: '28px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mekk-lime)', color: 'var(--mekk-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900 }}>✓</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Førespurnaden er motteken</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Referanse <strong style={{ color: 'var(--text)' }}>U-{kvittering.nummer}</strong>. Vi stadfestar så snart vi har sett på han. Du betaler når du hentar.
        </p>
        <div style={{ width: '100%', textAlign: 'left', background: 'var(--surface-alt)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 14, lineHeight: 1.7 }}>
          <div><strong>{p.namn}</strong></div>
          <div>Henting: {new Date(kvittering.start).toLocaleString('nb-NO', { dateStyle: 'full', timeStyle: 'short' })}</div>
          <div>Retur: {new Date(kvittering.slutt).toLocaleString('nb-NO', { dateStyle: 'full', timeStyle: 'short' })}</div>
          <div>Leigepris: <strong>{kr(kvittering.total)}</strong> · Depositum: {kr(kvittering.depositum)}</div>
        </div>
        <button onClick={onTilbake} style={{ ...cta, background: 'var(--mekk-navy)', color: '#ffffff' }}>Tilbake til utstyret</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onTilbake} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--text)', padding: 0 }}>
        <span style={{ color: 'var(--mekk-teal-700)', fontWeight: 900 }}>‹</span> Alt utstyr
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ ...kort, overflow: 'hidden' }}>
          <Bilete url={p.bilete_url} namn={p.namn} hogd={280} />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.01em' }}>{p.namn}</h1>
            {p.beskriving && <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{p.beskriving}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', fontSize: 14 }}>
              <span>Per døgn</span><strong>{kr(p.dogn_pris)}</strong>
              {p.halvdag_pris != null && <><span>Halv dag (opptil 4 t)</span><strong>{kr(p.halvdag_pris)}</strong></>}
              {p.helg_pris != null && <><span>Helg (fre–mån)</span><strong>{kr(p.helg_pris)}</strong></>}
              {p.gebyr > 0 && <><span>Klargjeringsgebyr</span><strong>{kr(p.gebyr)}</strong></>}
              {p.depositum > 0 && <><span>Depositum (får du att)</span><strong>{kr(p.depositum)}</strong></>}
            </div>
            {p.tilbehor.length > 0 && (
              <div>
                <span style={label}>Tilbehøyr som følgjer med</span>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>{p.tilbehor.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...kort, padding: 18 }}>
            <span style={label}>Vel leigeperiode</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: veljarSlutt ? 'var(--brand-strong)' : 'var(--text-secondary)', margin: '2px 0 10px' }}>
              {veljarSlutt ? 'Trykk på returdagen' : fraDato && tilDato ? `Valt: ${datoTekst(fraDato)} – ${datoTekst(tilDato)}` : 'Trykk på hentedagen'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {UKE_KORT.map((u) => (
                <div key={u} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-muted)', paddingBottom: 2 }}>{u}</div>
              ))}
              {/* Tomme celler så første dag hamnar under rett vekedag. */}
              {dagar.length > 0 && Array.from({ length: weekdayIdx(dagar[0].dato) }).map((_, i) => <div key={`pad-${i}`} aria-hidden />)}
              {dagar.map((d) => {
                const fritt = d.totalt > 0 && d.ledige > 0;
                const delvis = fritt && d.ledige < d.totalt;
                const erStart = d.dato === fraDato;
                const erSlutt = d.dato === tilDato;
                const iMellom = !!tilDato && d.dato > fraDato && d.dato < tilDato;
                const endepunkt = erStart || erSlutt;
                return (
                  <button
                    key={d.dato}
                    onClick={() => velgDag(d.dato)}
                    disabled={!fritt}
                    aria-pressed={endepunkt}
                    title={fritt ? `${d.ledige} av ${d.totalt} ledig` : d.totalt === 0 ? 'Ikkje ledig' : 'Fullbooka'}
                    style={{
                      position: 'relative', padding: '9px 0', borderRadius: 'var(--r-sm)', cursor: fritt ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)',
                      border: endepunkt ? '2px solid var(--mekk-navy)' : iMellom ? '1px solid var(--mekk-navy)' : '1px solid var(--border)',
                      background: endepunkt ? 'var(--mekk-navy)' : iMellom ? 'var(--brand-soft)' : fritt ? 'var(--pill-gronn-bg)' : 'var(--surface-alt)',
                      color: endepunkt ? '#ffffff' : iMellom ? 'var(--brand-strong)' : fritt ? 'var(--pill-gronn-fg)' : 'var(--text-faint)',
                      fontWeight: endepunkt ? 900 : 800,
                      textDecoration: fritt ? 'none' : 'line-through',
                    }}
                  >
                    <div style={{ fontSize: 14 }}>{parseDate(d.dato).getDate()}</div>
                    {delvis && !endepunkt && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 9, fontWeight: 900, color: 'var(--pill-amber-fg)' }}>{d.ledige}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Grøn = ledig · talet = kor mange att når delvis utleigd.</div>
          </div>

          <div style={{ ...kort, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px 12px', alignItems: 'end' }}>
              <div>
                <span style={label}>Henting</span>
                <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'capitalize' }}>{fraDato ? datoTekst(fraDato) : '–'}</div>
              </div>
              <label style={{ width: 108 }}><span style={label}>Kl.</span><input type="time" value={fraTid} onChange={(e) => setFraTid(e.target.value)} style={felt} /></label>
              <div>
                <span style={label}>Retur</span>
                <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'capitalize', color: tilDato ? 'var(--text)' : 'var(--text-muted)' }}>{tilDato ? datoTekst(tilDato) : 'Vel i kalenderen'}</div>
              </div>
              <label style={{ width: 108 }}><span style={label}>Kl.</span><input type="time" value={tilTid} onChange={(e) => setTilTid(e.target.value)} style={felt} /></label>
            </div>

            {sjekkar && <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Sjekkar ledigheit …</div>}
            {pris && (ledig ? (
              <div style={{ background: 'var(--surface-alt)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 14 }}>
                <div style={{ color: 'var(--pill-gronn-fg)', fontWeight: 800, marginBottom: 6 }}>Ledig i perioden</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px' }}>
                  <span>{pris.modell === 'halvdag' ? 'Halv dag' : pris.modell === 'helg' ? 'Helgepris' : `${pris.dagar} ${pris.dagar === 1 ? 'døgn' : 'døgn'}`}</span><span>{kr(pris.leige)}</span>
                  {pris.gebyr > 0 && <><span>Klargjeringsgebyr</span><span>{kr(pris.gebyr)}</span></>}
                  <strong style={{ borderTop: '1px solid var(--border)', paddingTop: 4 }}>Å betale ved henting</strong>
                  <strong style={{ borderTop: '1px solid var(--border)', paddingTop: 4 }}>{kr(pris.total)}</strong>
                  {pris.depositum > 0 && <><span style={{ color: 'var(--text-muted)' }}>Depositum (får du att)</span><span style={{ color: 'var(--text-muted)' }}>{kr(pris.depositum)}</span></>}
                </div>
              </div>
            ) : <Melding tone="feil">Ikkje ledig i denne perioden. Prøv andre datoar.</Melding>)}
            {periodeFeil && <Melding tone="feil">{periodeFeil}</Melding>}
          </div>

          {ledig && (
            <div style={{ ...kort, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label><span style={label}>Namn</span><input value={namn} onChange={(e) => setNamn(e.target.value)} autoComplete="name" style={felt} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <label><span style={label}>Telefon</span><input type="tel" inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} autoComplete="tel" style={felt} /></label>
                <label><span style={label}>E-post</span><input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} autoComplete="email" style={felt} /></label>
              </div>
              <label><span style={label}>Melding (valfritt)</span><textarea value={melding} onChange={(e) => setMelding(e.target.value)} rows={2} style={{ ...felt, resize: 'vertical' }} /></label>
              <div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={vilkar} onChange={(e) => setVilkar(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, flex: 'none' }} />
                  <span>Eg har lese og godtek <button type="button" onClick={() => setVisVilkar((v) => !v)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}>leigevilkåra</button>.</span>
                </label>
                {visVilkar && (
                  <div style={{ marginTop: 8, maxHeight: 220, overflowY: 'auto', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {p.vilkar || 'Utstyret skal leverast tilbake reint og i same stand, med alt tilbehøyr. Leigetakar er ansvarleg for skade og tap i leigeperioden. Depositum blir betalt tilbake når utstyret er kontrollert. Forseinka retur blir fakturert per påbyrja døgn.'}
                  </div>
                )}
              </div>
              {feil && <Melding tone="feil">{feil}</Melding>}
              <button onClick={send} disabled={!kanSende} style={{ ...cta, opacity: kanSende ? 1 : 0.5, cursor: kanSende ? 'pointer' : 'not-allowed' }}>
                {sender ? 'Sender …' : 'Send førespurnad ‹'}
              </button>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ingen betaling no. Vi stadfestar førespurnaden, og du betaler ved henting.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Handlekorg: fleire varer i éi bestilling, same leigeperiode for alle.
function Handlekorg({ korg, onFjern, onTilbake, onFerdig }: {
  korg: KatalogProdukt[]; onFjern: (id: string) => void; onTilbake: () => void; onFerdig: () => void;
}) {
  const i0 = korg[0];
  const [fraDato, setFraDato] = useState(addDays(today(), 1));
  const [fraTid, setFraTid] = useState(i0?.hente_tid || '09:00');
  const [tilDato, setTilDato] = useState(addDays(today(), 2));
  const [tilTid, setTilTid] = useState(i0?.retur_tid || '12:00');
  const [namn, setNamn] = useState('');
  const [telefon, setTelefon] = useState('');
  const [epost, setEpost] = useState('');
  const [melding, setMelding] = useState('');
  const [vilkar, setVilkar] = useState(false);
  const [visVilkar, setVisVilkar] = useState(false);
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [kvittering, setKvittering] = useState<KorgKvittering | null>(null);
  const [sjekk, setSjekk] = useState<{ nokkel: string; map: Record<string, PrisSvar | null> } | null>(null);

  const start = fraDato ? tilIso(fraDato, fraTid) : '';
  const slutt = tilDato ? tilIso(tilDato, tilTid) : '';
  const gyldig = !!start && !!slutt && new Date(slutt) > new Date(start);
  const nokkel = `${start}|${slutt}|${korg.map((x) => x.id).join(',')}`;

  useEffect(() => {
    if (!gyldig || korg.length === 0) return;
    let avbroten = false;
    Promise.all(korg.map(async (p) => {
      try { const { data } = await supabase.rpc('utleige_sjekk', { p_produkt: p.id, p_start: start, p_slutt: slutt }); return { id: p.id, pris: data as PrisSvar | null }; }
      catch { return { id: p.id, pris: null as PrisSvar | null }; }
    })).then((res) => {
      if (avbroten) return;
      const m: Record<string, PrisSvar | null> = {};
      for (const r of res) m[r.id] = r.pris;
      setSjekk({ nokkel, map: m });
    });
    return () => { avbroten = true; };
  }, [nokkel, gyldig, korg, start, slutt]);

  const gjeldande = sjekk?.nokkel === nokkel ? sjekk.map : null;
  const erLedig = (id: string) => (gjeldande?.[id]?.ledige ?? 0) > 0;
  const alleLedige = !!gjeldande && korg.length > 0 && korg.every((p) => erLedig(p.id));
  const sum = gjeldande ? korg.reduce((n, p) => n + (erLedig(p.id) ? (gjeldande[p.id]?.total ?? 0) : 0), 0) : 0;
  const depositum = gjeldande ? korg.reduce((n, p) => n + (erLedig(p.id) ? (gjeldande[p.id]?.depositum ?? 0) : 0), 0) : 0;
  const kanSende = gyldig && alleLedige && namn.trim().length >= 2 && telefon.replace(/\D/g, '').length >= 8 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(epost.trim()) && vilkar && !sender;

  const send = async () => {
    if (!kanSende) return;
    setSender(true); setFeil(null);
    const { data, error } = await supabase.rpc('utleige_send_korg', {
      p_produkt: korg.map((x) => x.id), p_start: start, p_slutt: slutt, p_namn: namn, p_telefon: telefon, p_epost: epost, p_melding: melding, p_vilkar: vilkar,
    });
    setSender(false);
    if (error) { setFeil(feilTekst(error)); return; }
    setKvittering(data as KorgKvittering);
    window.scrollTo(0, 0);
  };

  if (kvittering) {
    return (
      <div style={{ ...kort, maxWidth: 560, margin: '0 auto', padding: '28px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mekk-lime)', color: 'var(--mekk-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900 }}>✓</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Førespurnaden er motteken</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Vi stadfestar så snart vi har sett på han. Du betaler når du hentar.</p>
        <div style={{ width: '100%', textAlign: 'left', background: 'var(--surface-alt)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 14, lineHeight: 1.8 }}>
          {kvittering.varer.map((v) => <div key={v.nummer}><strong>U-{v.nummer}</strong> · {v.produkt} · {kr(v.total)}</div>)}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>Sum: <strong>{kr(kvittering.sum)}</strong></div>
        </div>
        <button onClick={onFerdig} style={{ ...cta, background: 'var(--mekk-navy)', color: '#ffffff' }}>Til utstyret</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680, margin: '0 auto', width: '100%' }}>
      <button onClick={onTilbake} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--text)', padding: 0 }}>
        <span style={{ color: 'var(--mekk-teal-700)', fontWeight: 900 }}>‹</span> Tilbake til utstyret
      </button>
      <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Handlekorg</h1>

      {korg.length === 0 ? (
        <Melding>Korga er tom. Legg til utstyr frå lista.</Melding>
      ) : (
        <>
          <div style={{ ...kort, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={label}>Leigeperiode (gjeld alle varene)</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px 12px', alignItems: 'end' }}>
              <label><span style={label}>Henting</span><input type="date" value={fraDato} min={today()} onChange={(e) => setFraDato(e.target.value)} style={felt} /></label>
              <label style={{ width: 108 }}><span style={label}>Kl.</span><input type="time" value={fraTid} onChange={(e) => setFraTid(e.target.value)} style={felt} /></label>
              <label><span style={label}>Retur</span><input type="date" value={tilDato} min={fraDato || today()} onChange={(e) => setTilDato(e.target.value)} style={felt} /></label>
              <label style={{ width: 108 }}><span style={label}>Kl.</span><input type="time" value={tilTid} onChange={(e) => setTilTid(e.target.value)} style={felt} /></label>
            </div>
            {start && slutt && !gyldig && <Melding tone="feil">Retur må vere etter henting.</Melding>}
          </div>

          <div style={{ ...kort, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {korg.map((p) => {
              const s = gjeldande?.[p.id] ?? null;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 54, height: 54, flex: 'none', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)' }}><Bilete url={p.bilete_url} namn={p.namn} hogd={54} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{p.namn}</div>
                    {!gyldig ? <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Vel periode for å sjå pris</div>
                      : !s ? <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sjekkar …</div>
                      : erLedig(p.id) ? <div style={{ fontSize: 13, fontWeight: 700 }}>{kr(s.total)}{s.depositum > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> · depositum {kr(s.depositum)}</span>}</div>
                      : <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--danger)' }}>Ikkje ledig i perioden</div>}
                  </div>
                  <button onClick={() => onFjern(p.id)} title="Fjern" style={{ flex: 'none', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 10px', fontSize: 13, fontWeight: 800 }}>Fjern</button>
                </div>
              );
            })}
            {gyldig && alleLedige && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, fontSize: 14 }}>
                <strong>Sum å betale ved henting</strong><strong>{kr(sum)}</strong>
                {depositum > 0 && <><span style={{ color: 'var(--text-muted)' }}>Depositum (får du att)</span><span style={{ color: 'var(--text-muted)' }}>{kr(depositum)}</span></>}
              </div>
            )}
            {gyldig && gjeldande && !alleLedige && <Melding tone="feil">Éi eller fleire varer er ikkje ledige i perioden. Fjern dei eller vel andre datoar.</Melding>}
          </div>

          <div style={{ ...kort, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label><span style={label}>Namn</span><input value={namn} onChange={(e) => setNamn(e.target.value)} autoComplete="name" style={felt} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <label><span style={label}>Telefon</span><input type="tel" inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} autoComplete="tel" style={felt} /></label>
              <label><span style={label}>E-post</span><input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} autoComplete="email" style={felt} /></label>
            </div>
            <label><span style={label}>Melding (valfritt)</span><textarea value={melding} onChange={(e) => setMelding(e.target.value)} rows={2} style={{ ...felt, resize: 'vertical' }} /></label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={vilkar} onChange={(e) => setVilkar(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, flex: 'none' }} />
              <span>Eg har lese og godtek <button type="button" onClick={() => setVisVilkar((v) => !v)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}>leigevilkåra</button>.</span>
            </label>
            {visVilkar && <div style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{i0?.vilkar || 'Utstyret skal leverast tilbake reint og i same stand, med alt tilbehøyr. Leigetakar er ansvarleg for skade og tap i leigeperioden.'}</div>}
            {feil && <Melding tone="feil">{feil}</Melding>}
            <button onClick={send} disabled={!kanSende} style={{ ...cta, opacity: kanSende ? 1 : 0.5, cursor: kanSende ? 'pointer' : 'not-allowed' }}>{sender ? 'Sender …' : `Send førespurnad (${korg.length} varer) ‹`}</button>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ingen betaling no. Vi stadfestar førespurnaden, og du betaler ved henting.</div>
          </div>
        </>
      )}
    </div>
  );
}
