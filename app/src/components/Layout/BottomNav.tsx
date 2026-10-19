import { useAppData } from '../../context/AppDataContext';
import { alder } from '../../lib/bestilling';
import type { View } from '../../lib/view';
import { Icon } from '../ui/Icon';

// Fast meny nedst på mobil med det dei tilsette brukar mest. Resten ligg
// under «Meir», som opnar sidemenyen.
const PUNKT: { key: View; label: string; ikon: string }[] = [
  { key: 'dashbord', label: 'Oversikt', ikon: 'dashbord' },
  { key: 'vaktplan', label: 'Vaktplan', ikon: 'vaktplan' },
  { key: 'timeliste', label: 'Timar', ikon: 'timeliste' },
  { key: 'bestilling', label: 'Bestillingar', ikon: 'bestilling' },
];

export function BottomNav({ view, setView, onMeir }: { view: View; setView: (v: View) => void; onMeir: () => void }) {
  const { orders, swaps } = useAppData();
  const merke: Partial<Record<View, number>> = {
    vaktplan: swaps.filter((s) => s.status === 'pending').length,
    bestilling: orders.filter((o) => (o.status === 'komen' && !o.varsla) || alder(o).gammal).length,
  };
  const iMeir = !PUNKT.some((p) => p.key === view);

  const knapp = (key: string, label: string, ikon: string, aktiv: boolean, onClick: () => void, n = 0) => (
    <button
      key={key}
      onClick={onClick}
      aria-label={n ? `${label} (${n})` : label}
      aria-current={aktiv ? 'page' : undefined}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 0 6px',
        border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Geist'", fontSize: 10.5, fontWeight: 600,
        color: aktiv ? 'var(--brand-strong)' : 'var(--text-muted)', position: 'relative',
      }}
    >
      <span style={{ position: 'relative', display: 'flex' }}>
        <Icon name={ikon} size={21} />
        {n > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--accent)', color: 'var(--on-brand)', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
        )}
      </span>
      {label}
    </button>
  );

  return (
    <nav
      className="no-print"
      aria-label="Hovudmeny"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, display: 'flex',
        background: 'var(--surface)', borderTop: '1px solid var(--border)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {PUNKT.map((p) => knapp(p.key, p.label, p.ikon, view === p.key, () => setView(p.key), merke[p.key] ?? 0))}
      {knapp('meir', 'Meir', 'menu', iMeir, onMeir)}
    </nav>
  );
}
