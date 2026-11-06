// Personalisering per butikk: overstyrer dei to base-brand-token-ane heile
// designet byggjer på (--mekk-navy for toppstripe/struktur, --mekk-lime for
// knappar). Alt anna i fargesystemet refererer desse, så det heng framleis
// saman. null/udefinert = standard MEKK-tema.
export interface ButikkTema { navy?: string; lime?: string }

// Lys farge → mørk tekst, mørk farge → lys tekst (lesbar tekst på knappar).
export function erLys(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export function brukTema(tema: ButikkTema | null | undefined) {
  const s = document.documentElement.style;
  if (tema?.navy) s.setProperty('--mekk-navy', tema.navy);
  else s.removeProperty('--mekk-navy');
  if (tema?.lime) {
    s.setProperty('--mekk-lime', tema.lime);
    s.setProperty('--on-cta', erLys(tema.lime) ? '#1a1a1a' : '#ffffff');
  } else {
    s.removeProperty('--mekk-lime');
    s.removeProperty('--on-cta');
  }
}
