import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { fmt } from '../../lib/dates';

interface Tilsett { navn: string; rolle: string; init: string; farge: string; leder: boolean; paa_vakt: boolean }
interface Detalj {
  namn: string;
  farge: string;
  leiar: string | null;
  tal_tilsette: number;
  timar_veka: number;
  til_godkjenning: number;
  paa_vakt_i_dag: number;
  vakter: { navn: string; farge: string; start: string; slutt: string; skift: string }[];
  timar: { navn: string; farge: string; timar: number }[];
  oppgaver: { tittel: string; prioritet: string }[];
  bestillingar: { kunde: string; vare: string; status: string }[];
  tilsette: Tilsett[];
}

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)', padding: '17px 19px' } as const;
const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 13 } as const;
const STATUS_TEKST: Record<string, string> = { ny: 'Ny', tinga: 'Bestilt', komen: 'Komen', henta: 'Henta' };

function prioStil(p: string) {
  if (p === 'høg') return { background: 'rgba(255,107,107,0.16)', color: 'var(--danger)' };
  return { background: 'var(--surface-alt)', color: 'var(--text-muted)' };
}

export function ButikkDetalj({ butikkId, namn, onBack }: { butikkId: string; namn: string; onBack: () => void }) {
  const [d, setD] = useState<Detalj | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('butikk_detalj', { bid: butikkId }).then(({ data, error }) => {
      if (error) { setFeil(error.message); return; }
      setD(data as Detalj);
    });
  }, [butikkId]);

  const farge = d?.farge || '#11788a';
  const maxTimar = Math.max(1, ...((d?.timar) || []).map((t) => Number(t.timar)));
  const kpi = d ? [
    { lab: 'Tilsette', val: String(d.tal_tilsette), farge: farge },
    { lab: 'Timar denne veka', val: `${fmt(Number(d.timar_veka))} t`, farge: '#6a5acd' },
    { lab: 'Til godkjenning', val: String(d.til_godkjenning), farge: 'var(--accent)' },
    { lab: 'På vakt i dag', val: String(d.paa_vakt_i_dag), farge: 'var(--brand)' },
  ] : [];

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1080 }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>‹ Tilbake til konsern-oversikt</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: `${farge}22`, color: farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, flex: 'none' }}>
          {(d?.namn || namn).replace(/^MEKK\s*/i, '').charAt(0).toUpperCase() || 'M'}
        </span>
        <div>
          <h1 style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 27, letterSpacing: '-0.6px' }}>{d?.namn || namn}</h1>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Butikk-detaljar · i dag og denne veka</div>
        </div>
        {d?.leiar && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Leiar</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{d.leiar}</div>
          </div>
        )}
      </div>

      {feil ? (
        <div style={{ fontSize: 13, color: 'var(--danger)' }}>Kunne ikkje laste: {feil}</div>
      ) : !d ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lastar…</div>
      ) : (
        <>
          {/* KPI-stripe */}
          <div style={{ ...card, padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            {kpi.map((k, i) => (
              <div key={k.lab} style={{ padding: '15px 18px', borderLeft: i === 0 ? 'none' : '1px solid var(--divider)' }}>
                <div style={{ fontSize: 25, fontWeight: 800, fontFamily: "'Geist Mono'", color: k.farge, letterSpacing: '-0.5px' }}>{k.val}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{k.lab}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, alignItems: 'start' }}>
            {/* Vakter i dag */}
            <div style={card}>
              <div style={labelStyle}>Vakter i dag</div>
              {d.vakter.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen vakter i dag.</div>}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {d.vakter.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < d.vakter.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                    <span style={{ fontFamily: "'Geist Mono'", fontSize: 13.5, fontWeight: 700, width: 96 }}>{v.start}–{v.slutt}</span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.farge, flex: 'none' }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{v.navn}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.skift}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timar denne veka */}
            <div style={card}>
              <div style={labelStyle}>Timar denne veka · per tilsett</div>
              {d.timar.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen timar ført enno.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {d.timar.map((t, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600 }}>{t.navn}</span>
                      <span style={{ fontFamily: "'Geist Mono'", color: 'var(--text-muted)' }}>{fmt(Number(t.timar))} t</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(Number(t.timar) / maxTimar) * 100}%`, background: t.farge, borderRadius: 6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opne oppgåver */}
            <div style={card}>
              <div style={labelStyle}>Opne oppgåver</div>
              {d.oppgaver.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen opne oppgåver.</div>}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {d.oppgaver.map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '9px 0', borderBottom: i < d.oppgaver.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                    <span style={{ flex: 1 }}>{o.tittel}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', padding: '2px 8px', borderRadius: 20, ...prioStil(o.prioritet) }}>{o.prioritet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aktive bestillingar */}
            <div style={card}>
              <div style={labelStyle}>Aktive bestillingar</div>
              {d.bestillingar.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen aktive bestillingar.</div>}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {d.bestillingar.map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '9px 0', borderBottom: i < d.bestillingar.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                    <span style={{ fontWeight: 700, flex: 'none' }}>{o.kunde}</span>
                    <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.vare}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand-strong)', background: 'var(--brand-soft)', padding: '2px 9px', borderRadius: 8 }}>{STATUS_TEKST[o.status] || o.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tilsette */}
            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Tilsette i butikken ({d.tilsette.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 10 }}>
                {d.tilsette.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: a.farge, color: '#08201c', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{a.init}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.navn}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.leder ? 'Leiar' : a.rolle}</div>
                    </div>
                    {a.paa_vakt && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#2f9e6f', display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2f9e6f' }} />På vakt
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
