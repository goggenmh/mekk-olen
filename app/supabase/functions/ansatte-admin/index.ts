// Supabase Edge Function: ansatte-admin
//
// Creates / deactivates / reactivates Supabase Auth logins and resets PINs for
// employees. This MUST run server-side: it's the only place that touches the
// service-role key, which can never be shipped to the browser. The client
// (AnsatteContext.tsx) calls this via supabase.functions.invoke('ansatte-admin', ...).
//
// Deploy: paste this file's contents into Supabase Dashboard → Edge Functions →
// "ansatte-admin" → and click Deploy. See supabase/SETUP.md for the full steps.
//
// Authorization: only an active leiar (ansatte.leder = true, aktiv = true) may
// call this. We verify that server-side from the caller's JWT — never trust a
// client-supplied "I'm a leder" flag.

import { createClient } from 'jsr:@supabase/supabase-js@2';

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
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Mangler innlogging.' }, 401);

    const { data: callerData, error: callerErr } = await admin.auth.getUser(jwt);
    if (callerErr || !callerData?.user?.email) return json({ error: 'Ugyldig innlogging.' }, 401);

    const { data: callerAnsatt } = await admin
      .from('ansatte')
      .select('id, leder, aktiv')
      .eq('email', callerData.user.email)
      .maybeSingle();

    if (!callerAnsatt?.leder || !callerAnsatt?.aktiv) {
      return json({ error: 'Berre leiarar kan administrere ansatte.' }, 403);
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { id, navn, rolle, lonn, sats, farge, init, telefon, leder, password, email: customEmail } = body;
      if (!id || !navn || !password) return json({ error: 'Manglar id, navn eller passord.' }, 400);
      const email = customEmail || `${id}@mekk-olen.internal`;

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const { error: insertErr } = await admin.from('ansatte').insert({
        id, navn, rolle, lonn, sats, farge, init, telefon, leder: !!leder, email, aktiv: true,
      });
      if (insertErr) {
        // Roll back the auth user so we don't leave an orphaned login.
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: insertErr.message }, 400);
      }
      return json({ ok: true });
    }

    if (action === 'deactivate' || action === 'reactivate') {
      const { id } = body;
      const { data: target } = await admin.from('ansatte').select('email').eq('id', id).maybeSingle();
      if (!target) return json({ error: 'Fann ikkje ansatt.' }, 404);

      const { data: usersPage } = await admin.auth.admin.listUsers();
      const authUser = usersPage?.users.find((u) => u.email === target.email);
      if (authUser) {
        await admin.auth.admin.updateUserById(authUser.id, {
          ban_duration: action === 'deactivate' ? '876000h' : 'none',
        });
      }
      const { error: updErr } = await admin.from('ansatte').update({ aktiv: action === 'reactivate' }).eq('id', id);
      if (updErr) return json({ error: updErr.message }, 400);
      return json({ ok: true });
    }

    if (action === 'resetpin') {
      const { id, password } = body;
      const { data: target } = await admin.from('ansatte').select('email').eq('id', id).maybeSingle();
      if (!target) return json({ error: 'Fann ikkje ansatt.' }, 404);
      const { data: usersPage } = await admin.auth.admin.listUsers();
      const authUser = usersPage?.users.find((u) => u.email === target.email);
      if (!authUser) return json({ error: 'Fann ikkje innlogging for denne ansatte.' }, 404);
      const { error: pwErr } = await admin.auth.admin.updateUserById(authUser.id, { password });
      if (pwErr) return json({ error: pwErr.message }, 400);
      return json({ ok: true });
    }

    if (action === 'updateemail') {
      // Changes the address an employee's Auth login is registered under.
      // Must update both the Auth user and the ansatte.email column together —
      // they're required to always match, since AuthContext signs in with
      // ansatte.email. Editing ansatte.email directly in the Supabase table
      // editor (bypassing this) breaks login, since only the Auth side
      // would still point at the old address.
      const { id, email } = body;
      if (!id || !email) return json({ error: 'Manglar id eller e-post.' }, 400);
      const { data: target } = await admin.from('ansatte').select('email').eq('id', id).maybeSingle();
      if (!target) return json({ error: 'Fann ikkje ansatt.' }, 404);
      const { data: usersPage } = await admin.auth.admin.listUsers();
      const authUser = usersPage?.users.find((u) => u.email === target.email);
      if (!authUser) return json({ error: 'Fann ikkje innlogging for denne ansatte.' }, 404);
      const { error: emailErr } = await admin.auth.admin.updateUserById(authUser.id, { email, email_confirm: true });
      if (emailErr) return json({ error: emailErr.message }, 400);
      const { error: updErr } = await admin.from('ansatte').update({ email }).eq('id', id);
      if (updErr) return json({ error: updErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Ukjent handling.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Ukjent feil.' }, 500);
  }
});
