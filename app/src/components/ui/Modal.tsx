import type { ReactNode } from 'react';

export function Modal({
  onClose,
  maxWidth = 400,
  title,
  subtitle,
  leftHeader,
  children,
  footer,
}: {
  onClose: () => void;
  maxWidth?: number;
  title?: string;
  subtitle?: string;
  leftHeader?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      className="no-print"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(12,36,54,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth, boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #eef2f4' }}>
          {leftHeader ? (
            leftHeader
          ) : (
            <div style={{ lineHeight: 1.2 }}>
              <h2 style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 18 }}>{title}</h2>
              {subtitle && <div style={{ fontSize: 13, color: '#7e93a0' }}>{subtitle}</div>}
            </div>
          )}
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', width: 30, height: 30, border: 'none', background: '#eef2f4', borderRadius: 7, cursor: 'pointer', fontSize: 16, color: '#566570' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 15 }}>{children}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px', borderTop: '1px solid #eef2f4', background: '#f7f9fb' }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6e7d88', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle = {
  padding: '9px 11px', border: '1px solid #d6dfe4', borderRadius: 8, background: '#fff',
  fontFamily: "'Barlow'", fontSize: 14, color: '#142029', width: '100%',
} as const;

export const monoInputStyle = { ...inputStyle, fontFamily: "'JetBrains Mono'" } as const;

export function CancelButton({ onClick, children = 'Avbryt' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ marginLeft: 'auto', padding: '10px 16px', background: '#fff', color: '#142029', border: '1px solid #d6dfe4', borderRadius: 8, fontFamily: "'Barlow'", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

export function SaveButton({ onClick, children = 'Lagre' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 22px', background: '#1597a8', color: '#fff', border: 'none', borderRadius: 8, fontFamily: "'Barlow'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

export function DeleteButton({ onClick, children = 'Slett' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 14px', background: '#fff', color: '#c0392b', border: '1px solid #ecc9c2', borderRadius: 8, fontFamily: "'Barlow'", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}
