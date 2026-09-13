import { useAppData } from '../../context/AppDataContext';
import { weekDates, mondayOf, today } from '../../lib/dates';
import { VIEWS, NAV_GROUPS, type View } from '../../lib/view';
import { Icon } from '../ui/Icon';

const META = Object.fromEntries(VIEWS.map((v) => [v.key, v])) as Record<View, typeof VIEWS[number]>;

export function Sidebar({ view, setView, isMobile = false, open = false, onClose }: {
  view: View;
  setView: (v: View) => void;
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}) {
  const { entries, swaps, tasks, orders } = useAppData();

  const weekDays = weekDates(mondayOf(today()));
  const timelisteBadge = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
  const vaktplanBadge = swaps.filter((s) => s.status === 'pending').length;
  const oppgaverBadge = tasks.filter((t) => t.ansatt === 'ufordelt').length;
  const bestillingBadge = orders.filter((o) => o.status === 'komen' && !o.varsla).length;

  const badges: Partial<Record<View, { n: number }>> = {
    timeliste: timelisteBadge > 0 ? { n: timelisteBadge } : undefined,
    vaktplan: vaktplanBadge > 0 ? { n: vaktplanBadge } : undefined,
    oppgaver: oppgaverBadge > 0 ? { n: oppgaverBadge } : undefined,
    bestilling: bestillingBadge > 0 ? { n: bestillingBadge } : undefined,
  };

  const innhald = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 16px' }}>
        <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 34, height: 34, borderRadius: 11 }} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 15.5, letterSpacing: '0.3px', color: 'var(--rail-brand)' }}>MEKK ØLEN</div>
          <div style={{ fontSize: 10, color: 'var(--rail-brand-sub)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Vakt &amp; timestyring</div>
        </div>
      </div>

      {NAV_GROUPS.map((grp, gi) => (
        <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {grp.seksjon && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--rail-section)', padding: '14px 12px 5px' }}>
              {grp.seksjon}
            </div>
          )}
          {grp.punkt.map((key) => {
            const v = META[key];
            const active = view === key;
            const badge = badges[key];
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', border: 'none', cursor: 'pointer',
                  fontFamily: "'Geist'", fontSize: 13.5, fontWeight: 600, textAlign: 'left', borderRadius: 12,
                  background: active ? 'var(--rail-active-bg)' : 'transparent', color: active ? 'var(--rail-active-fg)' : 'var(--rail-fg)',
                }}
              >
                <span style={{ width: 20, display: 'flex', justifyContent: 'center', flex: 'none' }}>
                  <Icon name={v.ikon} size={18} />
                </span>
                <span style={{ flex: 1 }}>{v.label}</span>
                {badge && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--accent)', borderRadius: 8, padding: '1px 7px', minWidth: 16, textAlign: 'center' }}>
                    {badge.n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );

  if (isMobile) {
    return (
      <>
        {open && (
          <div className="no-print" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,36,54,0.45)', zIndex: 60 }} />
        )}
        <div
          className="no-print"
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 250, zIndex: 61,
            display: 'flex', flexDirection: 'column', gap: 2, padding: '18px 12px',
            background: 'var(--rail-bg)', borderRight: '1px solid var(--rail-border)', overflowY: 'auto',
            transform: open ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.2s ease',
            boxShadow: open ? '0 0 40px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {innhald}
        </div>
      </>
    );
  }

  return (
    <div
      className="no-print"
      style={{
        width: 232, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2, padding: '18px 12px',
        background: 'var(--rail-bg)', borderRight: '1px solid var(--rail-border)', height: '100vh', overflowY: 'auto',
      }}
    >
      {innhald}
    </div>
  );
}
