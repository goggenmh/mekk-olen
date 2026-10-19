import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { Avatar } from '../ui/Avatar';
import type { View } from '../../lib/view';
import { hentAbonnement, pushStotta, skruAvVarsel, skruPaVarsel, trengHeimeskjerm } from '../../lib/push';

const cardStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow-card)',
} as const;

function Brytar({ pa, onClick, avslatt }: { pa: boolean; onClick: () => void; avslatt?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={avslatt}
      aria-pressed={pa}
      style={{
        width: 52, height: 30, borderRadius: 12, border: 'none', cursor: avslatt ? 'default' : 'pointer', position: 'relative',
        background: pa ? 'var(--brand)' : 'var(--border)', flex: 'none', opacity: avslatt ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: pa ? 25 : 3, width: 24, height: 24, borderRadius: '50%',
        background: '#fff', transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function VarselKort() {
  const [pa, setPa] = useState(false);
  const [jobbar, setJobbar] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const stotta = pushStotta();
  const heimeskjerm = trengHeimeskjerm();
  const blokkert = stotta && Notification.permission === 'denied';

  useEffect(() => {
    if (!stotta) return;
    hentAbonnement().then((s) => setPa(!!s)).catch(() => {});
  }, [stotta]);

  const byt = async () => {
    setJobbar(true);
    setFeil(null);
    try {
      if (pa) { await skruAvVarsel(); setPa(false); }
      else { await skruPaVarsel(); setPa(true); }
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noko gjekk gale.');
    } finally {
      setJobbar(false);
    }
  };

  let info = 'Få varsel om nye vakter, bytteønske, svar på vaktbyte og godkjende timar.';
  if (heimeskjerm) info = 'På iPhone må du først leggje appen til på heimeskjermen: Del-knappen → «Legg til på Heim-skjerm», og opne han derifrå.';
  else if (!stotta) info = 'Denne nettlesaren støttar ikkje varsel.';
  else if (blokkert) info = 'Varsel er blokkerte for denne sida. Slå dei på i innstillingane til nettlesaren.';

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Varsel på denne eininga</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{info}</div>
        </div>
        <Brytar pa={pa} onClick={byt} avslatt={jobbar || !stotta || heimeskjerm || blokkert} />
      </div>
      {feil && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 10 }}>{feil}</div>}
    </div>
  );
}

export function Innstillinger({ setView }: { setView: (v: View) => void }) {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { isLeder } = useAnsatte();

  if (!user) return null;

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <div>
        <h1 style={{ fontFamily: "'Geist Variable'", fontWeight: 800, fontSize: 25, letterSpacing: '-0.3px' }}>Innstillingar</h1>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Profil og preferansar</div>
      </div>

      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar init={user.init} farge={user.farge} size={52} fontSize={17} />
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{user.navn}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.rolle}</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{user.email}{user.telefon && ` · ${user.telefon}`}</div>
        </div>
        {isLeder(user.id) && (
          <button
            onClick={() => setView('ansatte')}
            style={{ marginLeft: 'auto', padding: '9px 14px', background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 11, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Endre under Tilsette →
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Mørk modus</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Bytt mellom lyst og mørkt utseende</div>
        </div>
        <Brytar pa={dark} onClick={toggle} />
      </div>

      <VarselKort />

      {isLeder(user.id) && (
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Administrasjon</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            Delegering av godkjenning og meldingar til tilsette finn du under tannhjul-ikonet i toppmenyen.
          </div>
          <button
            onClick={() => setView('ansatte')}
            style={{ padding: '9px 14px', background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Gå til Tilsette
          </button>
        </div>
      )}
    </div>
  );
}
