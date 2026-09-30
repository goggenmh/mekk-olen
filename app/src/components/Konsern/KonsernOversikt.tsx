import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { fmt, fullDatoTekst, today } from '../../lib/dates';
import { NyButikkModal } from './NyButikkModal';
import { NyKonsernAdminModal } from './NyKonsernAdminModal';
import { ButikkDetalj } from './ButikkDetalj';

interface VaktFolk { init: string; farge: string }
interface ButikkStat {
  butikk: string;
  namn: string;
  farge: string;
  tilsette: number;
  timar_veka: number;
  timar_forrige: number;
  til_godkjenning: number;
  opne_oppgaver: number;
  hoyprio_oppgaver: number;
  aktive_bestillingar: number;
  vakter_i_dag: number;
  leiar: string | null;
  vakt_folk: VaktFolk[];
}

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)' } as const;
const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 13 } as const;
const kort = (n: string) => n.replace(/^MEKK\s*/i, '');

function Metric({ lab, val, sterk }: { lab: string; val: string; sterk?: boolean }) {
  return (
    <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 11, padding: '9px 11px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Geist Mono'", letterSpacing: '-0.4px', color: sterk ? 'var(--accent)' : 'var(--text)' }}>{val}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>{lab}</div>
    </div>
  );
}

function Avatarar({ folk, max = 3 }: { folk: VaktFolk[]; max?: number }) {
  const vis = folk.slice(0, max);
  const rest = folk.length - vis.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {vis.map((f, i) => (
        <span key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: f.farge, color: '#08201c', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)', marginLeft: i === 0 ? 0 : -7 }}>{f.init}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 6 }}>+{rest}</span>}
    </div>
  );
}

export function KonsernOversikt() {
  const { user } = useAuth();
  const [rader, setRader] = useState<ButikkStat[] | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [nyOpen, setNyOpen] = useState(false);
  const [nyAdminOpen, setNyAdminOpen] = useState(false);
  const [detalj, setDetalj] = useState<{ id: string; namn: string } | null>(null);
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

  const R = rader || [];
  const sum = (f: (b: ButikkStat) => number) => R.reduce((a, b) => a + f(b), 0);
  const timarVeka = sum((b) => Number(b.timar_veka));
  const timarForrige = sum((b) => Number(b.timar_forrige));
  const trend = timarForrige > 0 ? ((timarVeka - timarForrige) / timarForrige) * 100 : 0;
  const totGodkjenning = sum((b) => b.til_godkjenning);
  const totHoyprio = sum((b) => b.hoyprio_oppgaver);
  const totPaaVakt = sum((b) => b.vakter_i_dag);
  const totTilsette = sum((b) => b.tilsette);
  const maxTimar = Math.max(1, ...R.map((b) => Number(b.timar_veka)));

  const breakdown = (f: (b: ButikkStat) => number) =>
    R.filter((b) => f(b) > 0).map((b) => `${kort(b.namn)} ${f(b)}`).join(' · ') || 'ingen';

  const kpi = [
    { lab: 'Butikkar', val: String(R.length), farge: 'var(--brand)', dtl: ' ' },
    { lab: 'Tilsette', val: String(totTilsette), farge: '#2f9e6f', dtl: 'i heile konsernet' },
    { lab: 'Timar denne veka', val: `${fmt(timarVeka)} t`, farge: '#6a5acd', dtl: timarForrige > 0 ? `${trend >= 0 ? '▲' : '▼'} ${fmt(Math.abs(trend))}% mot førre` : 'mot førre veke', dfarge: trend >= 0 ? 'var(--brand-strong)' : 'var(--danger)' },
    { lab: 'Til godkjenning', val: String(totGodkjenning), farge: '#c8811a', dtl: 'ventar på leiar' },
    { lab: 'Opne oppgåver', val: String(sum((b) => b.opne_oppgaver)), farge: '#c0392b', dtl: totHoyprio > 0 ? `${totHoyprio} med høg prio` : 'ingen høg prio', dfarge: totHoyprio > 0 ? 'var(--danger)' : undefined },
    { lab: 'Bestillingar', val: String(sum((b) => b.aktive_bestillingar)), farge: '#0c5a69', dtl: 'aktive no' },
  ];

  const attention = [
    { n: totGodkjenning, lab: 'timeføringar til godkjenning', bd: breakdown((b) => b.til_godkjenning), farge: 'var(--accent)' },
    { n: totHoyprio, lab: 'oppgåver med høg prioritet', bd: breakdown((b) => b.hoyprio_oppgaver), farge: 'var(--danger)' },
    { n: totPaaVakt, lab: 'på vakt i dag', bd: `av ${totTilsette} tilsette i konsernet`, farge: 'var(--brand)' },
  ];

  if (detalj) {
    return <ButikkDetalj butikkId={detalj.id} namn={detalj.namn} onBack={() => setDetalj(null)} />;
  }

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1140 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 30, letterSpacing: '-0.7px' }}>
            {helsing}, <span style={{ background: 'linear-gradient(120deg, var(--brand), var(--brand-strong))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fornamn}</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>Konsern-oversikt · {R.length} butikkar · {fullDatoTekst(today())}</div>
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
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{k.lab}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 6, color: k.dfarge || 'var(--text-faint)' }}>{k.dtl}</div>
              </div>
            ))}
          </div>

          {/* Krev merksemd */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
            {attention.map((a) => (
              <div key={a.lab} style={{ ...card, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13, position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: a.farge }} />
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Geist Mono'", letterSpacing: '-0.5px', color: a.farge }}>{a.n}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.35 }}>{a.lab}<br /><span style={{ color: 'var(--text-faint)' }}>{a.bd}</span></span>
              </div>
            ))}
          </div>

          {/* Timar per butikk */}
          <div style={card}>
            <div style={{ padding: '16px 18px 4px' }}><div style={labelStyle}>Timar denne veka · per butikk</div></div>
            <div style={{ padding: '0 18px 10px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              {rader.map((b) => (
                <div key={b.butikk} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 128, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: b.farge, flex: 'none' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kort(b.namn)}</span>
                  </span>
                  <div style={{ flex: 1, height: 13, borderRadius: 7, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(3, (Number(b.timar_veka) / maxTimar) * 100)}%`, background: b.farge, borderRadius: 7 }} />
                  </div>
                  <span style={{ width: 96, textAlign: 'right', fontFamily: "'Geist Mono'", fontSize: 12.5, fontWeight: 700 }}>
                    {fmt(Number(b.timar_veka))} t <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>/ {fmt(b.tilsette > 0 ? Number(b.timar_veka) / b.tilsette : 0)}</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 18px 15px', fontSize: 11.5, color: 'var(--text-faint)' }}>Tal etter «/» = snitt timar per tilsett</div>
          </div>

          {/* Butikk-kort */}
          <div style={labelStyle}>Butikkane · klikk for detaljar</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
            {rader.map((b) => {
              const hot = b.til_godkjenning > 1 || b.hoyprio_oppgaver > 0;
              return (
                <div key={b.butikk} className="hoverable" onClick={() => setDetalj({ id: b.butikk, namn: b.namn })} style={{ ...card, borderLeft: `4px solid ${b.farge}`, borderColor: hot ? 'rgba(244,183,64,0.35)' : 'var(--border)', padding: '16px 17px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 11, background: `${b.farge}22`, color: b.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flex: 'none' }}>
                      {kort(b.namn).charAt(0).toUpperCase() || 'M'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.namn}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.tilsette} tilsette · {b.vakter_i_dag} på vakt i dag</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', padding: '4px 9px', borderRadius: 20, background: hot ? 'rgba(244,183,64,0.16)' : 'rgba(46,158,111,0.18)', color: hot ? 'var(--accent)' : '#2f9e6f' }}>{hot ? 'Treng blikk' : 'I rute'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <Metric lab="Timar denne veka" val={`${fmt(Number(b.timar_veka))} t`} />
                    <Metric lab="Til godkjenning" val={String(b.til_godkjenning)} sterk={b.til_godkjenning > 0} />
                    <Metric lab="Opne oppgåver" val={String(b.opne_oppgaver)} />
                    <Metric lab="Aktive bestillingar" val={String(b.aktive_bestillingar)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
                    {b.vakt_folk.length > 0 ? <Avatarar folk={b.vakt_folk} /> : <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Ingen på vakt i dag</span>}
                    <span style={{ fontSize: 12, color: 'var(--brand-strong)', fontWeight: 700 }}>Opne butikk ›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {nyOpen && <NyButikkModal onClose={() => { setNyOpen(false); lastInn(); }} />}
      {nyAdminOpen && <NyKonsernAdminModal onClose={() => { setNyAdminOpen(false); lastInn(); }} />}
    </div>
  );
}
