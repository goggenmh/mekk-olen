import { useRef, useState, type ReactNode } from 'react';
import { MND, isoAar, isoWeek, mandagIVeke, mondayOf, today, vekerIAar, datoIntervall, addDays } from '../../lib/dates';
import { useIsMobile } from '../../lib/useIsMobile';

/** Tittelen «Veke 43» / «Oktober 2026» som knapp: opnar eit val av veke
 *  (eller månad) i eit år, med pil for å byte år. */
export function PeriodeVeljar({ mode, veke, manad, onVeke, onManad, children }: {
  mode: 'uke' | 'manad';
  /** Måndagen i vald veke. */
  veke: string;
  /** 'YYYY-MM'. */
  manad: string;
  onVeke: (mandag: string) => void;
  onManad: (manad: string) => void;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const knappRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [topp, setTopp] = useState(0);
  const valtAar = mode === 'uke' ? isoAar(veke) : Number(manad.slice(0, 4));
  const [ar, setAr] = useState(valtAar);

  const iDag = today();
  const denneVeka = mondayOf(iDag);
  const opne = () => {
    const r = knappRef.current?.getBoundingClientRect();
    if (r) setTopp(Math.round(r.bottom + 8));
    setAr(valtAar);
    setOpen((o) => !o);
  };

  const rute = (aktiv: boolean, idag: boolean) => ({
    padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: aktiv ? 700 : 600,
    border: idag && !aktiv ? '1.5px solid var(--brand-strong)' : '1px solid var(--border)',
    background: aktiv ? 'var(--brand-strong)' : 'var(--surface)',
    color: aktiv ? 'var(--on-brand)' : 'var(--text)',
  });

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={knappRef}
        onClick={opne}
        aria-expanded={open}
        aria-label={mode === 'uke' ? 'Vel veke' : 'Vel månad'}
        style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', margin: '-4px -6px', borderRadius: 8, color: 'var(--text)', textAlign: 'left', fontFamily: 'inherit' }}
      >
        <span>{children}</span>
        <span aria-hidden style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div style={{
            ...(isMobile
              ? { position: 'fixed', top: topp, left: 12, right: 12, maxHeight: `calc(100dvh - ${topp + 90}px)` }
              : { position: 'absolute', top: 'calc(100% + 8px)', left: -8, width: 330, maxHeight: '70vh' }),
            overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)', zIndex: 50, padding: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button onClick={() => setAr(ar - 1)} aria-label="Førre år" style={pil}>‹</button>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{ar}</div>
              <button onClick={() => setAr(ar + 1)} aria-label="Neste år" style={pil}>›</button>
            </div>
            {mode === 'uke' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {Array.from({ length: vekerIAar(ar) }, (_, i) => {
                  const mandag = mandagIVeke(ar, i + 1);
                  return (
                    <button
                      key={i}
                      onClick={() => { onVeke(mandag); setOpen(false); }}
                      title={datoIntervall(mandag, addDays(mandag, 6))}
                      style={rute(mandag === veke, mandag === denneVeka)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {MND.map((m, i) => {
                  const verdi = `${ar}-${String(i + 1).padStart(2, '0')}`;
                  return (
                    <button key={m} onClick={() => { onManad(verdi); setOpen(false); }} style={rute(verdi === manad, verdi === iDag.slice(0, 7))}>
                      {m.charAt(0).toUpperCase() + m.slice(1, 3)}
                    </button>
                  );
                })}
              </div>
            )}
            {mode === 'uke' && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Denne veka er veke {isoWeek(iDag)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const pil = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
  cursor: 'pointer', fontSize: 16, color: 'var(--text)',
} as const;
