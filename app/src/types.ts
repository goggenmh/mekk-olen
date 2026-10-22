import type { EmployeeId } from './constants';

export type EntryStatus = 'venter' | 'godkjent';

export interface TimeEntry {
  id: string;
  ansatt: EmployeeId;
  date: string;
  start: string;
  slutt: string;
  pause: number;
  status: EntryStatus;
}

export interface Shift {
  id: string;
  ansatt: EmployeeId;
  date: string;
  start: string;
  slutt: string;
  skift: string;
}

export type SwapStatus = 'pending' | 'godkjent' | 'avvist';

export interface ShiftSwap {
  id: string;
  shiftId: string;
  fra: EmployeeId;
  til: EmployeeId;
  dag: string;
  tid: string;
  status: SwapStatus;
}

export type FerieStatus = 'ventar' | 'godkjend' | 'avslatt';

export interface Ferie {
  id: string;
  ansatt: EmployeeId;
  type: string;
  tekst: string;
  fra: string | null;
  til: string | null;
  /** Søknader frå tilsette ventar til ein leiar har svart. */
  status: FerieStatus;
  /** Kommentar frå leiaren ved godkjenning/avslag. */
  svar: string;
  behandlaAv: EmployeeId | null;
  createdAt: string | null;
}

export interface SjekklistePunkt {
  tekst: string;
  ferdig: boolean;
}

export interface Task {
  id: string;
  tittel: string;
  detalj: string;
  prioritet: string;
  ansatt: EmployeeId | 'ufordelt';
  ferdig: boolean;
  frist: string | null;
  kategori: string;
  gjentak: string;
  sjekkliste: SjekklistePunkt[];
  /** Kan ikkje fullførast no; grunnen står i blokkertGrunn. */
  blokkert: boolean;
  blokkertGrunn: string;
  /** Blir sett av databasen (oppgaver-v2.sql). null på eldre oppgåver og rutineoppgåver. */
  opprettaAv: EmployeeId | null;
  opprettaAt: string | null;
  ferdigAv: EmployeeId | null;
  ferdigAt: string | null;
  /** Bestillinga oppgåva følgjer opp. */
  orderId: string | null;
  /** Rutinen som laga oppgåva automatisk. */
  rutineId: string | null;
}

/** Felta appen sjølv skriv på ei oppgåve (resten set databasen). */
export type TaskInput = Pick<Task, 'tittel' | 'detalj' | 'prioritet' | 'ansatt' | 'ferdig' | 'frist' | 'kategori' | 'gjentak' | 'sjekkliste'>
  & Partial<Pick<Task, 'blokkert' | 'blokkertGrunn' | 'orderId'>>
  & { id?: string };

/** Fast rutine som blir til ei oppgåve automatisk på rett dag. */
export interface Rutine {
  id: string;
  tittel: string;
  detalj: string;
  kategori: string;
  prioritet: string;
  /** Tilsett-id, 'ufordelt', 'opnar' (første vakt) eller 'stengjer' (siste vakt). */
  ansvar: string;
  /** ISO-vekedagar, 1 = måndag … 7 = søndag. */
  dagar: number[];
  /** Sett = kvar månad på denne dagen i staden for vekedagar. */
  manadsdag: number | null;
  sjekkliste: SjekklistePunkt[];
  aktiv: boolean;
}

export interface Order {
  id: string;
  kunde: string;
  telefon: string;
  vare: string;
  leverandor: string;
  varenr: string;
  lenke: string | null;
  dato: string;
  antal: number;
  status: string;
  varsla: string | null;
  /** Fritt notat (kjenneteikn, ønske o.l.). Tomt før bestilling-notat.sql er køyrd. */
  notat: string;
  /** Tilsett som la inn bestillinga (blir sett av databasen; null på eldre). */
  registrertAv?: string | null;
}

export interface Doc {
  id: string;
  tittel: string;
  kategori: string;
  notat: string;
  dato: string;
  fil_url: string | null;
  fil_namn: string | null;
}

/** Ein tilsett har stadfesta at hen har lese eit dokument. */
export interface Stadfesting {
  id: string;
  docId: string;
  ansatt: EmployeeId;
  stadfestaAt: string;
}

export interface Permission {
  ansatt: EmployeeId;
  kan_godkjenne: boolean;
}

export interface Melding {
  id: string;
  fra: EmployeeId;
  til: EmployeeId | null;
  tekst: string;
  created_at: string;
}

/** Ein rad i standardveka (malen for "fyll frå standardveke"). */
export interface StandardvekeEntry {
  id: string;
  ansatt: EmployeeId;
  dag: string; // 'man' | 'tir' | 'ons' | 'tor' | 'fre' | 'lau'
  start: string;
  slutt: string;
}

/** Ein dag ein ansatt har merka at dei ikkje kan jobbe (raud dag). */
export interface Unavailable {
  id: string;
  ansatt: EmployeeId;
  dato: string;
  grunn: string | null;
}
