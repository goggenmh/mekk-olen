import { useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../../supabaseClient';
import { useIsMobile } from '../../lib/useIsMobile';
import { DEMO } from '../../lib/view';
import { Icon } from '../ui/Icon';

// Lenka til det eigne lager-systemet (skanning + registrering: mottak, ut til
// butikk, telling og vareimport). Denne sida er berre eit raskt oppslag.
const SKANN_URL = 'https://lagerkontroll-mekk-olen-prosjekt.vercel.app/';

interface Plass { plass: string; tal: number }
interface Treff { nr: string; namn: string; strekkode: string | null; eining: string | null; total: number; plassar: Plass[] }

export function Lager() {
  const isMobile = useIsMobile();
  const [q, setQ] = useState('');
  const [treff, setTreff] = useState<Treff[] | null>(null);
  const [lastar, setLastar] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const siste = useRef(0);

  // Søk med liten forseinking, så vi ikkje spør på kvar tast. All state-endring
  // skjer inne i tidsavbrotet (ikkje synkront i effekten).
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) return;
    let avbroten = false;
    const id = ++siste.current;
    const t = setTimeout(async () => {
      setLastar(true);
      try {
        const { data, error } = await supabase.rpc('lager_sok', { p_q: s });
        if (avbroten || id !== siste.current) return;
        if (error) throw error;
        setTreff((data ?? []) as Treff[]);
        setFeil(null);
      } catch {
        if (avbroten || id !== siste.current) return;
        setTreff([]);
        setFeil(DEMO ? 'Lageret er kopla til den ekte appen, ikkje demoen.' : 'Fekk ikkje kontakt med lageret. Prøv igjen.');
      } finally {
        if (!avbroten && id === siste.current) setLastar(false);
      }
    }, 280);
    return () => { avbroten = true; clearTimeout(t); };
  }, [q]);

  return (
    <div style={{ padding: isMobile ? 16 : 30, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="sidetittel">Lager</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Søk opp ei vare og sjå kor mange som er på lager og kvar.</div>
        </div>
        <a
          href={SKANN_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '9px 14px', background: 'var(--surface)', color: 'var(--brand)', border: '1px solid var(--brand)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Opne lager-skanning ↗
        </a>
      </div>

      <div style={{ position: 'relative', maxWidth: 520 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', display: 'flex' }}><Icon name="search" size={18} /></span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Søk på namn, varenr eller strekkode…"
          aria-label="Søk i lageret"
          style={{ width: '100%', padding: '11px 13px 11px 40px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text)' }}
        />
      </div>

      {q.trim().length < 2 ? (
        <Melding>Skriv minst to teikn for å søkje. Treng du å registrere varer eller skanne, bruk lager-skanninga.</Melding>
      ) : feil ? (
        <Melding>{feil}</Melding>
      ) : lastar && !treff ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Søkjer…</div>
      ) : treff && treff.length === 0 ? (
        <Melding>Ingen treff på «{q.trim()}».</Melding>
      ) : treff && treff.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, alignItems: 'start' }}>
          {treff.map((v) => (
            <div key={v.nr} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>{v.namn}</div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontFamily: "'Geist Mono Variable'", fontSize: 26, fontWeight: 700, lineHeight: 1, color: v.total > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{v.total}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-faint)' }}>på lager</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {v.nr}{v.eining ? ` · ${v.eining}` : ''}{v.strekkode ? ` · ${v.strekkode}` : ' · ingen strekkode'}
              </div>
              {v.plassar.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {v.plassar.map((p) => (
                    <span key={p.plass} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pill-teal-fg)', background: 'var(--pill-teal-bg)', borderRadius: 'var(--r)', padding: '3px 9px' }}>
                      {p.plass}: {p.tal}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Ikkje på nokon lagerplass no.</div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Melding({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', fontSize: 13.5, color: 'var(--text-muted)' }}>{children}</div>;
}
