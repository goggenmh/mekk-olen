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
  { key: 'dashbord', label: 'Oversikt', ikon: '🏠' },
  { key: 'ansatte', label: 'Ansatte', ikon: '👥' },
  { key: 'vaktplan', label: 'Vaktplan', ikon: '📅' },
  { key: 'timeliste', label: 'Timelister', ikon: '⏱' },
  { key: 'oppgaver', label: 'Oppgåver', ikon: '✅' },
  { key: 'bestilling', label: 'Bestillingar', ikon: '📦' },
  { key: 'dokument', label: 'Dokumenter', ikon: '📄' },
  { key: 'rapporter', label: 'Rapporter', ikon: '📈' },
  { key: 'innstillinger', label: 'Innstillingar', ikon: '⚙️' },
];
