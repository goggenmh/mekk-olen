import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { Avatar } from '../ui/Avatar';
import type { View } from '../../lib/view';

const cardStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 20px',
} as const;

export function Innstillinger({ setView }: { setView: (v: View) => void }) {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { isLeder } = useAnsatte();

  if (!user) return null;

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <div>
        <h1 style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 22 }}>Innstillingar</h1>
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
            Endre i Ansatte →
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Mørk modus</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Bytt mellom lyst og mørkt utseende</div>
        </div>
        <button
          onClick={toggle}
          style={{
            width: 52, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer', position: 'relative',
            background: dark ? 'var(--brand)' : 'var(--border)', flex: 'none',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: dark ? 25 : 3, width: 24, height: 24, borderRadius: '50%',
            background: '#fff', transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>

      {isLeder(user.id) && (
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Administrasjon</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            Delegering av godkjenning og meldingar til ansatte finn du under ⚙️-ikonet i toppmenyen.
          </div>
          <button
            onClick={() => setView('ansatte')}
            style={{ padding: '9px 14px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Gå til Ansatte-modulen
          </button>
        </div>
      )}
    </div>
  );
}
