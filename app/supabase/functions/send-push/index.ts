// Supabase Edge Function: send-push
//
// Sends a Web Push notification to one or more employees' subscribed
// devices. Called from the client (see src/lib/push.ts) right after an
// event the recipient should know about — a new shift, a swap request, an
// approval, etc. This MUST run server-side: sending a real push requires
// signing with the VAPID private key, which can never reach browser code.
//
// Deploy: paste this file's contents into Supabase Dashboard → Edge Functions →
// "send-push" → and click Deploy. See supabase/SETUP.md for VAPID setup.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@mekk-olen.no';

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json({ error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY er ikkje konfigurert som secrets.' }, 500);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { ansatt_ids, title, body, url } = await req.json();
    if (!Array.isArray(ansatt_ids) || ansatt_ids.length === 0 || !title) {
      return json({ error: 'Manglar ansatt_ids eller title.' }, 400);
    }

    const { data: subs, error: subsErr } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('ansatt', ansatt_ids);
    if (subsErr) return json({ error: subsErr.message }, 400);

    const payload = JSON.stringify({ title, body: body || '', url: url || '/' });

    await Promise.all((subs || []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (e) {
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (uninstalled, expired) — clean it up.
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }));

    return json({ ok: true, sent: subs?.length || 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Ukjent feil.' }, 500);
  }
});
