// Delte input-stilar for modalane. I eiga fil (ingen komponentar) så
// react-refresh/HMR verkar reint for Modal-komponentfila.
export const inputStyle = {
  padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)',
  fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text)', width: '100%',
} as const;

export const monoInputStyle = { ...inputStyle, fontFamily: "'Geist Mono Variable'" } as const;
