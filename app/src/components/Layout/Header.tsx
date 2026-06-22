import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isLeder } from '../../constants';
import { Avatar } from '../ui/Avatar';
import { AdminPanel } from '../Admin/AdminPanel';

export function Header() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [adminOpen, setAdminOpen] = useState(false);
  if (!user) return null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px',
        background: 'var(--surface)', borderBottom: '1px solid var(--divider)',
      }}
    >
      <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 38, height: 38, borderRadius: 9 }} />
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 17, letterSpacing: '0.3px' }}>MEKK ØLEN</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Vakt &amp; timestyring</div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {isLeder(user.id) && (
          <button
            onClick={() => setAdminOpen(true)}
            title="Administrasjon"
            style={{
              width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--surface-alt)',
              borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ⚙️
          </button>
        )}
        <button
          onClick={toggle}
          title={dark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
          style={{
            width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--surface-alt)',
            borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {dark ? '☀️' : '🌙'}
        </button>
        <Avatar init={user.init} farge={user.farge} size={36} fontSize={13} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{user.navn}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{user.rolle}</div>
        </div>
        <button
          onClick={logout}
          style={{
            marginLeft: 6, padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--surface-alt)',
            borderRadius: 8, cursor: 'pointer', fontFamily: "'Barlow'", fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
          }}
        >
          Logg ut
        </button>
      </div>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
