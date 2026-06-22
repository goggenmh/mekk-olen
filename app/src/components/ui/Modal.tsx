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
        position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth, boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--divider)' }}>
          {leftHeader ? (
            leftHeader
          ) : (
            <div style={{ lineHeight: 1.2 }}>
              <h2 style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 18 }}>{title}</h2>
              {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</div>}
            </div>
          )}
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', width: 30, height: 30, border: 'none', background: 'var(--bg)', borderRadius: 10, cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 15 }}>{children}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--divider)', background: 'var(--surface-alt)' }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-label)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle = {
  padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 11, background: 'var(--surface)',
  fontFamily: "'Geist'", fontSize: 14, color: 'var(--text)', width: '100%',
} as const;

export const monoInputStyle = { ...inputStyle, fontFamily: "'Geist Mono'" } as const;

export function CancelButton({ onClick, children = 'Avbryt' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ marginLeft: 'auto', padding: '10px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 11, fontFamily: "'Geist'", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

export function SaveButton({ onClick, children = 'Lagre' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 22px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 11, fontFamily: "'Geist'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

export function DeleteButton({ onClick, children = 'Slett' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 14px', background: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 11, fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}
