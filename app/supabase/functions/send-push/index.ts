// Supabase Edge Function: send-push
//
// Sender Web Push-varsel til tilsette når noko skjer som angår dei:
//   ny_vakt         – nye vakter (eller ei vakt som er flytta til deg)
//   bytteonske      – nokon vil bytte vakt med deg (leiarane får òg varsel)
//   bytte_svar      – vaktbytet ditt er godkjent eller avvist
//   timar_godkjent  – timane dine er godkjende
//
// Tryggleik: klienten seier berre KVA som skjedde (id-ar). Mottakarar og
// tekst blir henta frå databasen her, avgrensa til butikken til den som
// kallar. Ingen kan sende eigne meldingar eller varsle andre butikkar.
//
// VAPID-nøkkelparet blir laga her første gong det trengst og lagra i
// push_noklar (berre service_role). Den private nøkkelen forlèt aldri
// servaren; appen hentar den offentlege med { type: 'nokkel' }.
//
// verify_jwt = false: 'nokkel' må kunne hentast før innlogging. Alle andre
// typar krev ei gyldig økt, som blir sjekka her.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
// @ts-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function hentNoklar(admin: SupabaseClient): Promise<{ publicKey: string; privateKey: string }> {
  const { data, error } = await admin.from('push_noklar').select('public_key, private_key').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (data) return { publicKey: data.public_key, privateKey: data.private_key };
  const ny = webpush.generateVAPIDKeys();
  // Kjem to kall samtidig, vinn det første; begge brukar det som vart lagra.
  await admin.from('push_noklar').upsert(
    { id: 1, public_key: ny.publicKey, private_key: ny.privateKey },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  const { data: lagra, error: lesFeil } = await admin.from('push_noklar').select('public_key, private_key').eq('id', 1).single();
  if (lesFeil) throw lesFeil;
  return { publicKey: lagra.public_key, privateKey: lagra.private_key };
}

const DAGAR = ['søndag', 'måndag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag'];

/** «2026-10-17» → «laurdag 17.10.» (eigne dagnamn: servaren har ikkje alltid nynorsk språkdata) */
function datoTekst(dato: string) {
  const d = new Date(`${dato}T12:00:00Z`);
  return `${DAGAR[d.getUTCDay()]} ${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
}

const idListe = (v: unknown, maks: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, maks) : [];

// url: kva side appen opnar på når ein trykkjer på varselet.
interface Melding { til: string[]; title: string; body: string; url: string }

// Opnar sida på veka/månaden hendinga gjeld (dato = ÅÅÅÅ-MM-DD).
const vaktplan = (dato?: string | null) => `/?vis=vaktplan${dato ? `&dato=${dato}` : ''}`;
const timeliste = (dato?: string | null) => `/?vis=timeliste${dato ? `&dato=${dato}` : ''}`;
const tidlegast = (datoar: string[]) => [...datoar].sort()[0];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Berre POST.' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json();
    const type = body?.type;
    const noklar = await hentNoklar(admin);
    if (type === 'nokkel') return json({ public_key: noklar.publicKey });

    // Alle andre typar: krev ein innlogga, aktiv tilsett med butikk.
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: brukar } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
    const email = brukar?.user?.email;
    if (!email) return json({ error: 'Ikkje innlogga.' }, 401);
    const { data: meg } = await admin.from('ansatte').select('id, navn, butikk_id, aktiv').eq('email', email).maybeSingle();
    if (!meg?.aktiv || !meg.butikk_id) return json({ error: 'Ingen tilgang.' }, 403);

    const meldingar: Melding[] = [];
    const ikkjeMeg = (ids: string[]) => [...new Set(ids)].filter((id) => id && id !== meg.id);

    if (type === 'ny_vakt') {
      const { data: vakter } = await admin.from('shifts').select('ansatt, date, start, slutt')
        .in('id', idListe(body.shift_ids, 300)).eq('butikk_id', meg.butikk_id);
      const perAnsatt = new Map<string, { date: string; start: string; slutt: string }[]>();
      for (const v of vakter || []) {
        if (v.ansatt === meg.id) continue;
        perAnsatt.set(v.ansatt, [...(perAnsatt.get(v.ansatt) || []), v]);
      }
      for (const [ansatt, vs] of perAnsatt) {
        const url = vaktplan(tidlegast(vs.map((v) => v.date)));
        meldingar.push(vs.length === 1
          ? { til: [ansatt], title: 'Ny vakt', body: `Du har fått ei vakt ${datoTekst(vs[0].date)} kl. ${vs[0].start}–${vs[0].slutt}.`, url }
          : { til: [ansatt], title: 'Vaktplanen er oppdatert', body: `Du har ${vs.length} vakter i den oppdaterte vaktplanen.`, url });
      }
    } else if (type === 'bytteonske' || type === 'bytte_svar') {
      const { data: s } = await admin.from('shift_swaps').select('fra, til, dag, tid, status, shift_id')
        .eq('id', String(body.swap_id || '')).eq('butikk_id', meg.butikk_id).maybeSingle();
      const { data: vakt } = s?.shift_id
        ? await admin.from('shifts').select('date').eq('id', s.shift_id).maybeSingle()
        : { data: null };
      const url = vaktplan(vakt?.date);
      if (s && type === 'bytteonske' && s.status === 'pending' && s.fra === meg.id) {
        const { data: leiarar } = await admin.from('ansatte').select('id')
          .eq('butikk_id', meg.butikk_id).eq('leder', true).eq('aktiv', true);
        meldingar.push({
          til: ikkjeMeg([s.til, ...(leiarar || []).map((l) => l.id)]),
          title: 'Bytteønske',
          body: `${meg.navn} vil bytte vakt ${s.dag} ${s.tid}.`,
          url,
        });
      } else if (s && type === 'bytte_svar' && s.status === 'godkjent') {
        meldingar.push({ til: ikkjeMeg([s.fra, s.til]), title: 'Vaktbyte godkjent', body: `Vaktbytet ${s.dag} ${s.tid} er godkjent.`, url });
      } else if (s && type === 'bytte_svar' && s.status === 'avvist') {
        meldingar.push({ til: ikkjeMeg([s.fra]), title: 'Vaktbyte avvist', body: `Vaktbytet ${s.dag} ${s.tid} vart ikkje godkjent.`, url });
      }
    } else if (type === 'timar_godkjent') {
      const { data: timar } = await admin.from('time_entries').select('ansatt, date')
        .in('id', idListe(body.entry_ids, 500)).eq('butikk_id', meg.butikk_id).eq('status', 'godkjent');
      for (const ansatt of ikkjeMeg((timar || []).map((t) => t.ansatt))) {
        const datoar = (timar || []).filter((t) => t.ansatt === ansatt).map((t) => t.date);
        meldingar.push({ til: [ansatt], title: 'Timar godkjende', body: 'Timane dine er no godkjende.', url: timeliste(tidlegast(datoar)) });
      }
    } else {
      return json({ error: 'Ukjend type.' }, 400);
    }

    webpush.setVapidDetails('https://mekk-olen.vercel.app', noklar.publicKey, noklar.privateKey);
    let sendt = 0;
    for (const m of meldingar) {
      if (m.til.length === 0) continue;
      const { data: abonnement } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('ansatt', m.til);
      const payload = JSON.stringify({ title: m.title, body: m.body, url: m.url });
      await Promise.all((abonnement || []).map(async (a) => {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload);
          sendt++;
        } catch (e) {
          // Eininga finst ikkje lenger, eller abonnementet høyrer til eit
          // anna nøkkelpar – det kan aldri nåast, så rydd det bort.
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
