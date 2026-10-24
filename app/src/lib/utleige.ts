// Felles for utleige: typar, statusar og formatering. Reglane (ledigheit,
// overlapp, pris) ligg i databasen (supabase/utleige.sql); her er berre
// det appen treng for å vise dei.

export interface UtleigeProdukt {
  id: string;
  namn: string;
  beskriving: string;
  kategori: string;
  bilete_url: string | null;
  dogn_pris: number;
  halvdag_pris: number | null;
  helg_pris: number | null;
  gebyr: number;
  depositum: number;
  tilbehor: string[];
  aktiv: boolean;
  sortering: number;
}

export type EiningStatus = 'tilgjengeleg' | 'kontroll' | 'vedlikehald' | 'ikkje_tilgjengeleg';
export interface UtleigeEining { id: string; produkt_id: string; kode: string; status: EiningStatus; notat: string }

export interface UtleigeKunde { id: string; namn: string; telefon: string; epost: string; notat: string; created_at: string }

export type ResStatus = 'ny' | 'stadfesta' | 'klar' | 'utleigd' | 'forseinka' | 'returnert' | 'kontroll' | 'avbestilt' | 'avslatt';
export interface ReturSjekk { tilbehor: boolean; manglar: string[]; rein: boolean; skade: boolean; skildring: string }
export interface UtleigeReservasjon {
  id: string;
  nummer: number;
  produkt_id: string;
  eining_id: string;
  kunde_id: string;
  start: string;
  slutt: string;
  status: ResStatus;
  pris_leige: number;
  gebyr: number;
  depositum: number;
  pris_total: number;
  kunde_melding: string;
  internt_notat: string;
  retur_sjekk: ReturSjekk | null;
  oppgave_id: string | null;
  utlevert_at: string | null;
  utlevert_av: string | null;
  returnert_at: string | null;
  returnert_av: string | null;
  created_at: string;
  /** Bilete tekne ved utlevering og retur (URL-ar i storage-bøtta `utleige`). */
  bilete?: { utlevert?: string[]; retur?: string[] } | null;
  /** Ønskt ny returtid kunden har bedt om på Mi side (null = ingen førespurnad). */
  forleng_til?: string | null;
  /** Samlebestilling: reservasjonar med same gruppe_id vart bestilte i lag. */
  gruppe_id?: string | null;
}

export type SperreGrunn = 'vedlikehald' | 'reparasjon' | 'klargjering';
export interface UtleigeSperre { id: string; eining_id: string; start: string; slutt: string | null; grunn: SperreGrunn; notat: string; oppgave_id: string | null }

export interface UtleigeInnstillingar {
  butikk_id: string;
  offentleg: boolean;
  vilkar: string;
  hente_tid: string;
  retur_tid: string;
  maks_dagar: number;
  /** Timar ei ubehandla «ny»-førespurnad held av eininga før ho går ut automatisk. */
  svarfrist_timar: number;
  /** Timar før hentetid kunden sjølv kan avbestille på Mi side. */
  avbestillingsfrist_timar: number;
  kontakt_telefon: string;
  kontakt_epost: string;
}

export interface PrisSvar { modell: 'dogn' | 'helg' | 'halvdag'; dagar: number; timar: number; leige: number; gebyr: number; depositum: number; total: number; ledige?: number }

/** Reservasjonar som held eininga opptatt (same liste som i databasen). */
export const AKTIVE: ResStatus[] = ['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka'];

export const RES_STATUS: Record<ResStatus, { tekst: string; fg: string; bg: string; farge: string }> = {
  ny: { tekst: 'Ny førespurnad', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)', farge: '#e0a526' },
  stadfesta: { tekst: 'Stadfesta', fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)', farge: '#1a7275' },
  klar: { tekst: 'Klar for henting', fg: 'var(--pill-lilla-fg)', bg: 'var(--pill-lilla-bg)', farge: '#6a49c4' },
  utleigd: { tekst: 'Utleigd', fg: '#ffffff', bg: 'var(--mekk-navy)', farge: '#0a2335' },
  forseinka: { tekst: 'Forseinka', fg: '#ffffff', bg: 'var(--danger)', farge: '#c0392b' },
  returnert: { tekst: 'Returnert', fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)', farge: '#2f9e6f' },
  kontroll: { tekst: 'Kontroll etter retur', fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)', farge: '#b3261e' },
  avbestilt: { tekst: 'Avbestilt', fg: 'var(--pill-gra-fg)', bg: 'var(--pill-gra-bg)', farge: '#93a1ab' },
  avslatt: { tekst: 'Avslått', fg: 'var(--pill-gra-fg)', bg: 'var(--pill-gra-bg)', farge: '#93a1ab' },
};

export type VistEiningStatus = EiningStatus | 'reservert' | 'utleigd';
export const EINING_STATUS: Record<VistEiningStatus, { tekst: string; fg: string; bg: string }> = {
  tilgjengeleg: { tekst: 'Tilgjengeleg', fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)' },
  reservert: { tekst: 'Reservert', fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)' },
  utleigd: { tekst: 'Utleigd', fg: '#ffffff', bg: 'var(--mekk-navy)' },
  kontroll: { tekst: 'Til kontroll / klargjering', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' },
  vedlikehald: { tekst: 'Vedlikehald', fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' },
  ikkje_tilgjengeleg: { tekst: 'Ikkje tilgjengeleg', fg: 'var(--pill-gra-fg)', bg: 'var(--pill-gra-bg)' },
};

export const SPERRE_GRUNN: Record<SperreGrunn, string> = { vedlikehald: 'Vedlikehald', reparasjon: 'Reparasjon', klargjering: 'Klargjering' };

/** Status slik ho blir vist: manuell status først, elles ut frå reservasjonane no. */
export function einingStatusNo(e: UtleigeEining, res: UtleigeReservasjon[], no = new Date()): VistEiningStatus {
  if (e.status !== 'tilgjengeleg') return e.status;
  const t = no.getTime();
  const mine = res.filter((r) => r.eining_id === e.id && AKTIVE.includes(r.status));
  if (mine.some((r) => r.status === 'utleigd' || r.status === 'forseinka')) return 'utleigd';
  if (mine.some((r) => new Date(r.start).getTime() <= t + 24 * 3600 * 1000 && new Date(r.slutt).getTime() > t)) return 'reservert';
  return 'tilgjengeleg';
}

export const kr = (n: number | null | undefined) =>
  `kr ${(n ?? 0).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** «tys 21.10. kl. 09:00» */
export function tidKort(iso: string) {
  const d = new Date(iso);
  const dag = ['søn', 'mån', 'tys', 'ons', 'tor', 'fre', 'lau'][d.getDay()];
  return `${dag} ${d.getDate()}.${d.getMonth() + 1}. kl. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Lokal dato + klokkeslett → ISO-tid (med tidssona til nettlesaren). */
export const tilIso = (dato: string, tid: string) => new Date(`${dato}T${tid || '00:00'}`).toISOString();

/** ISO → «ÅÅÅÅ-MM-DD» og «HH:MM» i lokal tid (for skjemafelt). */
export function fraIso(iso: string) {
  const d = new Date(iso);
  return { dato: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, tid: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export const nr = (r: Pick<UtleigeReservasjon, 'nummer'>) => `U-${r.nummer}`;

/** Sant når feilen kjem av ei utgått/manglande økt (kallet gjekk ut som «anon»). */
export function erOktaFeil(e: unknown): boolean {
  const m = (e as { message?: string })?.message || '';
  const kode = (e as { code?: string })?.code;
  return kode === '42501' || kode === 'PGRST301' || /permission denied|JWT|jwt expired/i.test(m);
}

/** Gjer databasefeil om til ei forståeleg melding. */
export function feilTekst(e: unknown): string {
  const m = (e as { message?: string; code?: string })?.message || '';
  const kode = (e as { code?: string })?.code;
  if (kode === '23P01' || /utleige_ingen_overlapp/.test(m)) return 'Eininga er alt reservert i denne perioden.';
  if (kode === '23503') return 'Kan ikkje slettast fordi det finst reservasjonar. Skjul utstyret i staden.';
  if (kode === '23505') return 'Koden er alt i bruk. Vel ein annan.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Fekk ikkje kontakt med serveren. Sjekk nettet og prøv igjen.';
  if (erOktaFeil(e)) return 'Økta er utgått. Logg inn på nytt for å sjå utleige.';
  return m || 'Noko gjekk gale.';
}
