// Enkelt, rammeverk-uavhengig toast-system: kall toast('...') kvar som helst.
// type 'feil' blir vist raudt og står lenger, så brukaren rekk å lese det.
export type ToastType = 'ok' | 'feil';
export interface ToastItem { id: number; tekst: string; type: ToastType }
type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  for (const l of listeners) l(items);
}

export function toast(tekst: string, type: ToastType = 'ok') {
  const id = nextId++;
  items = [...items, { id, tekst, type }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, type === 'feil' ? 7000 : 3000);
}

/**
 * Lagringsfunksjonane kastar feil når databasen seier nei (manglande nett,
 * manglande tilgang o.l.). Fangar alle slike som ingen andre har teke hand om,
 * så brukaren alltid får vite at endringa ikkje vart lagra.
 */
export function visUhandterteFeil() {
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | undefined;
    const melding = r?.message || String(e.reason ?? '');
    const nett = /fetch|network|failed to fetch/i.test(melding);
    toast(nett
      ? 'Ingen kontakt med servaren. Endringa vart ikkje lagra – prøv igjen.'
      : `Noko gjekk gale, og endringa vart ikkje lagra.${melding ? ` (${melding.slice(0, 80)})` : ''}`, 'feil');
  });
}

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  l(items);
  return () => { listeners.delete(l); };
}
