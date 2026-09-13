import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastItem } from '../../lib/toast';

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="no-print" style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200 }}>
      {items.map((i) => (
        <div
          key={i.id}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-hover)',
            borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
            display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, maxWidth: 340,
            animation: 'toastIn 0.18s ease',
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2f9e6f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flex: 'none' }}>✓</span>
          {i.tekst}
        </div>
      ))}
    </div>
  );
}
