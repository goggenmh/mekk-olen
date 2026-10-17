import { supabase } from '../supabaseClient';

// Web Push: kvar tilsett skrur varsel på/av for si eiga eining i
// Innstillingar. Nøkkelparet og utsendinga ligg i edge-funksjonen send-push.

export const pushStotta = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** iPhone/iPad støttar berre push når appen er lagt til på heimeskjermen. */
export const trengHeimeskjerm = () => {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installert = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !installert;
};

export function registrerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function base64UrlTilBytes(b64: string) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hentOffentlegNokkel(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('send-push', { body: { type: 'nokkel' } });
  if (error || !data?.public_key) throw new Error('Fekk ikkje kontakt med varslingstenesta.');
  return data.public_key as string;
}

export async function hentAbonnement() {
  if (!pushStotta()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function skruPaVarsel() {
  if (!pushStotta()) throw new Error('Varsel er ikkje støtta i denne nettlesaren.');
  const lov = await Notification.requestPermission();
  if (lov !== 'granted') throw new Error('Du må tillate varsel i nettlesaren for å skru dette på.');
  const nokkel = await hentOffentlegNokkel();
  const reg = await navigator.serviceWorker.ready;
  // Eit gammalt abonnement kan høyre til eit anna nøkkelpar; byt det ut.
  const gammalt = await reg.pushManager.getSubscription();
  if (gammalt) await gammalt.unsubscribe();
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlTilBytes(nokkel) });
  const j = sub.toJSON();
  const { error } = await supabase.rpc('registrer_push', {
    p_endpoint: j.endpoint!, p_p256dh: j.keys!.p256dh, p_auth: j.keys!.auth,
  });
  if (error) {
    await sub.unsubscribe().catch(() => {});
    throw new Error('Kunne ikkje lagre varsel-innstillinga.');
  }
}

export async function skruAvVarsel() {
  const sub = await hentAbonnement();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export type Hending =
  | { type: 'ny_vakt'; shift_ids: string[] }
  | { type: 'bytteonske'; swap_id: string }
  | { type: 'bytte_svar'; swap_id: string }
  | { type: 'timar_godkjent'; entry_ids: string[] };

/**
 * Varsle om ei hending. Servaren finn sjølv ut kven som skal ha varsel og
 * kva det skal stå. Varsel er eit tillegg: feil her skal aldri stoppe den
 * eigentlege handlinga (lagre vakt, godkjenne timar osv.).
 */
export function varsle(hending: Hending) {
  supabase.functions.invoke('send-push', { body: hending }).catch(() => {});
}
