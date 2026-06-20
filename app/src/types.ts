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

export interface Ferie {
  id: string;
  ansatt: EmployeeId;
  type: string;
  tekst: string;
}

export interface Task {
  id: string;
  tittel: string;
  detalj: string;
  prioritet: string;
  ansatt: EmployeeId | 'ufordelt';
}

export interface Order {
  id: string;
  kunde: string;
  telefon: string;
  vare: string;
  leverandor: string;
  varenr: string;
  dato: string;
  antal: number;
  status: string;
  varsla: string | null;
}

export interface Doc {
  id: string;
  tittel: string;
  kategori: string;
  notat: string;
  dato: string;
}
