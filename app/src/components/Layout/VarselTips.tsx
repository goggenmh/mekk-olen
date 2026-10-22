import { useEffect, useState } from 'react';
import { hentAbonnement, pushStotta, skruPaVarsel, trengHeimeskjerm } from '../../lib/push';
import type { View } from '../../lib/view';
import { Icon } from '../ui/Icon';

const NOKKEL = 'mekk-varseltips-lukka';

/**
 * Lite banner på oversikta som ber den tilsette slå på varsel, så bytteønske,
 * nye vakter og godkjende timar faktisk når fram. Blir borte når varsel er på,
 * eller når brukaren lukkar det.
 */
export function VarselTips({ setView }: { setView: (v: View) => void }) {
  const [vis, setVis] = useState(false);
  const [jobbar, setJobbar] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    let lukka = false;
    try { lukka = localStorage.getItem(NOKKEL) === '1'; } catch { /* ignore */ }
    if (lukka || !pushStotta()) return;
    hentAbonnement().then((s) => { if (!s) setVis(true); }).catch(() => {});
  }, []);

  if (!vis) return null;

  const blokkert = Notification.permission === 'denied';
  const heimeskjerm = trengHeimeskjerm();
  const lukk = () => {
    try { localStorage.setItem(NOKKEL, '1'); } catch { /* ignore */ }
    setVis(false);
  };
  const skruPa = async () => {
    setJobbar(true);
    setFeil(null);
    try {
      await skruPaVarsel();
      setVis(false);
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noko gjekk gale.');
    } finally {
      setJobbar(false);
    }
  };

  let tekst = 'Få beskjed om nye vakter, bytteønske og godkjende timar – sjølv når appen er lukka.';
  if (heimeskjerm) tekst = 'På iPhone: trykk Del-knappen → «Legg til på Heim-skjerm», og opne appen derifrå for å få varsel.';
  else if (blokkert) tekst = 'Varsel er blokkerte i nettlesaren. Trykk på hengelåsen ved adressefeltet → Varsel → Tillat, og last sida på nytt.';

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div
        role="status"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--brand-soft)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', maxWidth: 1384, margin: '0 auto',
        }}
      >
        <span style={{ display: 'flex', color: 'var(--brand-strong)' }}><Icon name="bell" size={20} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Slå på varsel</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{tekst}</div>
          {feil && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>{feil}</div>}
        </div>
        {!heimeskjerm && !blokkert && (
          <button onClick={skruPa} disabled={jobbar} style={{ padding: '8px 14px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {jobbar ? 'Slår på …' : 'Slå på'}
          </button>
        )}
        {blokkert && (
          <button onClick={() => setView('innstillinger')} style={{ padding: '8px 14px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Innstillingar
          </button>
        )}
        <button onClick={lukk} aria-label="Lukk" title="Lukk" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
      </div>
    </div>
  );
}
