import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAppData } from '../../context/AppDataContext';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { AdminPanel } from '../Admin/AdminPanel';
import { weekDates, mondayOf, today } from '../../lib/dates';
import type { View } from '../../lib/view';

interface Varsel {
  key: string;
  tekst: string;
  view: View;
}

interface SearchHit {
  key: string;
  tittel: string;
  sub: string;
  view: View;
  ikon: string;
}

export function Header({ setView, isMobile = false, onMenu }: { setView: (v: View) => void; isMobile?: boolean; onMenu?: () => void }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { isLeder, ansatte, findAnsatt } = useAnsatte();
  const { docs, tasks, swaps, entries, orders } = useAppData();
  const [adminOpen, setAdminOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const varsler = useMemo<Varsel[]>(() => {
    const t = today();
    const weekDays = weekDates(mondayOf(t));
    const pendingSwaps = swaps.filter((s) => s.status === 'pending');
    const ventandeTimar = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
    const ufordelte = tasks.filter((x) => x.ansatt === 'ufordelt').length;
    const ankomne = orders.filter((o) => o.status === 'komen' && !o.varsla);
    return [
      ...pendingSwaps.map((s) => ({ key: `swap-${s.id}`, tekst: `${findAnsatt(s.fra).navn} ønskjer å bytte vakt ${s.dag}`, view: 'vaktplan' as View })),
      ...(ventandeTimar > 0 ? [{ key: 'timar', tekst: `${ventandeTimar} timelister ventar godkjenning`, view: 'timeliste' as View }] : []),
      ...ankomne.map((o) => ({ key: `order-${o.id}`, tekst: `Bestilling til ${o.kunde} har kome`, view: 'bestilling' as View })),
      ...(ufordelte > 0 ? [{ key: 'oppgaver', tekst: `${ufordelte} ufordelte oppgåver`, view: 'oppgaver' as View }] : []),
    ].slice(0, 8);
  }, [swaps, entries, tasks, orders, findAnsatt]);

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const fraAnsatte: SearchHit[] = ansatte
      .filter((a) => a.navn.toLowerCase().includes(q) || a.rolle.toLowerCase().includes(q))
      .map((a) => ({ key: `a-${a.id}`, tittel: a.navn, sub: a.rolle, view: 'ansatte' as View, ikon: 'user' }));
    const fraDoks: SearchHit[] = docs
      .filter((d) => d.tittel.toLowerCase().includes(q))
      .map((d) => ({ key: `d-${d.id}`, tittel: d.tittel, sub: d.kategori, view: 'dokument' as View, ikon: 'dokument' }));
    const fraOppgaver: SearchHit[] = tasks
      .filter((t) => t.tittel.toLowerCase().includes(q))
      .map((t) => ({ key: `t-${t.id}`, tittel: t.tittel, sub: 'Oppgåve', view: 'oppgaver' as View, ikon: 'oppgaver' }));
    return [...fraAnsatte, ...fraDoks, ...fraOppgaver].slice(0, 8);
  }, [query, ansatte, docs, tasks]);

  if (!user) return null;

  return (
    <div
      className="no-print"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '9px 14px' : '10px 20px',
        background: 'var(--topbar-bg)', borderBottom: '1px solid var(--rail-border)', minHeight: isMobile ? 56 : 62,
      }}
    >
      {isMobile && (
        <button
          onClick={onMenu}
          title="Meny"
          style={{
            width: 36, height: 36, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}
        >
          <Icon name="menu" size={20} />
        </button>
      )}
      <div style={{ position: 'relative', flex: 1, maxWidth: 380, display: isMobile ? 'none' : 'block' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk etter ansatt, dokument, oppgåve…"
          style={{
            width: '100%', padding: '8px 13px', border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, fontFamily: "'Geist'", fontSize: 13, color: 'var(--topbar-ctl-fg)',
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
                <span style={{ display: 'flex', color: 'var(--text-muted)' }}><Icon name={h.ikon} size={16} /></span>
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
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            title="Varsel"
            style={{
              position: 'relative', width: 34, height: 34, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
              borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="bell" size={18} />
            {varsler.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--topbar-bg)' }}>
                {varsler.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{ position: 'absolute', top: '130%', right: 0, width: 300, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 50 }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--divider)', fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-label)' }}>Varsel</div>
                {varsler.length === 0 ? (
                  <div style={{ padding: '18px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Ingen nye varsel 🎉</div>
                ) : (
                  varsler.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => { setView(v.view); setNotifOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--divider)' }}
                    >
                      <span style={{ display: 'flex', color: 'var(--brand-strong)', flex: 'none' }}><Icon name="bell" size={15} /></span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{v.tekst}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        {isLeder(user.id) && (
          <button
            onClick={() => setAdminOpen(true)}
            title="Administrasjon"
            style={{
              width: 34, height: 34, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
              borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="innstillinger" size={18} />
          </button>
        )}
        <button
          onClick={toggle}
          title={dark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
          style={{
            width: 34, height: 34, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={18} />
        </button>
        <Avatar init={user.init} farge={user.farge} size={32} fontSize={12} />
        {!isMobile && (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--topbar-name)' }}>{user.navn}</div>
            <div style={{ fontSize: 11.5, color: 'var(--topbar-role)' }}>{user.rolle}</div>
          </div>
        )}
        <button
          onClick={logout}
          title="Logg ut"
          style={{
            marginLeft: 6, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, cursor: 'pointer', fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, color: 'var(--topbar-ctl-fg)',
            ...(isMobile
              ? { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }
              : { padding: '8px 14px' }),
          }}
        >
          {isMobile ? <Icon name="logout" size={18} /> : 'Logg ut'}
        </button>
      </div>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
