export type View = 'dashbord' | 'timeliste' | 'vaktplan' | 'oppgaver' | 'bestilling' | 'dokument';

export const VIEWS: { key: View; label: string }[] = [
  { key: 'dashbord', label: 'Dashbord' },
  { key: 'timeliste', label: 'Timeliste' },
  { key: 'vaktplan', label: 'Vaktplan' },
  { key: 'oppgaver', label: 'Oppgåver' },
  { key: 'bestilling', label: 'Bestillingar' },
  { key: 'dokument', label: 'Dokument' },
];
