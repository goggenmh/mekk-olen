// Enkelt, rammeverk-uavhengig toast-system: kall toast('...') kvar som helst.
export interface ToastItem { id: number; tekst: string }
type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  for (const l of listeners) l(items);
}

export function toast(tekst: string) {
  const id = nextId++;
  items = [...items, { id, tekst }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 3000);
}

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  l(items);
  return () => { listeners.delete(l); };
}
