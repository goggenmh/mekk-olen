import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastItem } from '../../lib/toast';
import { useIsMobile } from '../../lib/useIsMobile';

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const isMobile = useIsMobile();
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="no-print" style={{
      position: 'fixed', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200,
      // Mobil: over botnmenyen og heimelinja, sentrert.
      ...(isMobile
        ? { bottom: 'calc(76px + env(safe-area-inset-bottom))', left: 12, right: 12, alignItems: 'center' }
        : { bottom: 20, right: 20 }),
    }}>
      {items.map((i) => (
        <div
          key={i.id}
          role={i.type === 'feil' ? 'alert' : 'status'}
          style={{
            background: 'var(--surface)', border: `1px solid ${i.type === 'feil' ? 'var(--danger)' : 'var(--border)'}`, boxShadow: 'var(--shadow-hover)',
            borderRadius: 'var(--r)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
            display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, maxWidth: 340,
            animation: 'toastIn 0.18s ease',
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: i.type === 'feil' ? 'var(--danger)' : '#2f9e6f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flex: 'none' }}>{i.type === 'feil' ? '!' : '✓'}</span>
          {i.tekst}
        </div>
      ))}
    </div>
  );
}
