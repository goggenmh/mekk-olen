export type View =
  | 'dashbord'
  | 'ansatte'
  | 'vaktplan'
  | 'timeliste'
  | 'oppgaver'
  | 'bestilling'
  | 'dokument'
  | 'rapporter'
  | 'innstillinger';

export const VIEWS: { key: View; label: string; ikon: string }[] = [
  { key: 'dashbord', label: 'Oversikt', ikon: 'dashbord' },
  { key: 'ansatte', label: 'Ansatte', ikon: 'ansatte' },
  { key: 'vaktplan', label: 'Vaktplan', ikon: 'vaktplan' },
  { key: 'timeliste', label: 'Timelister', ikon: 'timeliste' },
  { key: 'oppgaver', label: 'Oppgåver', ikon: 'oppgaver' },
  { key: 'bestilling', label: 'Bestillingar', ikon: 'bestilling' },
  { key: 'dokument', label: 'Dokumenter', ikon: 'dokument' },
  { key: 'rapporter', label: 'Rapporter', ikon: 'rapporter' },
  { key: 'innstillinger', label: 'Innstillingar', ikon: 'innstillinger' },
];

// Gruppering av menyen i sidemenyen. `seksjon: null` = ingen overskrift.
export const NAV_GROUPS: { seksjon: string | null; punkt: View[] }[] = [
  { seksjon: null, punkt: ['dashbord'] },
  { seksjon: 'Drift', punkt: ['vaktplan', 'timeliste', 'oppgaver'] },
  { seksjon: 'Butikk', punkt: ['bestilling', 'dokument'] },
  { seksjon: 'Analyse', punkt: ['rapporter', 'ansatte'] },
  { seksjon: null, punkt: ['innstillinger'] },
];
