import { useAppData } from '../../context/AppDataContext';
import { weekDates, mondayOf, today } from '../../lib/dates';
import { VIEWS, type View } from '../../lib/view';
import { Icon } from '../ui/Icon';

export function Sidebar({
  view, setView, open = false, onClose,
}: {
  view: View;
  setView: (v: View) => void;
  open?: boolean;
  onClose?: () => void;
}) {
  const { entries, swaps, tasks, orders } = useAppData();

  const weekDays = weekDates(mondayOf(today()));
  const timelisteBadge = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
  const vaktplanBadge = swaps.filter((s) => s.status === 'pending').length;
  const oppgaverBadge = tasks.filter((t) => t.ansatt === 'ufordelt').length;
  const bestillingBadge = orders.filter((o) => o.status === 'komen' && !o.varsla).length;

  const badges: Partial<Record<View, { n: number; bg: string }>> = {
    timeliste: timelisteBadge > 0 ? { n: timelisteBadge, bg: '#d8920f' } : undefined,
    vaktplan: vaktplanBadge > 0 ? { n: vaktplanBadge, bg: '#6a5acd' } : undefined,
    oppgaver: oppgaverBadge > 0 ? { n: oppgaverBadge, bg: '#7e93a0' } : undefined,
    bestilling: bestillingBadge > 0 ? { n: bestillingBadge, bg: '#e08a1e' } : undefined,
  };

  return (
    <>
      <div
        className={`sidebar-overlay no-print${open ? ' is-open' : ''}`}
        onClick={onClose}
      />
      <div
        className={`sidebar no-print${open ? ' is-open' : ''}`}
        style={{
          width: 232, flex: 'none', display: 'flex', flexDirection: 'column', gap: 3, padding: '18px 12px',
          background: 'var(--surface)', borderRight: '1px solid var(--divider)', height: '100vh', overflowY: 'auto',
        }}
      >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 18px' }}>
        <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 34, height: 34, borderRadius: 11 }} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 15.5, letterSpacing: '0.3px', color: 'var(--brand-strong)' }}>MEKK ØLEN</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Vakt &amp; timestyring</div>
        </div>
      </div>

      {VIEWS.map((v) => {
        const active = view === v.key;
        const badge = badges[v.key];
        return (
          <button
            key={v.key}
            onClick={() => { setView(v.key); onClose?.(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: 'none', cursor: 'pointer',
              fontFamily: "'Geist'", fontSize: 13.5, fontWeight: 600, textAlign: 'left', borderRadius: 12,
              background: active ? 'var(--brand-soft)' : 'transparent', color: active ? 'var(--brand-strong)' : 'var(--text-secondary)',
            }}
          >
            <span style={{ width: 20, display: 'flex', justifyContent: 'center', flex: 'none' }}>
              <Icon name={v.ikon} size={18} />
            </span>
            <span style={{ flex: 1 }}>{v.label}</span>
            {badge && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: badge.bg, borderRadius: 12, padding: '1px 7px', minWidth: 16, textAlign: 'center' }}>
                {badge.n}
              </span>
            )}
          </button>
        );
      })}
      </div>
    </>
  );
}
