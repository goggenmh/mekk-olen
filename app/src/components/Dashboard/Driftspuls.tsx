import { useMemo, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { komandeRisiko } from '../../lib/drift';
import { parseDate, MND } from '../../lib/dates';
import type { View } from '../../lib/view';

const labelStyle: CSSProperties = { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--text-label)' };

const UKE = ['søn', 'mån', 'tys', 'ons', 'tor', 'fre', 'lau'];
function datoTekst(d: string): string {
  const dt = parseDate(d);
  return `${UKE[dt.getDay()]} ${dt.getDate()}. ${MND[dt.getMonth()]}`;
}

// Framoverskodande driftspuls for leiar: bemanningsglipar + ferie-kollisjonar
// dei neste to vekene. Reaktive varsel ligg i varslingssenteret; dette er det
// som skal planleggjast FØR det blir eit problem.
export function Driftspuls({ style, setView }: { style?: CSSProperties; setView: (v: View) => void }) {
  const { shifts, ferie } = useAppData();
  const risiko = useMemo(() => komandeRisiko(shifts, ferie), [shifts, ferie]);

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={labelStyle}>Framover · to veker</div>
        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>bemanning</span>
      </div>

      {risiko.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--pill-gronn-fg)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--stock-green)', flex: 'none' }} />
          Bemanninga er dekt dei neste to vekene.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {risiko.map((r) => {
            const ube = r.type === 'ubemanna';
            return (
              <button
                key={r.dato}
                onClick={() => setView('vaktplan')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)', width: '100%' }}
              >
                <span style={{ flex: 'none', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', padding: '3px 8px', borderRadius: 999, color: ube ? 'var(--pill-raud-fg)' : 'var(--pill-amber-fg)', background: ube ? 'var(--pill-raud-bg)' : 'var(--pill-amber-bg)' }}>
                  {ube ? 'Udekt' : 'Fri'}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{datoTekst(r.dato)}</span>
                  <span style={{ color: 'var(--text-muted)' }}> — {ube ? 'open, men ingen vakt planlagt' : `${r.tal} tilsette har fri/ferie`}</span>
                </span>
                <span style={{ color: 'var(--text-faint)', fontWeight: 800 }}>‹</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
