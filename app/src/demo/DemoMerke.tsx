// Lite merke i hjørnet av demo-fila, så ingen trur det er den ekte appen.
export function DemoMerke() {
  return (
    <div
      className="no-print demo-merke"
      role="note"
      style={{
        position: 'fixed', right: 14, zIndex: 100, pointerEvents: 'none',
        background: 'var(--accent)', color: 'var(--on-brand)', borderRadius: 999, padding: '6px 14px',
        fontSize: 12, fontWeight: 700, boxShadow: '0 6px 18px rgba(0,0,0,0.18)', maxWidth: 'calc(100vw - 28px)',
      }}
    >
      Demo med testdata · alle PIN-kodar fungerer · endringar blir ikkje lagra
    </div>
  );
}
