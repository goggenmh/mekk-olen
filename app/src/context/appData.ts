import { createContext, useContext } from 'react';
import type { EmployeeId } from '../constants';
import type { Doc, Ferie, LedigVakt, Melding, Order, Permission, Rutine, Shift, ShiftSwap, Stadfesting, Task, TaskInput, TimeEntry, Unavailable, StandardvekeEntry } from '../types';

// Kontrakta for app-dataene og handlingane. Sjølve provideren ligg i
// AppDataContext.tsx; konteksten og hooken ligg her (utan komponentar) så
// react-refresh (HMR) verkar reint for provider-fila.
export interface AppData {
  loading: boolean;
  error: string | null;
  entries: TimeEntry[];
  shifts: Shift[];
  swaps: ShiftSwap[];
  ferie: Ferie[];
  tasks: Task[];
  orders: Order[];
  docs: Doc[];
  stadfestingar: Stadfesting[];
  stadfestDoc: (docId: string) => Promise<void>;
  permissions: Permission[];
  meldinger: Melding[];
  unavailable: Unavailable[];
  saveUnavailable: (ansatt: EmployeeId, dato: string, grunn: string | null) => Promise<void>;
  removeUnavailable: (id: string) => Promise<void>;
  /** Merk fleire dagar på ein gong (fra–til). `gamle` = rader som blir erstatta (endring av periode). */
  saveUnavailablePeriode: (ansatt: EmployeeId, fra: string, til: string, grunn: string | null, gamle?: Unavailable[]) => Promise<void>;
  removeUnavailableMange: (ids: string[]) => Promise<void>;
  refreshAll: () => Promise<void>;

  canApprove: (ansatt: EmployeeId | null | undefined) => boolean;
  setKanGodkjenne: (ansatt: EmployeeId, kan: boolean) => Promise<void>;

  sendMelding: (fra: EmployeeId, til: EmployeeId | null, tekst: string) => Promise<void>;
  deleteMelding: (id: string) => Promise<void>;

  saveEntry: (entry: Omit<TimeEntry, 'id'> & { id?: string }) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  approveEmployeeEntries: (ansatt: EmployeeId, dates: string[]) => Promise<void>;

  saveShift: (shift: Omit<Shift, 'id'> & { id?: string }) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  moveShiftDate: (id: string, date: string) => Promise<void>;

  // Vaktbørs (ledige vakter).
  ledigeVakter: LedigVakt[];
  leggUtLedigVakt: (v: { date: string; start: string; slutt: string; skift: string; grunn: string | null; opprettaAv: EmployeeId }) => Promise<void>;
  taLedigVakt: (id: string, ansatt: EmployeeId) => Promise<void>;
  angreTaLedigVakt: (id: string) => Promise<void>;
  godkjennLedigVakt: (id: string) => Promise<void>;
  slettLedigVakt: (id: string) => Promise<void>;
  standardveke: StandardvekeEntry[];
  saveStandardveke: (entries: Omit<StandardvekeEntry, 'id'>[]) => Promise<void>;
  applyStandardveke: (weekStart: string) => Promise<void>;
  kopierVeke: (fraMandag: string, tilMandag: string) => Promise<void>;
  /** Slett alle vaktene i veka (man–lau). */
  slettVeke: (mandag: string) => Promise<void>;

  createSwap: (swap: Omit<ShiftSwap, 'id' | 'status'>) => Promise<void>;
  approveSwap: (id: string) => Promise<void>;
  declineSwap: (id: string) => Promise<void>;

  saveFerie: (f: Pick<Ferie, 'ansatt' | 'type' | 'tekst' | 'fra' | 'til'> & { id?: string; status?: Ferie['status'] }) => Promise<void>;
  behandleFerie: (id: string, status: 'godkjend' | 'avslatt', svar: string) => Promise<void>;
  deleteFerie: (id: string) => Promise<void>;

  saveTask: (t: TaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, ansatt: EmployeeId | 'ufordelt') => Promise<void>;
  completeTask: (task: Task) => Promise<void>;
  reopenTask: (task: Task) => Promise<void>;
  blockTask: (task: Task, grunn: string) => Promise<void>;
  unblockTask: (task: Task) => Promise<void>;
  rutinar: Rutine[];
  /** Aktive utleigereservasjonar (berre status og tider) for varsel og teljarar. */
  utleige: { status: string; start: string; slutt: string }[];
  saveRutine: (r: Omit<Rutine, 'id'> & { id?: string }) => Promise<void>;
  deleteRutine: (id: string) => Promise<void>;

  saveOrder: (o: Omit<Order, 'id'> & { id?: string }) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  /** Hentar produktbilete frå lenka (edge function) og lagrar det på bestillinga. */
  resolveOrderBilete: (id: string, lenke: string | null, overskriv?: boolean) => Promise<void>;
  advanceOrder: (id: string, nextStatus: string) => Promise<void>;
  markOrderVarsla: (id: string, date: string) => Promise<void>;

  saveDoc: (d: Omit<Doc, 'id'> & { id?: string }) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  uploadDocFile: (file: File) => Promise<{ url: string; namn: string }>;
  docFileUrl: (filUrl: string | null) => Promise<string | null>;
}

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
