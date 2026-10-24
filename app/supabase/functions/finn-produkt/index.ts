// Supabase Edge Function: finn-produkt  (EKSPERIMENTELL)
//
// Finn produktlenke + bilete ut frå ei bestilling, via Brave Search.
// Prioriterer mekk.no + varenr (mest presist); fell så tilbake til eit
// generelt nettsøk på leverandør + vare. Hentar produktbiletet frå sjølve
// produktsida (og:image) når søket ikkje gir eit bilete. Resultatet er eit
// FORSLAG som den tilsette må stadfeste.
//
// Krev løyndomen BRAVE_SEARCH_KEY. Utan han seier funksjonen tydeleg kva som
// manglar. verify_jwt = true.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function tryggVert(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (h === '::1' || h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return false;
  return true;
}

function finnBilete(html: string, base: string): string | null {
  const m = (re: RegExp) => { const x = html.match(re); return x ? x[1] : null; };
  const kandidat =
    m(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    m(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    m(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
    m(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (!kandidat) return null;
  try { return new URL(kandidat, base).href; } catch { return null; }
}

// Hentar og:image frå ei produktside (best effort).
async function sidebilete(href: string): Promise<string | null> {
  try {
    const u = new URL(href);
    if (!tryggVert(u)) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(u.href, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MEKK-bestilling/1.0)', Accept: 'text/html' },
    });
    clearTimeout(t);
    if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') || '')) return null;
    const html = new TextDecoder('utf-8').decode(new Uint8Array(await res.arrayBuffer()).slice(0, 512 * 1024));
    return finnBilete(html, u.href);
  } catch { return null; }
}

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

  let treff: Treff | null = null;
  let kjelde: string | null = null;
  if (mekkTerm.length >= 2) {
    treff = await brave(key, 'site:mekk.no ' + mekkTerm);
    if (treff) kjelde = 'mekk.no';
  }
  if (!treff && webTerm.length >= 3) {
    treff = await brave(key, webTerm);
    if (treff) kjelde = 'nettet';
  }
  if (!treff) return json({ lenke: null, bilde: null, merknad: 'Fann ingen treff.' });

  // Prøv å hente det ekte produktbiletet frå sida; fall tilbake til søke-miniatyren.
  const ogBilete = await sidebilete(treff.url);
  return json({ lenke: treff.url, bilde: ogBilete ?? treff.bilde, tittel: treff.tittel, kjelde });
});
