import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';

export function Header() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px',
        background: '#fff', borderBottom: '1px solid #eef2f4',
      }}
    >
      <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 38, height: 38, borderRadius: 9 }} />
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 17, letterSpacing: '0.3px' }}>MEKK ØLEN</div>
        <div style={{ fontSize: 11, color: '#7e93a0', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Vakt &amp; timestyring</div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar init={user.init} farge={user.farge} size={36} fontSize={13} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{user.navn}</div>
          <div style={{ fontSize: 11.5, color: '#7e93a0' }}>{user.rolle}</div>
        </div>
        <button
          onClick={logout}
          style={{
            marginLeft: 6, padding: '8px 14px', border: '1px solid #e1e8ec', background: '#f7f9fb',
            borderRadius: 8, cursor: 'pointer', fontFamily: "'Barlow'", fontSize: 13, fontWeight: 600, color: '#566570',
          }}
        >
          Logg ut
        </button>
      </div>
    </div>
  );
}
