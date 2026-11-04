import { useEffect, useRef, type ReactNode } from 'react';

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
  // Tilgjengelegheit: Escape lukkar, fokus blir fanga i dialogen (Tab syklar),
  // og fokus går tilbake til det som opna modalen når han lukkar. Respekterer
  // autoFocus-felt (flyttar ikkje fokus viss noko inne alt har det).
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const forrigeFokus = document.activeElement as HTMLElement | null;
    const fokuserbare = () => Array.from(
      el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    ).filter((x) => x.offsetParent !== null);
    if (!el.contains(document.activeElement)) (fokuserbare()[0] || el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = fokuserbare();
      if (f.length === 0) { e.preventDefault(); el.focus(); return; }
      const fyrst = f[0];
      const sist = f[f.length - 1];
      if (e.shiftKey && document.activeElement === fyrst) { e.preventDefault(); sist.focus(); }
      else if (!e.shiftKey && document.activeElement === sist) { e.preventDefault(); fyrst.focus(); }
    };
    el.addEventListener('keydown', onKey);
    return () => { el.removeEventListener('keydown', onKey); forrigeFokus?.focus?.(); };
  }, [onClose]);

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || subtitle || 'Dialog'}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 'var(--r)', width: '100%', maxWidth, maxHeight: 'calc(100vh - 48px)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', outline: 'none' }}
      >
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--divider)' }}>
          {leftHeader ? (
            leftHeader
          ) : (
            <div style={{ lineHeight: 1.2 }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{title}</h2>
              {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</div>}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            style={{ marginLeft: 'auto', width: 30, height: 30, border: 'none', background: 'var(--bg)', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 15 }}>{children}</div>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--divider)', background: 'var(--surface-alt)' }}>
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
  padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)',
  fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text)', width: '100%',
} as const;

export const monoInputStyle = { ...inputStyle, fontFamily: "'Geist Mono Variable'" } as const;

export function CancelButton({ onClick, children = 'Avbryt' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ marginLeft: 'auto', padding: '10px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

export function SaveButton({ onClick, children = 'Lagre' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} className="knapp-gronn" style={{ padding: '10px 22px', fontSize: 14 }}>
      {children}
    </button>
  );
}

export function DeleteButton({ onClick, children = 'Slett' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 14px', background: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}
