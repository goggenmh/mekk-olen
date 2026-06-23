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
