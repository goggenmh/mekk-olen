import type { Employee } from '../constants';

export type View =
  | 'dashbord'
  | 'ansatte'
  | 'vaktplan'
  | 'ferie'
  | 'timeliste'
  | 'oppgaver'
  | 'bestilling'
  | 'dokument'
  | 'utleige'
  | 'rapporter'
  | 'innstillinger';

/** `sti` = adressa i nettlesaren, så tilbake-knappen og oppdatering verkar.
 *  `berreLeiar` = sida viser løn/tilgangsstyring og er berre for leiarar. */
export const VIEWS: { key: View; label: string; ikon: string; sti: string; berreLeiar?: boolean }[] = [
  { key: 'dashbord', label: 'Oversikt', ikon: 'dashbord', sti: '/' },
  { key: 'ansatte', label: 'Tilsette', ikon: 'ansatte', sti: '/tilsette', berreLeiar: true },
  { key: 'vaktplan', label: 'Vaktplan', ikon: 'vaktplan', sti: '/vaktplan' },
  { key: 'ferie', label: 'Ferie & fri', ikon: 'sun', sti: '/ferie' },
  { key: 'timeliste', label: 'Timelister', ikon: 'timeliste', sti: '/timelister' },
  { key: 'oppgaver', label: 'Oppgåver', ikon: 'oppgaver', sti: '/oppgaver' },
  { key: 'bestilling', label: 'Bestillingar', ikon: 'bestilling', sti: '/bestillingar' },
  { key: 'dokument', label: 'Dokument', ikon: 'dokument', sti: '/dokument' },
  // Kundesida ligg på /utleige (utan innlogging); administrasjonen her.
  { key: 'utleige', label: 'Utleige', ikon: 'utleige', sti: '/admin/utleige' },
  { key: 'rapporter', label: 'Rapportar', ikon: 'rapporter', sti: '/rapportar', berreLeiar: true },
  { key: 'innstillinger', label: 'Innstillingar', ikon: 'innstillinger', sti: '/innstillingar' },
];

// Gruppering av menyen i sidemenyen. `seksjon: null` = ingen overskrift.
export const NAV_GROUPS: { seksjon: string | null; punkt: View[] }[] = [
  { seksjon: null, punkt: ['dashbord'] },
  { seksjon: 'Drift', punkt: ['vaktplan', 'timeliste', 'oppgaver', 'ferie'] },
  { seksjon: 'Butikk', punkt: ['bestilling', 'utleige', 'dokument'] },
  { seksjon: 'Analyse', punkt: ['rapporter', 'ansatte'] },
  { seksjon: null, punkt: ['innstillinger'] },
];

/** Leiarar (og konsern-admin) ser løn, rapportar og tilsett-styring. */
export const erLeiar = (u: Pick<Employee, 'leder' | 'konsern_admin'> | null | undefined) =>
  !!u && (u.leder || !!u.konsern_admin);

export const harTilgang = (v: View, u: Pick<Employee, 'leder' | 'konsern_admin'> | null | undefined) =>
  !VIEWS.find((x) => x.key === v)?.berreLeiar || erLeiar(u);

export const stiFor = (v: View) => VIEWS.find((x) => x.key === v)?.sti ?? '/';

/** Demo-fila (npm run build:demo) blir opna som ei lokal fil, der adressa ikkje
 *  kan endrast. Der ligg sida i #-delen i staden: mekk-olen-demo.html#/vaktplan. */
export const DEMO = import.meta.env.MODE === 'demo';

export const lesSti = () => (DEMO ? window.location.hash.slice(1) || '/' : window.location.pathname);

export function skrivSti(sti: string, erstatt = false) {
  if (lesSti() === sti) return;
  if (DEMO) {
    if (erstatt) window.history.replaceState(null, '', `#${sti}`);
    else window.location.hash = sti;
  } else if (erstatt) window.history.replaceState(null, '', sti);
  else window.history.pushState(null, '', sti);
}

/** Finn sida ut frå adressa; ukjende adresser går til oversikta. */
export const viewFraSti = (sti: string): View => {
  const reinsa = sti.replace(/\/+$/, '') || '/';
  return VIEWS.find((x) => x.sti === reinsa)?.key ?? 'dashbord';
};
