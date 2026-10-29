export type EmployeeId = string;

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
  telefon: string;
  /** Leiar sees the admin panel + Ansatte-module and can always approve hours/bytte. */
  leder: boolean;
  /** Soft-delete flag — inactive employees are hidden from pickers but kept for history. */
  aktiv: boolean;
  /** Kva butikk den tilsette høyrer til (fleirbutikk). */
  butikk_id?: string;
  /** Konsern-admin kan sjå og styre alle butikkar. */
  konsern_admin?: boolean;
  /** Skatteform (berre synleg for leiarar, som satsen). Tom = ikkje registrert. */
  skattetype?: 'skattekort' | 'frikort' | null;
  /** Prosenttrekk frå skattekortet. */
  skatteprosent?: number | null;
  /** Frikortbeløpet for året (kr). */
  frikortgrense?: number | null;
  /** Feriepengesats i prosent (10,2 som standard). Privat som satsen. */
  feriepengesats?: number | null;
  /** Året dei to tidlegare-beløpa under gjeld for. */
  tidlegare_ar?: number | null;
  /** Løn frå MEKK i tidlegare_ar før appen (utan feriepengar). Tel for frikort og feriepengar. */
  tidlegare_mekk?: number | null;
  /** Anna skattbar inntekt i tidlegare_ar (andre arbeidsgivarar, utbetalte feriepengar). Berre frikort. */
  tidlegare_andre?: number | null;
  /** Feriedagar (virkedagar) per år. Standard 25. Ikkje privat. */
  feriedagar?: number | null;
}

export interface Butikk {
  id: string;
  namn: string;
  farge: string;
  aktiv: boolean;
}

// Seed data for the dynamic `ansatte` table (see supabase/schema.sql) and a
// fallback if that table hasn't loaded yet. The live employee list now comes
// from AnsatteContext / useAnsatte() — see that file for findAnsatt/isLeder.
export const DEFAULT_ANSATTE: Employee[] = [
  { id: 'sander', navn: 'Sander', rolle: 'Dagleg leiar', lonn: 'fast', sats: 0, farge: '#11788a', init: 'SA', email: 'sander@mekk-olen.internal', telefon: '', leder: true, aktiv: true },
  { id: 'georg', navn: 'Georg', rolle: 'Selgar', lonn: 'time', sats: 164, farge: '#e08a1e', init: 'GE', email: 'georg@mekk-olen.internal', telefon: '', leder: false, aktiv: true },
  { id: 'christian', navn: 'Christian', rolle: 'Selgar', lonn: 'time', sats: 133, farge: '#2f9e6f', init: 'CH', email: 'christian@mekk-olen.internal', telefon: '', leder: false, aktiv: true },
];

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
  Ferie: { fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)' },
  Fri: { fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)' },
  Kurs: { fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' },
  Sjukmeld: { fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' },
};
export const FERIE_TYPER = ['Ferie', 'Fri', 'Kurs', 'Sjukmeld'] as const;

// Fargar og ikon per ferie/fri-type — brukt på vaktplanen og i oversikta.
export const FERIE_STYL: Record<string, { fg: string; bg: string; kant: string; ikon: string }> = {
  Ferie: { fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)', kant: 'rgba(17,120,138,0.35)', ikon: 'sun' },
  Fri: { fg: 'var(--pill-lilla-fg)', bg: 'var(--pill-lilla-bg)', kant: 'rgba(90,75,138,0.3)', ikon: 'vaktplan' },
  Kurs: { fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)', kant: 'rgba(198,126,30,0.35)', ikon: 'dokument' },
  Sjukmeld: { fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)', kant: 'rgba(192,57,43,0.35)', ikon: 'alert' },
};

export const ORDER_FLOW = ['ny', 'tinga', 'komen', 'henta'] as const;
export type OrderStatus = (typeof ORDER_FLOW)[number];

export const ORDER_STATUS: Record<OrderStatus, { tekst: string; fg: string; bg: string; neste: string }> = {
  ny: { tekst: 'Ny', fg: 'var(--pill-gra-fg)', bg: 'var(--pill-gra-bg)', neste: 'Marker bestilt' },
  tinga: { tekst: 'Bestilt', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)', neste: 'Komen i butikk' },
  komen: { tekst: 'Komen', fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)', neste: 'Marker henta' },
  henta: { tekst: 'Henta', fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)', neste: '' },
};

export const DOC_KAT: Record<string, { fg: string; bg: string; ikon: string }> = {
  HMS: { fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)', ikon: 'HMS' },
  Rutine: { fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)', ikon: 'Rutine' },
  Avtale: { fg: 'var(--pill-lilla-fg)', bg: 'var(--pill-lilla-bg)', ikon: 'Avtale' },
  Skjema: { fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)', ikon: 'Skjema' },
  Anna: { fg: 'var(--pill-gra-fg)', bg: 'var(--pill-gra-bg)', ikon: 'Anna' },
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
  høg: { bg: 'var(--pill-raud-bg)', fg: 'var(--pill-raud-fg)', tekst: 'Høg' },
  medium: { bg: 'var(--pill-amber-bg)', fg: 'var(--pill-amber-fg)', tekst: 'Medium' },
  låg: { bg: 'var(--pill-gra-bg)', fg: 'var(--pill-gra-fg)', tekst: 'Låg' },
} as const;
export type Prioritet = keyof typeof PRIORITET;

// Kategoriar for oppgåver.
export const OPPGAVE_KAT: Record<string, { fg: string; bg: string }> = {
  Butikk: { fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)' },
  Lager: { fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' },
  Kampanje: { fg: 'var(--pill-lilla-fg)', bg: 'var(--pill-lilla-bg)' },
  Reklamasjon: { fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' },
  Anna: { fg: 'var(--pill-gra-fg)', bg: 'var(--pill-gra-bg)' },
};
export const OPPGAVE_KATEGORIAR = ['Butikk', 'Lager', 'Kampanje', 'Reklamasjon', 'Anna'] as const;

// Gjentaking for faste rutinar.
export const GJENTAK: Record<string, { tekst: string }> = {
  ingen: { tekst: 'Inga gjentaking' },
  dagleg: { tekst: 'Kvar dag' },
  vekevis: { tekst: 'Kvar veke' },
  manadleg: { tekst: 'Kvar månad' },
};
