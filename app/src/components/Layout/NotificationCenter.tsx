import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Icon } from '../ui/Icon';
import type { View } from '../../lib/view';

function NotificationPanel({ onPick, onEmpty }: { onPick: (v: View) => void; onEmpty: string }) {
  const { items } = useNotifications();
  return (
    <div
      style={{
        position: 'absolute', top: '110%', right: 0, width: 320, maxHeight: 420, overflowY: 'auto',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 12px 30px rgba(0,0,0,0.15)', zIndex: 60,
      }}
    >
      {items.length === 0 ? (
        <div style={{ padding: 18, fontSize: 13, color: 'var(--text-muted)' }}>{onEmpty}</div>
      ) : (
        items.map((it) => (
          <button
            key={it.id}
            onClick={() => onPick(it.view)}
            style={{
              width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
              border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--divider)',
            }}
          >
            <span style={{ display: 'flex', color: 'var(--text-muted)', marginTop: 2, flex: 'none' }}>
              <Icon name={it.ikon} size={16} />
            </span>
            <div style={{ lineHeight: 1.3, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{it.tittel}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.tekst}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export function NotificationBell({ setView }: { setView: (v: View) => void }) {
  const { count } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Varsel"
        style={{
          width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--surface-alt)',
          borderRadius: 12, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', position: 'relative',
        }}
      >
        <Icon name="bell" size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--danger)',
            borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center', lineHeight: '14px',
          }}>
            {count}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          onEmpty="Ingen varsel."
          onPick={(v) => { setView(v); setOpen(false); }}
        />
      )}
    </div>
  );
}

export function NotificationMenuItem({ setView, onNavigated }: { setView: (v: View) => void; onNavigated?: () => void }) {
  const { count } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: 'none', cursor: 'pointer',
          fontFamily: "'Geist'", fontSize: 13.5, fontWeight: 600, textAlign: 'left', borderRadius: 12,
          background: open ? 'var(--brand-soft)' : 'transparent', color: open ? 'var(--brand-strong)' : 'var(--text-secondary)',
        }}
      >
        <span style={{ width: 20, display: 'flex', justifyContent: 'center', flex: 'none' }}>
          <Icon name="bell" size={18} />
        </span>
        <span style={{ flex: 1 }}>Varsel</span>
        {count > 0 && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--danger)', borderRadius: 12, padding: '1px 7px', minWidth: 16, textAlign: 'center' }}>
            {count}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          onEmpty="Ingen varsel."
          onPick={(v) => { setView(v); setOpen(false); onNavigated?.(); }}
        />
      )}
    </div>
  );
}
