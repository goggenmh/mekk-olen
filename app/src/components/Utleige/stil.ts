import type { CSSProperties } from 'react';

export const kortStil: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-card)', padding: '14px 16px' };
export const kortLabel: CSSProperties = { fontSize: 11.5, fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--kort-label)', marginBottom: 10 };
export const knapp = (primar = false): CSSProperties => ({
  padding: '8px 13px', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
  border: primar ? 'none' : '1px solid var(--border)', background: primar ? 'var(--brand-strong)' : 'var(--surface)', color: primar ? 'var(--on-brand)' : 'var(--text)',
});
