/**
 * «Velkomen, Georg» i om lag eitt sekund rett etter rett PIN, før oversikta.
 * Same marine flate som innlogginga, så overgangen blir roleg.
 */
export function Velkomst({ namn }: { namn: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
        background: 'radial-gradient(900px 500px at 50% -8%, rgba(93, 203, 204, 0.22), transparent 60%), linear-gradient(165deg, #0a2335 0%, #0e2c42 55%, #0a2335 100%)',
        color: '#ffffff', fontFamily: 'var(--font-sans)', animation: 'velkomstUt 1.25s ease forwards',
      }}
    >
      <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--mekk-lime)', color: 'var(--mekk-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 900, animation: 'toastIn 0.25s ease' }}>✓</div>
      <div style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900, letterSpacing: '-0.01em', animation: 'toastIn 0.3s ease' }}>Velkomen, {namn}</div>
    </div>
  );
}
