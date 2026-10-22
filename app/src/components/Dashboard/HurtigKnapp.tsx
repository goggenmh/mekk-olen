import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

export interface Hurtighandling<K extends string> { key: K; ikon: string; tekst: string }

/**
 * Flytande «+»-knapp nede til høgre med hurtighandlingane (registrer timar,
 * ny oppgåve …), så oversikta får plass til det viktige. På mobil ligg han
 * over botnmenyen.
 */
export function HurtigKnapp<K extends string>({ handlingar, onVel, isMobile }: {
  handlingar: Hurtighandling<K>[];
  onVel: (k: K) => void;
  isMobile: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Lukk ved klikk utanfor eller Escape.
  useEffect(() => {
    if (!open) return;
    const klikk = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const tast = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', klikk);
    document.addEventListener('keydown', tast);
    return () => { document.removeEventListener('mousedown', klikk); document.removeEventListener('keydown', tast); };
  }, [open]);

  return (
    <div
      ref={ref}
      className="no-print"
      style={{
        position: 'fixed', right: isMobile ? 16 : 28, zIndex: 40,
        bottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 28,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}
    >
      {open && handlingar.map((h, i) => (
        <button
          key={h.key}
          onClick={() => { setOpen(false); onVel(h.key); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 12px', cursor: 'pointer',
            background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 999,
            boxShadow: '0 8px 24px rgba(10, 35, 53, 0.18)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
            animation: `toastIn 0.14s ease ${i * 0.03}s both`,
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: i === 0 ? 'var(--cta)' : 'var(--brand-soft)', color: i === 0 ? 'var(--on-cta)' : 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={h.ikon} size={16} />
          </span>
          {h.tekst}
        </button>
      ))}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Lukk hurtighandlingar' : 'Hurtighandlingar'}
        aria-expanded={open}
        title="Hurtighandlingar"
        style={{
          width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--cta)', color: 'var(--on-cta)', boxShadow: '0 10px 28px rgba(10, 35, 53, 0.28)',
          fontSize: 30, fontWeight: 400, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s ease',
        }}
      >
        +
      </button>
    </div>
  );
}
