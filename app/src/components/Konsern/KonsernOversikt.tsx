import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { fmt, fullDatoTekst, today } from '../../lib/dates';
import { NyButikkModal } from './NyButikkModal';
import { NyKonsernAdminModal } from './NyKonsernAdminModal';

interface ButikkStat {
  butikk: string;
  namn: string;
  farge: string;
  tilsette: number;
  timar_veka: number;
  til_godkjenning: number;
  opne_oppgaver: number;
  aktive_bestillingar: number;
  vakter_i_dag: number;
}

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)' } as const;
const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 } as const;

function Metric({ lab, val, sterk }: { lab: string; val: string; sterk?: boolean }) {
  return (
    <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 11, padding: '9px 11px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Geist Mono'", letterSpacing: '-0.4px', color: sterk ? 'var(--accent)' : 'var(--text)' }}>{val}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>{lab}</div>
    </div>
  );
}

export function KonsernOversikt() {
  const { user } = useAuth();
  const [rader, setRader] = useState<ButikkStat[] | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [nyOpen, setNyOpen] = useState(false);
  const [nyAdminOpen, setNyAdminOpen] = useState(false);
  const time = new Date().getHours();
  const helsing = time < 10 ? 'God morgon' : time < 18 ? 'God dag' : 'God kveld';
  const fornamn = (user?.navn || '').split(' ')[0];

  const lastInn = () => {
    supabase.rpc('konsern_oversikt').then(({ data, error }) => {
      if (error) { setFeil(error.message); setRader([]); return; }
      setRader((data as ButikkStat[]) || []);
    });
  };
  useEffect(() => { lastInn(); }, []);

  const sum = (f: (b: ButikkStat) => number) => (rader || []).reduce((a, b) => a + f(b), 0);
  const totalGodkjenning = sum((b) => b.til_godkjenning);
  const kpi = [
    { lab: 'Butikkar', val: String((rader || []).length), farge: '#11788a' },
    { lab: 'Tilsette', val: String(sum((b) => b.tilsette)), farge: '#2f9e6f' },
    { lab: 'Timar denne veka', val: `${fmt(sum((b) => Number(b.timar_veka)))} t`, farge: '#6a5acd' },
    { lab: 'Til godkjenning', val: String(totalGodkjenning), farge: '#c8811a' },
    { lab: 'Opne oppgåver', val: String(sum((b) => b.opne_oppgaver)), farge: '#c0392b' },
    { lab: 'Aktive bestillingar', val: String(sum((b) => b.aktive_bestillingar)), farge: '#0c5a69' },
  ];
  const maxTimar = Math.max(1, ...(rader || []).map((b) => Number(b.timar_veka)));

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 30, letterSpacing: '-0.6px' }}>
            {helsing}, <span style={{ background: 'linear-gradient(120deg, var(--brand), var(--brand-strong))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fornamn}</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>Konsern-oversikt · alle butikkane · {fullDatoTekst(today())}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setNyAdminOpen(true)} style={{ padding: '10px 15px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Ny konsern-admin</button>
          <button onClick={() => setNyOpen(true)} style={{ padding: '10px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>+ Ny butikk</button>
        </div>
      </div>

      {rader === null ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lastar…</div>
      ) : feil ? (
        <div style={{ fontSize: 13, color: 'var(--danger)' }}>Kunne ikkje laste oversikta: {feil}</div>
      ) : rader.length === 0 ? (
        <div style={{ ...card, padding: '18px 20px', fontSize: 13, color: 'var(--text-muted)' }}>Ingen butikkar å vise enno. Trykk «+ Ny butikk» for å komme i gang.</div>
      ) : (
        <>
          {/* KPI-stripe */}
          <div style={{ ...card, padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            {kpi.map((k, i) => (
              <div key={k.lab} style={{ padding: '15px 18px', borderLeft: i === 0 ? 'none' : '1px solid var(--divider)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Geist Mono'", color: k.farge, letterSpacing: '-0.5px' }}>{k.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{k.lab}</div>
              </div>
            ))}
          </div>

          {/* Timar per butikk */}
          <div style={card}>
            <div style={{ padding: '16px 18px 4px' }}><div style={labelStyle}>Timar denne veka · per butikk</div></div>
            <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rader.map((b) => (
                <div key={b.butikk} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 130, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.namn}</span>
                  <div style={{ flex: 1, height: 12, borderRadius: 7, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(3, (Number(b.timar_veka) / maxTimar) * 100)}%`, background: b.farge, borderRadius: 7 }} />
                  </div>
                  <span style={{ width: 58, textAlign: 'right', fontFamily: "'Geist Mono'", fontSize: 13, fontWeight: 700 }}>{fmt(Number(b.timar_veka))} t</span>
                </div>
              ))}
            </div>
          </div>

          {/* Butikk-kort */}
          <div style={labelStyle}>Butikkane</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {rader.map((b) => (
              <div key={b.butikk} style={{ ...card, borderLeft: `4px solid ${b.farge}`, padding: '16px 17px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: `${b.farge}22`, color: b.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flex: 'none' }}>
                    {b.namn.replace(/^MEKK\s*/i, '').charAt(0).toUpperCase() || 'M'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.namn}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.tilsette} tilsette · {b.vakter_i_dag} på vakt i dag</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Metric lab="Timar denne veka" val={`${fmt(Number(b.timar_veka))} t`} />
                  <Metric lab="Til godkjenning" val={String(b.til_godkjenning)} sterk={b.til_godkjenning > 0} />
                  <Metric lab="Opne oppgåver" val={String(b.opne_oppgaver)} />
                  <Metric lab="Aktive bestillingar" val={String(b.aktive_bestillingar)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {nyOpen && <NyButikkModal onClose={() => { setNyOpen(false); lastInn(); }} />}
      {nyAdminOpen && <NyKonsernAdminModal onClose={() => { setNyAdminOpen(false); lastInn(); }} />}
    </div>
  );
}
