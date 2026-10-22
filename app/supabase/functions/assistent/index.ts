// Supabase Edge Function: assistent
//
// Vare- og kundeassistent for dei tilsette, med Claude Haiku 5.5.
// Den tilsette spør kva ei vare er, korleis noko blir brukt, eller korleis
// ein kundespørsmål kan svarast – med tekst og/eller bilete av vara.
// Assistenten kan søkje på mekk.no for å finne faktiske produktsider.
//
// Tryggleik:
//   * Berre innlogga, aktive tilsette (JWT blir sjekka her).
//   * API-nøkkelen (ANTHROPIC_API_KEY) ligg som løyndom i Supabase og
//     forlèt aldri servaren.
//   * Kvar tilsett har eit dagleg tak (DAGLEG_TAK) på spørsmål.
//
// Svaret blir straumt som linjer med JSON (application/x-ndjson):
//   {"t":"tekst","d":"..."}        – tekstbit
//   {"t":"sok"}                   – assistenten søkjer på mekk.no
//   {"t":"kjelder","liste":[...]}  – lenker svaret byggjer på
//   {"t":"ferdig"}                 – ferdig
//   {"t":"feil","melding":"..."}   – noko gjekk gale

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.130.0';

const MODELL = 'claude-haiku-5-5';
const DAGLEG_TAK = 60;
const MAKS_MELDINGAR = 12;
// Base64 av eit bilete på rundt 4 MB. Appen skalerer bileta ned før dei blir sende.
const MAKS_BILETE = 5_500_000;

const SYSTEM = `Du er ein hjelpsam fagassistent for dei tilsette i MEKK Ølen, ein jernvarehandel (bil, båt, hjem, fritid og verktøy). Dei tilsette brukar deg i butikken for å:
- finne ut kva ei vare eller ein del er, og kva ho blir brukt til (ofte frå eit bilete),
- forklare skilnader mellom produkt, materiale og storleikar,
- få hjelp til å svare kundar på praktiske spørsmål ("kva treng eg for å …?").

Slik svarer du:
- Svar på norsk, i same målform som spørsmålet (nynorsk eller bokmål).
- Kort og praktisk, som ein erfaren kollega bak disken. Start med svaret, så detaljar. Bruk korte punktlister når det hjelper.
- Når du kjenner igjen noko frå eit bilete: sei kva du trur det er, kor sikker du er, og kva den tilsette kan sjekke (merking, mål, gjengetype o.l.).
- Søk på mekk.no når spørsmålet gjeld ei konkret vare, eit varemerke eller kva butikken fører. Vis til produktsida du fann.
- Oppgi aldri pris, lagerstatus eller kampanjar som fakta utan at det står på ei side du har funne. Sei då at det må sjekkast i kassasystemet eller på mekk.no.
- Ved tryggleik (gass, elektrisk, kjemikaliar, løft, motorsag o.l.): nemn det viktigaste tryggingsrådet, og vis til bruksanvisninga eller fagfolk der det trengst.
- Er du usikker, sei det. Gjett ikkje på artikkelnummer, mål eller tekniske data.
- Ikkje bruk emojiar.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface InnMelding { rolle: 'user' | 'assistant'; tekst: string; bilete?: { media_type: string; data: string } }

const BILETTYPAR = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Gjer meldingane frå appen om til Claude-meldingar, med grenser. */
function tilMeldingar(inn: unknown): Anthropic.MessageParam[] | string {
  if (!Array.isArray(inn) || inn.length === 0) return 'Ingen melding.';
  const siste = (inn as InnMelding[]).slice(-MAKS_MELDINGAR);
  const ut: Anthropic.MessageParam[] = [];
  for (const m of siste) {
    if (m?.rolle !== 'user' && m?.rolle !== 'assistant') return 'Ugyldig melding.';
    const tekst = String(m.tekst ?? '').slice(0, 4000);
    if (m.rolle === 'assistant') {
      if (tekst) ut.push({ role: 'assistant', content: tekst });
      continue;
    }
    const innhald: Anthropic.ContentBlockParam[] = [];
    if (m.bilete) {
      if (!BILETTYPAR.has(m.bilete.media_type) || typeof m.bilete.data !== 'string' || m.bilete.data.length > MAKS_BILETE) {
        return 'Biletet er for stort eller av feil type.';
      }
      innhald.push({ type: 'image', source: { type: 'base64', media_type: m.bilete.media_type as 'image/jpeg', data: m.bilete.data } });
    }
    innhald.push({ type: 'text', text: tekst || 'Kva er dette?' });
    ut.push({ role: 'user', content: innhald });
  }
  if (ut[0]?.role !== 'user') ut.shift();
  if (ut.length === 0 || ut[ut.length - 1].role !== 'user') return 'Siste melding må vere frå deg.';
  return ut;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Berre POST.' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Innlogga, aktiv tilsett.
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: brukar } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const email = brukar?.user?.email;
  if (!email) return json({ error: 'Ikkje innlogga.' }, 401);
  const { data: meg } = await admin.from('ansatte').select('id, aktiv, butikk_id').eq('email', email).maybeSingle();
  if (!meg?.aktiv) return json({ error: 'Ingen tilgang.' }, 403);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'Assistenten er ikkje sett opp enno (manglar API-nøkkel).' }, 503);

  let body: { meldingar?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Ugyldig førespurnad.' }, 400); }
  const meldingar = tilMeldingar(body.meldingar);
  if (typeof meldingar === 'string') return json({ error: meldingar }, 400);

  // Dagleg tak per tilsett (norsk dato).
  const idag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());
  const { data: tal, error: talFeil } = await admin.rpc('assistent_tel', { p_ansatt: meg.id, p_dato: idag });
  if (talFeil) return json({ error: 'Kunne ikkje registrere bruken.' }, 500);
  if ((tal as number) > DAGLEG_TAK) return json({ error: `Du har brukt opp dagens ${DAGLEG_TAK} spørsmål. Prøv igjen i morgon.` }, 429);

  const client = new Anthropic({ apiKey });
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      // Sider svaret siterer; viss ingen, sidene søket fann.
      const sitert = new Map<string, string>();
      const funne = new Map<string, string>();
      try {
        // Nettsøk kan pause ein lang tur (pause_turn): hald fram med same svar.
        for (let runde = 0; runde < 3; runde++) {
          const s = client.messages.stream({
            model: MODELL,
            max_tokens: 4000,
            output_config: { effort: 'low' },
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
            tools: [{
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: 3,
              allowed_domains: ['mekk.no'],
              user_location: { type: 'approximate', country: 'NO', city: 'Ølen', timezone: 'Europe/Oslo' },
            }],
            messages: meldingar,
          });
          for await (const ev of s) {
            if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') send({ t: 'tekst', d: ev.delta.text });
            if (ev.type === 'content_block_start' && ev.content_block.type === 'server_tool_use') send({ t: 'sok' });
          }
          const svar = await s.finalMessage();
          for (const b of svar.content) {
            if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
              for (const r of b.content) if (r.type === 'web_search_result') funne.set(r.url, r.title);
            }
            if (b.type === 'text') {
              for (const c of b.citations ?? []) if (c.type === 'web_search_result_location') sitert.set(c.url, c.title ?? c.url);
            }
          }
          if (svar.stop_reason === 'refusal') {
            send({ t: 'tekst', d: '\n\nEg kan ikkje hjelpe med dette spørsmålet.' });
            break;
          }
          if (svar.stop_reason !== 'pause_turn') break;
          meldingar.push({ role: 'assistant', content: svar.content });
        }
        const kjelder = sitert.size ? sitert : funne;
        if (kjelder.size) send({ t: 'kjelder', liste: [...kjelder].slice(0, 5).map(([url, tittel]) => ({ url, tittel })) });
        send({ t: 'ferdig' });
      } catch (e) {
        const melding = e instanceof Anthropic.RateLimitError ? 'Assistenten er oppteken akkurat no. Prøv igjen om litt.'
          : e instanceof Anthropic.APIError ? `Assistenten svarte med ein feil (${e.status}).`
          : 'Noko gjekk gale med assistenten.';
        send({ t: 'feil', melding });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
});
