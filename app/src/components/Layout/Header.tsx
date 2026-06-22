import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAppData } from '../../context/AppDataContext';
import { Avatar } from '../ui/Avatar';
import { AdminPanel } from '../Admin/AdminPanel';
import type { View } from '../../lib/view';

interface SearchHit {
  key: string;
  tittel: string;
  sub: string;
  view: View;
  ikon: string;
}

export function Header({ setView }: { setView: (v: View) => void }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { isLeder, ansatte } = useAnsatte();
  const { docs, tasks } = useAppData();
  const [adminOpen, setAdminOpen] = useState(false);
  const [query, setQuery] = useState('');

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const fraAnsatte: SearchHit[] = ansatte
      .filter((a) => a.navn.toLowerCase().includes(q) || a.rolle.toLowerCase().includes(q))
      .map((a) => ({ key: `a-${a.id}`, tittel: a.navn, sub: a.rolle, view: 'ansatte' as View, ikon: '👤' }));
    const fraDoks: SearchHit[] = docs
      .filter((d) => d.tittel.toLowerCase().includes(q))
      .map((d) => ({ key: `d-${d.id}`, tittel: d.tittel, sub: d.kategori, view: 'dokument' as View, ikon: '📄' }));
    const fraOppgaver: SearchHit[] = tasks
      .filter((t) => t.tittel.toLowerCase().includes(q))
      .map((t) => ({ key: `t-${t.id}`, tittel: t.tittel, sub: 'Oppgåve', view: 'oppgaver' as View, ikon: '✅' }));
    return [...fraAnsatte, ...fraDoks, ...fraOppgaver].slice(0, 8);
  }, [query, ansatte, docs, tasks]);

  if (!user) return null;

  return (
    <div
      className="no-print"
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px',
        background: 'var(--surface)', borderBottom: '1px solid var(--divider)',
      }}
    >
      <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk etter ansatt, dokument, oppgåve…"
          style={{
            width: '100%', padding: '10px 14px', border: '1px solid var(--border)', background: 'var(--surface-alt)',
            borderRadius: 12, fontFamily: "'Geist'", fontSize: 13.5, color: 'var(--text)',
          }}
        />
        {hits.length > 0 && (
          <div
            style={{
              position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 50,
            }}
          >
            {hits.map((h) => (
              <button
                key={h.key}
                onClick={() => { setView(h.view); setQuery(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: 'none',
                  cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--divider)',
                }}
              >
                <span style={{ fontSize: 15 }}>{h.ikon}</span>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{h.tittel}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {isLeder(user.id) && (
          <button
            onClick={() => setAdminOpen(true)}
            title="Administrasjon"
            style={{
              width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--surface-alt)',
              borderRadius: 12, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            borderRadius: 12, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            borderRadius: 12, cursor: 'pointer', fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
          }}
        >
          Logg ut
        </button>
      </div>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
