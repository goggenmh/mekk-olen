// Supabase Edge Function: finn-produkt  (EKSPERIMENTELL)
//
// Prøver å finne ei produktlenke + bilete ut frå varenamn + leverandør, ved
// hjelp av eit søke-API (Brave Search). Resultatet er eit FORSLAG som den
// tilsette må stadfeste – fritekstsøk kan peike på feil produkt.
//
// Krev løyndomen BRAVE_SEARCH_KEY (gratis nivå hos Brave). Utan han gjer
// funksjonen ingenting, men seier tydeleg kva som manglar – han later ikkje
// som om søket verkar.
//
// verify_jwt = true: berre innlogga tilsette kan kalle han.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Berre POST.' }, 405);

  let vare = '', leverandor = '';
  try {
    const b = (await req.json()) as { vare?: string; leverandor?: string };
    vare = String(b.vare || '').trim();
    leverandor = String(b.leverandor || '').trim();
  } catch { return json({ error: 'Ugyldig body.' }, 400); }
  const sok = [leverandor, vare].filter(Boolean).join(' ').trim();
  if (sok.length < 3) return json({ lenke: null, bilde: null });

  const key = Deno.env.get('BRAVE_SEARCH_KEY');
  if (!key) {
    return json({ lenke: null, bilde: null, merknad: 'Automatisk søk er ikkje sett opp: det krev ein søke-API-nøkkel (BRAVE_SEARCH_KEY).' });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch('https://api.search.brave.com/res/v1/web/search?count=3&country=no&q=' + encodeURIComponent(sok), {
      signal: ctrl.signal,
      headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
    });
    clearTimeout(t);
    if (!r.ok) return json({ lenke: null, bilde: null, merknad: 'Søket svara ikkje (' + r.status + ').' });
    const data = (await r.json()) as { web?: { results?: { url?: string; title?: string; thumbnail?: { src?: string } }[] } };
    const res = data.web?.results?.[0];
    if (!res?.url) return json({ lenke: null, bilde: null, merknad: 'Fann ingen treff.' });
    return json({ lenke: res.url, bilde: res.thumbnail?.src ?? null, tittel: res.title ?? null });
  } catch {
    return json({ lenke: null, bilde: null, merknad: 'Søket feila.' });
  }
});
