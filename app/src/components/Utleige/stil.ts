import type { CSSProperties } from 'react';

export const kortStil: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-card)', padding: '14px 16px' };
export const kortLabel: CSSProperties = { fontSize: 11.5, fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--kort-label)', marginBottom: 10 };
// Primærhandlingar (Godkjenn, Registrer utlevering/retur …) får mekk.no-stilen:
// kvit botn med turkis kant. Nøytrale val (Avbryt, Avslå) held ei roleg grå kant.
export const knapp = (primar = false): CSSProperties => ({
  padding: '8px 13px', borderRadius: 'var(--r)', fontSize: 13, fontWeight: primar ? 800 : 700, cursor: 'pointer', whiteSpace: 'nowrap',
  background: primar ? 'var(--knapp-teal-bg)' : 'var(--surface)',
  border: primar ? '1.5px solid var(--knapp-teal-kant)' : '1px solid var(--border)',
  color: primar ? 'var(--knapp-teal-fg)' : 'var(--text-secondary)',
});
