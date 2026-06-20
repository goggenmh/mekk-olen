export function Pill({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: fg,
        background: bg,
        padding: '3px 9px',
        borderRadius: 6,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}
