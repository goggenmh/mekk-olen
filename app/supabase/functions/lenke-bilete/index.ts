// Supabase Edge Function: lenke-bilete
//
// Hentar produktbiletet (og:image o.l.) frå ei produktlenke, så ei bestilling
// kan vise eit bilete av varen. Tek { url } og returnerer { bilde: string|null }.
//
// verify_jwt = true: berre innlogga tilsette kan kalle han. Funksjonen hentar
// berre offentlege nettsider og returnerer berre ein bilet-URL – han lagrar
// ingenting sjølv (appen lagrar resultatet på bestillinga).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Enkel SSRF-vakt: berre http/https, og ikkje lokale/private vertar.
function tryggVert(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (h === '::1' || h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return false;
  return true;
}

// Plukkar ut beste bilet-kandidaten frå <head>.
function finnBilete(html: string, base: string): string | null {
  const m = (re: RegExp) => { const x = html.match(re); return x ? x[1] : null; };
  const kandidat =
    m(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    m(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    m(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
    m(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i) ||
    m(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (!kandidat) return null;
  try { return new URL(kandidat, base).href; } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Berre POST.' }, 405);

  let url: string;
  try { url = String(((await req.json()) as { url?: unknown }).url || '').trim(); }
  catch { return json({ error: 'Ugyldig body.' }, 400); }
  if (!url) return json({ bilde: null });
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let u: URL;
  try { u = new URL(url); } catch { return json({ bilde: null }); }
  if (!tryggVert(u)) return json({ bilde: null });

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(u.href, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MEKK-bestilling/1.0)', Accept: 'text/html' },
    });
    clearTimeout(t);
    if (!res.ok) return json({ bilde: null });
    if (!/text\/html/i.test(res.headers.get('content-type') || '')) return json({ bilde: null });
    // Les berre starten av dokumentet (<head> ber og:image); maks ~512 kB.
    const buf = new Uint8Array(await res.arrayBuffer());
    const html = new TextDecoder('utf-8').decode(buf.slice(0, 512 * 1024));
    return json({ bilde: finnBilete(html, u.href) });
  } catch {
    return json({ bilde: null });
  }
});
