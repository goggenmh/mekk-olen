// Supabase Edge Function: utleige-epost
//
// Sender e-postane som ligg i kø i utleige_epost (motteken førespurnad,
// stadfesting, endring, avbestilling og påminningar). Kalla av pg_cron
// kvart 5. minutt (sjå utleige.sql).
//
// Utan løyndomen RESEND_API_KEY gjer funksjonen ingenting: e-postane blir
// liggjande i kø (status «ventar») og blir sende når nøkkelen er lagd inn.
// Avsendar: UTLEIGE_EPOST_FRA, t.d. «MEKK Ølen <utleige@dittdomene.no>»
// (domenet må vere stadfesta hos Resend).
//
// verify_jwt = false: funksjonen tek ingen inndata og sender berre det som
// står i kø, så eit ekstra kall gjer ingen skade.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async () => {
  const nokkel = Deno.env.get('RESEND_API_KEY');
  const fra = Deno.env.get('UTLEIGE_EPOST_FRA');
  if (!nokkel || !fra) return json({ ok: true, sendt: 0, merknad: 'E-post er ikkje sett opp; e-postane ventar i kø.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: ko, error } = await admin.from('utleige_epost')
    .select('id, til, emne, tekst').eq('status', 'ventar').order('created_at').limit(25);
  if (error) return json({ error: error.message }, 500);

  let sendt = 0;
  for (const e of ko || []) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nokkel}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fra, to: [e.til], subject: e.emne, text: e.tekst }),
      });
      if (res.ok) {
        await admin.from('utleige_epost').update({ status: 'sendt', sendt_at: new Date().toISOString(), feil: null }).eq('id', e.id).eq('status', 'ventar');
        sendt++;
      } else {
        // 4xx (t.d. ugyldig adresse) blir ikkje prøvd igjen; 5xx/429 blir liggjande.
        const tekst = (await res.text()).slice(0, 500);
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          await admin.from('utleige_epost').update({ status: 'feil', feil: `${res.status}: ${tekst}` }).eq('id', e.id);
        }
      }
    } catch (err) {
      await admin.from('utleige_epost').update({ feil: String(err).slice(0, 500) }).eq('id', e.id);
    }
  }
  return json({ ok: true, sendt });
});
