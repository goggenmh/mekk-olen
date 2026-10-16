// Supabase Edge Function: pin-login
//
// All PIN-innlogging går gjennom denne funksjonen:
//   * Tel feil forsøk per tilsett på servaren og låser kontoen i 15 minutt
//     etter 5 feil. Sperra kan ikkje omgåast frå nettlesaren.
//   * Det ekte Auth-passordet blir avleidd av PIN-en og ein hemmeleg nøkkel
//     (PIN_PEPPER) som berre finst her. Då nyttar det ikkje å prøve PIN-ar
//     direkte mot Supabase Auth.
//   * Overgang utan nye PIN-ar: har brukaren framleis det gamle passordet
//     (prefiks + PIN), loggar vi inn med det og byter stille til det nye.
//     Utan PIN_PEPPER blir berre det gamle passordet brukt (med sperre).
//
// verify_jwt = false: dette ER innlogginga, så kallaren har ingen økt enno.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAKS_FEIL = 5;
const SPERRE_MIN = 15;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** Nytt passord: HMAC-SHA256(PIN_PEPPER, "<ansatt-id>:<pin>"), base64url. */
async function v2Passord(pepper: string, ansattId: string, pin: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ansattId}:${pin}`)));
  return 'v2.' + btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Berre POST.' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  // Utan PIN_PEPPER køyrer funksjonen i overgangsmodus: berre det gamle
  // passordet blir prøvd (men framleis med sperre), og ingen blir flytta.
  const PEPPER = Deno.env.get('PIN_PEPPER');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  // Eigen klient per innlogging, så økter aldri blir delte mellom kall.
  const loggInn = (email: string, password: string) =>
    createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      .auth.signInWithPassword({ email, password });

  try {
    const { id, pin, legacy } = await req.json();
    if (typeof id !== 'string' || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return json({ error: 'Ugyldig førespurnad.' }, 400);
    }

    const { data: ansatt } = await admin.from('ansatte').select('id, email, aktiv').eq('id', id).maybeSingle();
    // Same svar for ukjend brukar som for feil PIN, så lista ikkje kan kartleggjast.
    if (!ansatt?.email) return json({ error: 'Feil PIN.', kode: 'feil_pin' }, 401);
    if (!ansatt.aktiv) return json({ error: 'Kontoen er deaktivert.', kode: 'deaktivert' }, 403);

    const { data: status } = await admin.from('innlogging_status').select('v2, feil, laast_til').eq('ansatt_id', id).maybeSingle();
    const laastTil = status?.laast_til ? new Date(status.laast_til).getTime() : 0;
    if (laastTil > Date.now()) {
      return json({ error: 'For mange feil forsøk.', kode: 'sperra', sekund: Math.ceil((laastTil - Date.now()) / 1000) }, 429);
    }

    const nytt = PEPPER ? await v2Passord(PEPPER, id, pin) : null;
    let res = nytt ? await loggInn(ansatt.email, nytt) : null;

    // Overgang: prøv det gamle passordet berre for brukarar som ikkje er flytta.
    // Det gamle passordet må ende på PIN-en, så klienten ikkje kan sende kva som helst.
    if ((!res || res.error) && !status?.v2 && typeof legacy === 'string' && legacy.endsWith(pin) && legacy.length <= 72) {
      const gammal = await loggInn(ansatt.email, legacy);
      if (!gammal.error && gammal.data.user && nytt) {
        const { error: oppdErr } = await admin.auth.admin.updateUserById(gammal.data.user.id, { password: nytt });
        if (!oppdErr) {
          await admin.from('innlogging_status').upsert({ ansatt_id: id, v2: true, feil: 0, laast_til: null });
          res = await loggInn(ansatt.email, nytt);
        } else {
          res = gammal; // Bytet feila – slepp brukaren inn likevel, prøv igjen neste gong.
        }
      } else {
        res = gammal;
      }
    }

    if (!res || res.error || !res.data.session) {
      const feil = (status?.feil ?? 0) + 1;
      const sperr = feil >= MAKS_FEIL;
      await admin.from('innlogging_status').upsert({
        ansatt_id: id,
        v2: status?.v2 ?? false,
        feil: sperr ? 0 : feil,
        laast_til: sperr ? new Date(Date.now() + SPERRE_MIN * 60_000).toISOString() : null,
      });
      if (sperr) return json({ error: 'For mange feil forsøk.', kode: 'sperra', sekund: SPERRE_MIN * 60 }, 429);
      return json({ error: 'Feil PIN.', kode: 'feil_pin', att: MAKS_FEIL - feil }, 401);
    }

    if (status?.feil || status?.laast_til) {
      await admin.from('innlogging_status').update({ feil: 0, laast_til: null }).eq('ansatt_id', id);
    }
    const { access_token, refresh_token } = res.data.session;
    return json({ access_token, refresh_token });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Ukjend feil.' }, 500);
  }
});
