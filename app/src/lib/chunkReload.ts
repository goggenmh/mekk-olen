// Hjelparar for ErrorBoundary: kjenne att ein mislukka dynamisk import (gammal
// chunk etter deploy) og styre éi trygg oppfrisking utan evig loop. Ligg i eiga
// fil (ingen komponentar) så react-refresh/HMR verkar reint for komponenten.

const CHUNK_FEIL = /dynamically imported module|importing a module script failed|chunkloaderror|failed to fetch dynamically|error loading dynamically imported module|module script failed/i;
export const RELOAD_NOKKEL = 'mekk-chunk-reload';

export function erChunkFeil(e: unknown): boolean {
  const m = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return CHUNK_FEIL.test(m);
}

/** Nullstiller reload-vakta når appen har køyrt ei lita stund utan feil, så ein
 *  seinare deploy kan utløyse éi ny oppfrisking. Kallast éin gong frå main. */
export function planleggNullstillReloadVakt() {
  setTimeout(() => { try { sessionStorage.removeItem(RELOAD_NOKKEL); } catch { /* privat modus */ } }, 5000);
}
