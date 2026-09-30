import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { fmt } from '../../lib/dates';

interface ButikkStat {
  butikk: string;
  namn: string;
  tilsette: number;
  timar_veka: number;
  opne_oppgaver: number;
  aktive_bestillingar: number;
  vakter_i_dag: number;
}

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)' } as const;

export function KonsernOversikt() {
  const [rader, setRader] = useState<ButikkStat[] | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('konsern_oversikt').then(({ data, error }) => {
      if (error) { setFeil(error.message); setRader([]); return; }
      setRader((data as ButikkStat[]) || []);
    });
  }, []);

  const sum = (f: (b: ButikkStat) => number) => (rader || []).reduce((a, b) => a + f(b), 0);
  const kpi = [
    { lab: 'Butikkar', val: String((rader || []).length), farge: '#11788a' },
    { lab: 'Tilsette totalt', val: String(sum((b) => b.tilsette)), farge: '#2f9e6f' },
    { lab: 'Timar denne veka', val: `${fmt(sum((b) => Number(b.timar_veka)))} t`, farge: '#6a5acd' },
    { lab: 'Opne oppgåver', val: String(sum((b) => b.opne_oppgaver)), farge: '#c8811a' },
    { lab: 'Aktive bestillingar', val: String(sum((b) => b.aktive_bestillingar)), farge: '#c0392b' },
  ];

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>
      <div>
        <h1 style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 25, letterSpacing: '-0.3px' }}>Konsern-oversikt</h1>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Alle butikkane · timar for denne veka</div>
      </div>

      {rader === null ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lastar…</div>
      ) : feil ? (
        <div style={{ fontSize: 13, color: 'var(--danger)' }}>Kunne ikkje laste oversikta: {feil}</div>
      ) : rader.length === 0 ? (
        <div style={{ ...card, padding: '18px 20px', fontSize: 13, color: 'var(--text-muted)' }}>Ingen butikkar å vise.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
            {kpi.map((k) => (
              <div key={k.lab} style={{ ...card, padding: '17px 19px' }}>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Geist Mono'", color: k.farge, letterSpacing: '-0.5px' }}>{k.val}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>{k.lab}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--divider)', background: 'var(--surface-alt)' }}>
              <span>Butikk</span>
              <span style={{ textAlign: 'right' }}>Tilsette</span>
              <span style={{ textAlign: 'right' }}>Timar/veka</span>
              <span style={{ textAlign: 'right' }}>Vakter i dag</span>
              <span style={{ textAlign: 'right' }}>Opne oppg.</span>
              <span style={{ textAlign: 'right' }}>Bestillingar</span>
            </div>
            {rader.map((b) => (
              <div key={b.butikk} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{b.namn}</span>
                <span style={{ fontFamily: "'Geist Mono'", fontSize: 13.5, textAlign: 'right' }}>{b.tilsette}</span>
                <span style={{ fontFamily: "'Geist Mono'", fontSize: 13.5, textAlign: 'right' }}>{fmt(Number(b.timar_veka))} t</span>
                <span style={{ fontFamily: "'Geist Mono'", fontSize: 13.5, textAlign: 'right' }}>{b.vakter_i_dag}</span>
                <span style={{ fontFamily: "'Geist Mono'", fontSize: 13.5, textAlign: 'right', color: b.opne_oppgaver > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{b.opne_oppgaver}</span>
                <span style={{ fontFamily: "'Geist Mono'", fontSize: 13.5, textAlign: 'right', color: b.aktive_bestillingar > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{b.aktive_bestillingar}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
