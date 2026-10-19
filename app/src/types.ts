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
