import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { fmt } from '../../lib/dates';

interface Detalj {
  namn: string;
  vakter: { navn: string; farge: string; start: string; slutt: string; skift: string }[];
  timar: { navn: string; farge: string; timar: number }[];
  oppgaver: { tittel: string; prioritet: string }[];
  bestillingar: { kunde: string; vare: string; status: string }[];
}

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)', padding: '16px 18px' } as const;
const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 } as const;
const STATUS_TEKST: Record<string, string> = { ny: 'Ny', tinga: 'Bestilt', komen: 'Komen', henta: 'Henta' };

export function ButikkDetalj({ butikkId, namn, onBack }: { butikkId: string; namn: string; onBack: () => void }) {
  const [d, setD] = useState<Detalj | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('butikk_detalj', { bid: butikkId }).then(({ data, error }) => {
      if (error) { setFeil(error.message); return; }
      setD(data as Detalj);
    });
  }, [butikkId]);

  const maxTimar = Math.max(1, ...((d?.timar) || []).map((t) => Number(t.timar)));

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1000 }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>‹ Tilbake til oversikt</button>
      <div>
        <h1 style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 27, letterSpacing: '-0.5px' }}>{d?.namn || namn}</h1>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Butikk-detaljar · i dag og denne veka</div>
      </div>

      {feil ? (
        <div style={{ fontSize: 13, color: 'var(--danger)' }}>Kunne ikkje laste: {feil}</div>
      ) : !d ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lastar…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, alignItems: 'start' }}>
          {/* Vakter i dag */}
          <div style={card}>
            <div style={labelStyle}>Vakter i dag</div>
            {d.vakter.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen vakter i dag.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {d.vakter.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <div style={labelStyle}>Timar denne veka</div>
            {d.timar.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen timar ført enno.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.timar.map((t, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.oppgaver.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{o.tittel}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: o.prioritet === 'høg' ? 'var(--danger)' : 'var(--text-muted)' }}>{o.prioritet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aktive bestillingar */}
          <div style={card}>
            <div style={labelStyle}>Aktive bestillingar</div>
            {d.bestillingar.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen aktive bestillingar.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.bestillingar.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{o.kunde}</span>
                  <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.vare}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--brand-strong)', background: 'var(--brand-soft)', padding: '2px 8px', borderRadius: 8 }}>{STATUS_TEKST[o.status] || o.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
