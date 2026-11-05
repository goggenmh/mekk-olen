import type { View } from './view';

// Førehandslasting av side-chunkar. Sidene blir lasta late (App.tsx), så første
// gong du opnar ei side ventar du litt medan chunken blir henta. Når du held
// peikaren over eller fokuserer eit menypunkt, startar vi henting av same chunk
// i bakgrunnen – då er sida som regel klar før du rekk å klikke. Vite/Rollup
// samlar begge import()-kalla til same chunk, så dette blir ikkje dobbeltlasta.
const PREFETCH: Partial<Record<View, () => Promise<unknown>>> = {
  ansatte: () => import('../components/Ansatte/Ansatte'),
  timeliste: () => import('../components/Timeliste/Timeliste'),
  ferie: () => import('../components/Ferie/FerieSide'),
  vaktplan: () => import('../components/Vaktplan/Vaktplan'),
  oppgaver: () => import('../components/Oppgaver/Oppgaver'),
  bestilling: () => import('../components/Bestillinger/Bestillinger'),
  utleige: () => import('../components/Utleige/Utleige'),
  lager: () => import('../components/Lager/Lager'),
  dokument: () => import('../components/Dokument/Dokument'),
  rapporter: () => import('../components/Rapporter/Rapporter'),
  innstillinger: () => import('../components/Innstillinger/Innstillinger'),
};

// Vi hentar kvar chunk berre éin gong; held styr på kva som alt er starta.
const starta = new Set<View>();

export const prefetchView = (v: View) => {
  if (starta.has(v)) return;
  const last = PREFETCH[v];
  if (!last) return;
  starta.add(v);
  // Stillheit om henting feilar – late import prøver på nytt ved reelt klikk.
  last().catch(() => starta.delete(v));
};
