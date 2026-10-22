// Supabase Edge Function: paaminning
//
// Påminningar om vakter, kalla av pg_cron kvart 5. minutt (sjå paaminning.sql):
//   morgon – kl. 08–10: «Du er på jobb i dag kl. …» (éi melding per person,
//            berre om vakta ikkje byrjar innan 30 min – då kjem «snart»)
//            Har personen oppgåver med frist i dag (eller forfalne), står det òg.
//   snart  – 30 min før vakta: «Vakta di byrjar kl. …»
// Dagleg leiar (leder = true), inaktive og dei med godkjend ferie/fri får ikkje.
//
// verify_jwt = false: funksjonen tek ingen inndata og sender berre det som
// er forfalle og ikkje sendt før (paaminning_sendt), så eit ekstra kall
// gjer ingen skade.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
// @ts-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Dato og minutt-på-døgnet akkurat no i Noreg (sommar-/vintertid). */
function osloNo() {
  const del = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { dato: `${del.year}-${del.month}-${del.day}`, min: Number(del.hour) * 60 + Number(del.minute) };
}

const tilMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };

interface Vakt { id: string; ansatt: string; date: string; start: string; slutt: string }
interface Melding { til: string; title: string; body: string; url: string; tag: string; vakter: string[]; type: 'morgon' | 'snart' }

/** Merk vaktene som sende; gir tilbake dei som ikkje alt var merka (vinn kappløp). */
async function krev(admin: SupabaseClient, ids: string[], type: string): Promise<Set<string>> {
  const { data, error } = await admin.from('paaminning_sendt')
    .upsert(ids.map((shift_id) => ({ shift_id, type })), { onConflict: 'shift_id,type', ignoreDuplicates: true })
    .select('shift_id');
  if (error) throw error;
  return new Set((data || []).map((r) => r.shift_id));
}

Deno.serve(async () => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  try {
    const no = osloNo();
    const [{ data: vakter }, { data: tilsette }, { data: ferie }] = await Promise.all([
      admin.from('shifts').select('id, ansatt, date, start, slutt').eq('date', no.dato),
      admin.from('ansatte').select('id, leder, aktiv'),
      admin.from('ferie').select('ansatt').eq('status', 'godkjend').lte('fra', no.dato).gte('til', no.dato),
    ]);
    const mottakar = new Set((tilsette || []).filter((a) => a.aktiv && !a.leder).map((a) => a.id));
    for (const f of ferie || []) mottakar.delete(f.ansatt);

    const aktuelle = ((vakter || []) as Vakt[])
      .filter((v) => mottakar.has(v.ansatt) && /^\d{1,2}:\d{2}$/.test(v.start) && tilMin(v.start) > no.min)
      .sort((a, b) => tilMin(a.start) - tilMin(b.start));
    const url = `/?vis=vaktplan&dato=${no.dato}`;
    const meldingar: Melding[] = [];

    // 30 min før.
    for (const v of aktuelle.filter((v) => tilMin(v.start) - no.min <= 30)) {
      meldingar.push({
        til: v.ansatt, type: 'snart', vakter: [v.id], url, tag: `snart-${v.id}`,
        title: 'Vakta byrjar snart', body: `Vakta di byrjar kl. ${v.start} (til ${v.slutt}).`,
      });
    }

    // Morgon: kl. 08–10, for vakter som ikkje alt får «snart»-varsel.
    if (no.min >= 8 * 60 && no.min < 10 * 60) {
      const perAnsatt = new Map<string, Vakt[]>();
      for (const v of aktuelle.filter((v) => tilMin(v.start) - no.min > 30)) {
        perAnsatt.set(v.ansatt, [...(perAnsatt.get(v.ansatt) || []), v]);
      }
      const { data: oppgaver } = perAnsatt.size
        ? await admin.from('tasks').select('ansatt').eq('ferdig', false).lte('frist', no.dato).in('ansatt', [...perAnsatt.keys()])
        : { data: [] };
      for (const [ansatt, vs] of perAnsatt) {
        const n = (oppgaver || []).filter((o) => o.ansatt === ansatt).length;
        const oppg = n ? ` Du har ${n} ${n === 1 ? 'oppgåve' : 'oppgåver'} som skal gjerast i dag.` : '';
        meldingar.push({
          til: ansatt, type: 'morgon', vakter: vs.map((v) => v.id), url, tag: `morgon-${no.dato}`,
          title: 'Du er på jobb i dag', body: `Vakt i dag kl. ${vs.map((v) => `${v.start}–${v.slutt}`).join(' og ')}.${oppg}`,
        });
      }
    }
    if (meldingar.length === 0) return json({ ok: true, sendt: 0 });

    const { data: n } = await admin.from('push_noklar').select('public_key, private_key').eq('id', 1).maybeSingle();
    if (!n) return json({ ok: true, sendt: 0, merknad: 'Ingen VAPID-nøklar enno.' });
    webpush.setVapidDetails('https://mekk-olen.vercel.app', n.public_key, n.private_key);

    let sendt = 0;
    for (const m of meldingar) {
      const nye = await krev(admin, m.vakter, m.type);
      if (nye.size === 0) continue;
      const { data: abonnement } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('ansatt', m.til);
      const payload = JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag });
      await Promise.all((abonnement || []).map(async (a) => {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload);
          sendt++;
        } catch (e) {
          const kode = (e as { statusCode?: number })?.statusCode;
          if (kode === 403 || kode === 404 || kode === 410) {
            await admin.from('push_subscriptions').delete().eq('id', a.id);
          }
        }
      }));
    }
    return json({ ok: true, sendt });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Ukjend feil.' }, 500);
  }
});
