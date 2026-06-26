import { supabase } from '../supabaseClient';
import type { EmployeeId } from '../constants';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function getPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(ansatt: EmployeeId) {
  if (!pushSupported()) throw new Error('Push-varsel er ikkje støtta i denne nettlesaren.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Du må godta varsel-tillatinga for å skru dette på.');

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
  });
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    ansatt,
    endpoint: json.endpoint!,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
  }, { onConflict: 'endpoint' });
  if (error) throw error;
}

export async function unsubscribeFromPush() {
  const sub = await getPushSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function sendPush(ansattIds: EmployeeId[], title: string, body: string) {
  if (ansattIds.length === 0) return;
  try {
    await supabase.functions.invoke('send-push', { body: { ansatt_ids: ansattIds, title, body } });
  } catch {
    // Push is a best-effort nice-to-have — never let a failed notification
    // block the underlying action (saving a shift, approving hours, etc).
  }
}
