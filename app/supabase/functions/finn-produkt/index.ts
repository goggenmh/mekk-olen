// Supabase Edge Function: finn-produkt  (EKSPERIMENTELL)
//
// Finn produktlenke + bilete ut frå ei bestilling, via Brave Search.
// Prioriterer mekk.no + varenr (mest presist); fell så tilbake til eit
// generelt nettsøk på leverandør + vare. Resultatet er eit FORSLAG som den
// tilsette må stadfeste.
//
// Krev løyndomen BRAVE_SEARCH_KEY. Utan han seier funksjonen tydeleg kva som
// manglar – han later ikkje som om søket verkar.
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

interface Treff { url: string; bilde: string | null; tittel: string | null }

async function brave(key: string, q: string): Promise<Treff | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch('https://api.search.brave.com/res/v1/web/search?count=3&country=no&q=' + encodeURIComponent(q), {
      signal: ctrl.signal,
      headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { web?: { results?: { url?: string; title?: string; thumbnail?: { src?: string } }[] } };
    const res = data.web?.results?.[0];
    if (!res?.url) return null;
    return { url: res.url, bilde: res.thumbnail?.src ?? null, tittel: res.title ?? null };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Berre POST.' }, 405);

  let vare = '', leverandor = '', varenr = '';
  try {
    const b = (await req.json()) as { vare?: string; leverandor?: string; varenr?: string };
    vare = String(b.vare || '').trim();
    leverandor = String(b.leverandor || '').trim();
    varenr = String(b.varenr || '').trim();
  } catch { return json({ error: 'Ugyldig body.' }, 400); }

  const mekkTerm = [varenr, vare].filter(Boolean).join(' ').trim();
  const webTerm = [leverandor, vare].filter(Boolean).join(' ').trim();
  if (mekkTerm.length < 2 && webTerm.length < 3) return json({ lenke: null, bilde: null });

  const key = Deno.env.get('BRAVE_SEARCH_KEY');
  if (!key) {
    return json({ lenke: null, bilde: null, merknad: 'Automatisk søk er ikkje sett opp: det krev ein søke-API-nøkkel (BRAVE_SEARCH_KEY).' });
  }

  // 1) Prøv mekk.no med varenr (+ vare) – mest presist.
  let treff: Treff | null = null;
  let kjelde: string | null = null;
  if (mekkTerm.length >= 2) {
    treff = await brave(key, 'site:mekk.no ' + mekkTerm);
    if (treff) kjelde = 'mekk.no';
  }
  // 2) Fall tilbake til generelt nettsøk på leverandør + vare.
  if (!treff && webTerm.length >= 3) {
    treff = await brave(key, webTerm);
    if (treff) kjelde = 'nettet';
  }
  if (!treff) return json({ lenke: null, bilde: null, merknad: 'Fann ingen treff.' });

  return json({ lenke: treff.url, bilde: treff.bilde, tittel: treff.tittel, kjelde });
});
