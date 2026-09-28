// Trygg lenke-sanitering. Slepp berre gjennom http(s)-URL-ar, slik at
// «javascript:», «data:», «vbscript:» o.l. aldri kan køyre kode når nokon
// klikkar på ei lenke som stammar frå brukar-/databaseinnhald.
export function safeHref(url: string | null | undefined): string {
  if (!url) return '#';
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return '#';
}
