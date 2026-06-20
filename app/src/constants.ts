export type EmployeeId = 'sander' | 'georg' | 'christian';

export interface Employee {
  id: EmployeeId;
  navn: string;
  rolle: string;
  lonn: 'fast' | 'time';
  sats: number;
  farge: string;
  init: string;
  /** Fixed Supabase Auth identifier — see supabase/SETUP.md */
  email: string;
}

// Pay rates / roles are operational facts about the shop, not secrets — same as the
// original prototype, which hardcoded them in client code too. Only the PIN/password
// check happens server-side now (via Supabase Auth), not these values.
export const ANSATTE: Employee[] = [
  { id: 'sander', navn: 'Sander', rolle: 'Dagleg leiar', lonn: 'fast', sats: 0, farge: '#11788a', init: 'SA', email: 'sander@mekk-olen.internal' },
  { id: 'georg', navn: 'Georg', rolle: 'Selgar', lonn: 'time', sats: 164, farge: '#e08a1e', init: 'GE', email: 'georg@mekk-olen.internal' },
  { id: 'christian', navn: 'Christian', rolle: 'Selgar', lonn: 'time', sats: 133, farge: '#2f9e6f', init: 'CH', email: 'christian@mekk-olen.internal' },
];

export const findAnsatt = (id: string | null | undefined): Employee =>
  ANSATTE.find((a) => a.id === id) || { id: 'sander', navn: '', rolle: '', lonn: 'time', sats: 0, farge: '#999', init: '?', email: '' };

/** Only Sander (dagleg leiar) can approve hours and approve/decline shift swaps. */
export const canApprove = (id: EmployeeId | null | undefined): boolean => id === 'sander';

export const SKIFT_FARGE: Record<string, string> = {
  Formiddag: '#1597a8',
  Heildag: '#2f9e6f',
  Kveld: '#e08a1e',
  Laurdag: '#6a5acd',
};
export const SKIFT_VALG = ['Formiddag', 'Heildag', 'Kveld', 'Laurdag'];

export interface ShiftTemplateEntry {
  ansatt: EmployeeId;
  dag: string;
  start: string;
  slutt: string;
  skift: string;
}

export const SHIFT_TEMPLATE: ShiftTemplateEntry[] = [
  { ansatt: 'sander', dag: 'man', start: '09:00', slutt: '15:00', skift: 'Formiddag' },
  { ansatt: 'sander', dag: 'tir', start: '09:00', slutt: '15:00', skift: 'Formiddag' },
  { ansatt: 'sander', dag: 'ons', start: '09:00', slutt: '15:00', skift: 'Formiddag' },
  { ansatt: 'sander', dag: 'tor', start: '09:00', slutt: '15:00', skift: 'Formiddag' },
  { ansatt: 'sander', dag: 'fre', start: '09:00', slutt: '15:00', skift: 'Formiddag' },
  { ansatt: 'christian', dag: 'man', start: '09:00', slutt: '18:00', skift: 'Heildag' },
  { ansatt: 'christian', dag: 'ons', start: '09:00', slutt: '18:00', skift: 'Heildag' },
  { ansatt: 'christian', dag: 'lau', start: '09:00', slutt: '16:00', skift: 'Laurdag' },
  { ansatt: 'georg', dag: 'tir', start: '09:00', slutt: '18:00', skift: 'Heildag' },
  { ansatt: 'georg', dag: 'tor', start: '09:00', slutt: '18:00', skift: 'Heildag' },
  { ansatt: 'georg', dag: 'fre', start: '09:00', slutt: '18:00', skift: 'Kveld' },
];

export const FERIE_TYPE: Record<string, { fg: string; bg: string }> = {
  Ferie: { fg: '#11788a', bg: '#e7f6f8' },
  Fri: { fg: '#2f9e6f', bg: '#e8f5ee' },
  Kurs: { fg: '#b07b1a', bg: '#fdf2e0' },
  Sjukmeld: { fg: '#c0392b', bg: '#fbe9e4' },
};
export const FERIE_TYPER = ['Ferie', 'Fri', 'Kurs', 'Sjukmeld'] as const;

export const ORDER_FLOW = ['ny', 'tinga', 'komen', 'henta'] as const;
export type OrderStatus = (typeof ORDER_FLOW)[number];

export const ORDER_STATUS: Record<OrderStatus, { tekst: string; fg: string; bg: string; neste: string }> = {
  ny: { tekst: 'Ny', fg: '#6e7d88', bg: '#eef2f4', neste: 'Marker tinga' },
  tinga: { tekst: 'Tinga', fg: '#b07b1a', bg: '#fdf2e0', neste: 'Komen i butikk' },
  komen: { tekst: 'Komen', fg: '#11788a', bg: '#e7f6f8', neste: 'Marker henta' },
  henta: { tekst: 'Henta', fg: '#2f9e6f', bg: '#e8f5ee', neste: '' },
};

export const DOC_KAT: Record<string, { fg: string; bg: string; ikon: string }> = {
  HMS: { fg: '#c0392b', bg: '#fbe9e4', ikon: '🛟' },
  Rutine: { fg: '#11788a', bg: '#e7f6f8', ikon: '📋' },
  Avtale: { fg: '#6a5acd', bg: '#eee9fb', ikon: '📝' },
  Skjema: { fg: '#b07b1a', bg: '#fdf2e0', ikon: '🗂' },
  Anna: { fg: '#6e7d88', bg: '#eef2f4', ikon: '📄' },
};
export const DOC_KATEGORIER = ['HMS', 'Rutine', 'Avtale', 'Skjema', 'Anna'] as const;

export const DAGER_VAKTPLAN = [
  { key: 'man', kort: 'MÅN', open: '09–18' },
  { key: 'tir', kort: 'TYS', open: '09–18' },
  { key: 'ons', kort: 'ONS', open: '09–18' },
  { key: 'tor', kort: 'TOR', open: '09–18' },
  { key: 'fre', kort: 'FRE', open: '09–18' },
  { key: 'lau', kort: 'LAU', open: '09–16' },
];

export const PRIORITET = {
  høg: { bg: '#fbe9e4', fg: '#c0392b', tekst: 'Høg' },
  medium: { bg: '#fdf2e0', fg: '#b07b1a', tekst: 'Medium' },
  låg: { bg: '#eef0ee', fg: '#6b7368', tekst: 'Låg' },
} as const;
export type Prioritet = keyof typeof PRIORITET;
