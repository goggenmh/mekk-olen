import { useAppData } from '../../context/AppDataContext';
import { weekDates, mondayOf, today } from '../../lib/dates';
import { VIEWS, type View } from '../../lib/view';

export function Nav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { entries, swaps, tasks, orders } = useAppData();

  const weekDays = weekDates(mondayOf(today()));
  const timelisteBadge = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
  const vaktplanBadge = swaps.filter((s) => s.status === 'pending').length;
  const oppgaverBadge = tasks.filter((t) => t.ansatt === 'ufordelt').length;
  const bestillingBadge = orders.filter((o) => o.status === 'komen' && !o.varsla).length;

  const badges: Record<View, { n: number; bg: string } | null> = {
    dashbord: null,
    timeliste: timelisteBadge > 0 ? { n: timelisteBadge, bg: '#d8920f' } : null,
    vaktplan: vaktplanBadge > 0 ? { n: vaktplanBadge, bg: '#6a5acd' } : null,
    oppgaver: oppgaverBadge > 0 ? { n: oppgaverBadge, bg: '#7e93a0' } : null,
    bestilling: bestillingBadge > 0 ? { n: bestillingBadge, bg: '#e08a1e' } : null,
    dokument: null,
  };

  return (
    <div className="no-print" style={{ display: 'flex', gap: 4, padding: '0 22px', background: '#fff', borderBottom: '1px solid #eef2f4', overflowX: 'auto' }}>
      {VIEWS.map((v) => {
        const active = view === v.key;
        const badge = badges[v.key];
        return (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '13px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: "'Barlow'", fontSize: 13.5, fontWeight: 600, color: active ? '#11788a' : '#7e93a0',
              borderBottom: active ? '2px solid #1597a8' : '2px solid transparent', whiteSpace: 'nowrap',
            }}
          >
            {v.label}
            {badge && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: badge.bg, borderRadius: 9, padding: '1px 7px', minWidth: 16, textAlign: 'center' }}>
                {badge.n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
