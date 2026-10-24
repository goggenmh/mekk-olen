import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { varsle } from '../lib/push';
import type { EmployeeId } from '../constants';
import { parseDate, ymd, today, addDays, DAG_IDX, skiftFraTid } from '../lib/dates';
import { toast } from '../lib/toast';
import { storeOrd, storFyrste } from '../lib/tekst';
import { useAnsatte } from './AnsatteContext';
import type { Doc, Ferie, Melding, Order, Permission, Rutine, Shift, ShiftSwap, Stadfesting, Task, TaskInput, TimeEntry, Unavailable, StandardvekeEntry } from '../types';

// Neste forfallsdato for ei gjentakande oppgåve.
const nesteFrist = (frist: string | null, gjentak: string): string | null => {
  const d = parseDate(frist || today());
  if (gjentak === 'dagleg') d.setDate(d.getDate() + 1);
  else if (gjentak === 'vekevis') d.setDate(d.getDate() + 7);
  else if (gjentak === 'manadleg') d.setMonth(d.getMonth() + 1);
  else return null;
  return ymd(d);
};

interface AppData {
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
  standardveke: StandardvekeEntry[];
  saveStandardveke: (entries: Omit<StandardvekeEntry, 'id'>[]) => Promise<void>;
  applyStandardveke: (weekStart: string) => Promise<void>;
  kopierVeke: (fraMandag: string, tilMandag: string) => Promise<void>;

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

const AppDataContext = createContext<AppData | null>(null);

const mapEntry = (r: any): TimeEntry => ({ id: r.id, ansatt: r.ansatt, date: r.date, start: r.start, slutt: r.slutt, pause: r.pause, status: r.status, auto: !!r.auto });
const mapShift = (r: any): Shift => ({ id: r.id, ansatt: r.ansatt, date: r.date, start: r.start, slutt: r.slutt, skift: r.skift });
const mapSwap = (r: any): ShiftSwap => ({ id: r.id, shiftId: r.shift_id, fra: r.fra, til: r.til, dag: r.dag, tid: r.tid, status: r.status });
const mapFerie = (r: any): Ferie => ({ id: r.id, ansatt: r.ansatt, type: r.type, tekst: r.tekst ?? '', fra: r.fra ?? null, til: r.til ?? null, status: r.status ?? 'godkjend', svar: r.svar ?? '', behandlaAv: r.behandla_av ?? null, createdAt: r.created_at ?? null });
const mapUnavail = (r: any): Unavailable => ({ id: r.id, ansatt: r.ansatt, dato: r.dato, grunn: r.grunn ?? null });
const mapStandard = (r: any): StandardvekeEntry => ({ id: r.id, ansatt: r.ansatt, dag: r.dag, start: r.start, slutt: r.slutt });
const mapTask = (r: any): Task => ({
  id: r.id, tittel: r.tittel, detalj: r.detalj, prioritet: r.prioritet, ansatt: r.ansatt, ferdig: r.ferdig, frist: r.frist ?? null, kategori: r.kategori ?? 'Anna', gjentak: r.gjentak ?? 'ingen', sjekkliste: Array.isArray(r.sjekkliste) ? r.sjekkliste : [],
  blokkert: !!r.blokkert, blokkertGrunn: r.blokkert_grunn ?? '', opprettaAv: r.oppretta_av ?? null, opprettaAt: r.oppretta_at ?? null,
  ferdigAv: r.ferdig_av ?? null, ferdigAt: r.ferdig_at ?? null, orderId: r.order_id ?? null, rutineId: r.rutine_id ?? null,
});
const mapRutine = (r: any): Rutine => ({ id: r.id, tittel: r.tittel, detalj: r.detalj ?? '', kategori: r.kategori ?? 'Butikk', prioritet: r.prioritet ?? 'medium', ansvar: r.ansvar ?? 'ufordelt', dagar: Array.isArray(r.dagar) ? r.dagar : [], manadsdag: r.manadsdag ?? null, sjekkliste: Array.isArray(r.sjekkliste) ? r.sjekkliste : [], aktiv: r.aktiv !== false });
// Kolonnene frå oppgaver-v2.sql. Manglar dei, lagrar vi utan (sjå lagreTask).
const NYE_TASK_FELT = /blokkert|order_id/;
const mapOrder = (r: any): Order => ({ id: r.id, kunde: storeOrd(r.kunde || ''), telefon: r.telefon, vare: storFyrste(r.vare || ''), leverandor: storFyrste(r.leverandor || ''), varenr: r.varenr, lenke: r.lenke ?? null, dato: r.dato, antal: r.antal, status: r.status, varsla: r.varsla, notat: r.notat ?? '', pris: r.pris != null ? Number(r.pris) : null, registrertAv: r.registrert_av ?? null, bilde: r.bilde ?? null });
const mapDoc = (r: any): Doc => ({ id: r.id, tittel: r.tittel, kategori: r.kategori, notat: r.notat, dato: r.dato, fil_url: r.fil_url, fil_namn: r.fil_namn });
const mapStadfesting = (r: any): Stadfesting => ({ id: r.id, docId: r.doc_id, ansatt: r.ansatt, stadfestaAt: r.stadfesta_at });
const mapPermission = (r: any): Permission => ({ ansatt: r.ansatt, kan_godkjenne: r.kan_godkjenne });
const mapMelding = (r: any): Melding => ({ id: r.id, fra: r.fra, til: r.til, tekst: r.tekst, created_at: r.created_at });

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isLeder } = useAnsatte();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [ferie, setFerie] = useState<Ferie[]>([]);
  const [unavailable, setUnavailable] = useState<Unavailable[]>([]);
  const [standardveke, setStandardveke] = useState<StandardvekeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rutinar, setRutinar] = useState<Rutine[]>([]);
  const [utleige, setUtleige] = useState<AppData['utleige']>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [stadfestingar, setStadfestingar] = useState<Stadfesting[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [meldinger, setMeldinger] = useState<Melding[]>([]);

  // `stille` = oppdater i bakgrunnen utan lasteskjerm (brukt av live-oppdatering).
  const hent = useCallback(async (stille: boolean) => {
    // Utan innlogging avviser databasen alt (401) – ikkje spør i det heile.
    const { data: okt } = await supabase.auth.getSession();
    if (!okt.session) return;
    if (!stille) {
      setLoading(true);
      setError(null);
      // Lag dagens rutineoppgåver før vi hentar oppgåvene. Databasen passar
      // på at kvar rutine blir til berre éi oppgåve per dag.
      await supabase.rpc('lag_rutineoppgaver');
      // Dagleg leiar sine timar frå vaktplanen (berre leiarar/godkjennarar har
      // lov; for andre gir databasen ein feil som vi ser bort frå). Natt-jobben
      // gjer det same, så timane kjem med sjølv om ingen leiar opnar appen.
      await supabase.rpc('for_leiartimar');
    }
    const [e, s, sw, f, t, o, d, p, m, u, sv, st, ru, ul] = await Promise.all([
      supabase.from('time_entries').select('*'),
      supabase.from('shifts').select('*'),
      supabase.from('shift_swaps').select('*'),
      supabase.from('ferie').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('docs').select('*').order('dato', { ascending: false }),
      supabase.from('permissions').select('*'),
      supabase.from('meldinger').select('*').order('created_at', { ascending: false }),
      supabase.from('utilgjengeleg').select('*'),
      supabase.from('standardveke').select('*'),
      supabase.from('doc_stadfesting').select('*'),
      supabase.from('oppgave_rutinar').select('*').order('created_at'),
      supabase.from('utleige_reservasjon').select('status, start, slutt').in('status', ['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka']),
    ]);
    const firstError = [e, s, sw, f, t, o, d, p, m, u, sv].find((r) => r.error)?.error;
    if (firstError) {
      if (!stille) setError(firstError.message);
    } else {
      setEntries((e.data || []).map(mapEntry));
      setShifts((s.data || []).map(mapShift));
      setSwaps((sw.data || []).map(mapSwap));
      // Ferie og fri blir tekne vare på (historikk i Ferie & fri-modulen).
      setFerie((f.data || []).map(mapFerie));
      setTasks((t.data || []).map(mapTask));
      setOrders((o.data || []).map(mapOrder));
      setDocs((d.data || []).map(mapDoc));
      setPermissions((p.data || []).map(mapPermission));
      setMeldinger((m.data || []).map(mapMelding));
      setUnavailable((u.data || []).map(mapUnavail));
      setStandardveke((sv.data || []).map(mapStandard));
      // Tabellen kjem med dokument-stadfesting.sql; manglar han, blir lista tom.
      setStadfestingar(st.error ? [] : (st.data || []).map(mapStadfesting));
      // Kjem med oppgaver-v2.sql.
      setRutinar(ru.error ? [] : (ru.data || []).map(mapRutine));
      // Kjem med utleige.sql.
      setUtleige(ul.error ? [] : (ul.data || []));
    }
    if (!stille) setLoading(false);
  }, []);

  // Første henting skjer frå App når brukaren er logga inn.
  const refreshAll = useCallback(() => hent(false), [hent]);

  // Live-oppdatering: når nokon endrar vakter, timar, oppgåver o.l., hentar
  // vi stille på nytt, så alle ser same bilete utan å laste sida. RLS gjeld
  // òg her, så kvar brukar får berre varsel om sin eigen butikk.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const planlegg = () => {
      clearTimeout(timer);
      timer = setTimeout(() => hent(true), 400);
    };
    const kanal = supabase.channel('appdata-live');
    for (const table of ['time_entries', 'shifts', 'shift_swaps', 'ferie', 'tasks', 'orders', 'docs', 'meldinger', 'utilgjengeleg', 'standardveke', 'doc_stadfesting', 'oppgave_rutinar', 'utleige_reservasjon']) {
      kanal.on('postgres_changes', { event: '*', schema: 'public', table }, planlegg);
    }
    // Mobilen set appen på pause i bakgrunnen, og då går endringar tapt.
    // Hent på nytt når sambandet blir kopla til igjen, når appen kjem fram
    // på skjermen (t.d. frå eit push-varsel), og når nettet er tilbake.
    let forsteGong = true;
    kanal.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      if (forsteGong) { forsteGong = false; return; }
      planlegg();
    });
    const vedSynleg = () => { if (document.visibilityState === 'visible') planlegg(); };
    document.addEventListener('visibilitychange', vedSynleg);
    window.addEventListener('online', planlegg);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', vedSynleg);
      window.removeEventListener('online', planlegg);
      supabase.removeChannel(kanal);
    };
  }, [hent]);

  // ---- time entries ----
  const saveEntry: AppData['saveEntry'] = async (entry) => {
    if (entry.id) {
      // Retta for hand: ikkje lenger ei auto-føring frå vaktplanen.
      const { data, error: err } = await supabase.from('time_entries').update({
        start: entry.start, slutt: entry.slutt, pause: entry.pause, status: entry.status, auto: false,
      }).eq('id', entry.id).select().single();
      if (err) throw err;
      setEntries((prev) => prev.map((x) => (x.id === entry.id ? mapEntry(data) : x)));
    } else {
      // Ny bolk = vanleg innsetjing (fleire tidsbolkar per dag er lov).
      const { data, error: err } = await supabase.from('time_entries').insert({
        ansatt: entry.ansatt, date: entry.date, start: entry.start, slutt: entry.slutt, pause: entry.pause, status: entry.status,
      }).select().single();
      if (err) throw err;
      setEntries((prev) => [...prev, mapEntry(data)]);
      // Servaren varslar berre om føringa faktisk ventar på godkjenning.
      if (data.status === 'venter') varsle({ type: 'timar_venter', entry_ids: [data.id] });
    }
    toast('Timeføring lagra');
  };
  const deleteEntry: AppData['deleteEntry'] = async (id) => {
    const { error: err } = await supabase.from('time_entries').delete().eq('id', id);
    if (err) throw err;
    setEntries((prev) => prev.filter((x) => x.id !== id));
  };
  const approveEmployeeEntries: AppData['approveEmployeeEntries'] = async (ansatt, dates) => {
    const ids = entries.filter((e) => e.ansatt === ansatt && dates.includes(e.date) && e.status === 'venter').map((e) => e.id);
    if (ids.length === 0) return;
    const { error: err } = await supabase.from('time_entries').update({ status: 'godkjent' }).in('id', ids);
    if (err) throw err;
    setEntries((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, status: 'godkjent' } : e)));
    varsle({ type: 'timar_godkjent', entry_ids: ids });
    toast('Timar godkjende');
  };

  // ---- shifts ----
  const saveShift: AppData['saveShift'] = async (shift) => {
    if (shift.id) {
      const forrigeAnsatt = shifts.find((x) => x.id === shift.id)?.ansatt;
      const { data, error: err } = await supabase.from('shifts').update({
        ansatt: shift.ansatt, date: shift.date, start: shift.start, slutt: shift.slutt, skift: shift.skift,
      }).eq('id', shift.id).select().single();
      if (err) throw err;
      setShifts((prev) => prev.map((x) => (x.id === shift.id ? mapShift(data) : x)));
      if (forrigeAnsatt !== shift.ansatt) varsle({ type: 'ny_vakt', shift_ids: [data.id] });
    } else {
      const { data, error: err } = await supabase.from('shifts').insert({
        ansatt: shift.ansatt, date: shift.date, start: shift.start, slutt: shift.slutt, skift: shift.skift,
      }).select().single();
      if (err) throw err;
      setShifts((prev) => [...prev, mapShift(data)]);
      varsle({ type: 'ny_vakt', shift_ids: [data.id] });
    }
    toast('Vakt lagra');
  };
  const deleteShift: AppData['deleteShift'] = async (id) => {
    const { error: err } = await supabase.from('shifts').delete().eq('id', id);
    if (err) throw err;
    setShifts((prev) => prev.filter((x) => x.id !== id));
  };
  const moveShiftDate: AppData['moveShiftDate'] = async (id, date) => {
    const { data, error: err } = await supabase.from('shifts').update({ date }).eq('id', id).select().single();
    if (err) throw err;
    setShifts((prev) => prev.map((x) => (x.id === id ? mapShift(data) : x)));
  };
  // ---- standardveke (mal) ----
  const saveStandardveke: AppData['saveStandardveke'] = async (entries) => {
    // Erstattar heile malen.
    const { error: delErr } = await supabase.from('standardveke').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) throw delErr;
    if (entries.length === 0) {
      setStandardveke([]);
    } else {
      const { data, error: err } = await supabase.from('standardveke').insert(entries).select();
      if (err) throw err;
      setStandardveke((data || []).map(mapStandard));
    }
    toast('Standardveke lagra');
  };

  const applyStandardveke: AppData['applyStandardveke'] = async (weekStart) => {
    // Overskriv: slett alle vakter den veka (man–lau), fyll inn på nytt frå malen.
    const dates = [0, 1, 2, 3, 4, 5].map((i) => addDays(weekStart, i));
    const { error: delErr } = await supabase.from('shifts').delete().in('date', dates);
    if (delErr) throw delErr;
    const nye = standardveke.map((e) => {
      const date = addDays(weekStart, DAG_IDX[e.dag] ?? 0);
      return { ansatt: e.ansatt, date, start: e.start, slutt: e.slutt, skift: skiftFraTid(e.start, e.slutt, date) };
    });
    let innsette: Shift[] = [];
    if (nye.length > 0) {
      const { data, error: err } = await supabase.from('shifts').insert(nye).select();
      if (err) throw err;
      innsette = (data || []).map(mapShift);
      varsle({ type: 'ny_vakt', shift_ids: innsette.map((x) => x.id) });
    }
    setShifts((prev) => [...prev.filter((x) => !dates.includes(x.date)), ...innsette]);
    toast('Veka fylt frå standardveke');
  };

  // Kopier alle vaktene frå éi veke til ei anna (erstattar vaktene der).
  const kopierVeke: AppData['kopierVeke'] = async (fraMandag, tilMandag) => {
    const fraDatoar = [0, 1, 2, 3, 4, 5].map((i) => addDays(fraMandag, i));
    const tilDatoar = [0, 1, 2, 3, 4, 5].map((i) => addDays(tilMandag, i));
    const kjelde = shifts.filter((s) => fraDatoar.includes(s.date));
    const { error: delErr } = await supabase.from('shifts').delete().in('date', tilDatoar);
    if (delErr) throw delErr;
    let innsette: Shift[] = [];
    if (kjelde.length > 0) {
      const nye = kjelde.map((s) => ({ ansatt: s.ansatt, date: tilDatoar[fraDatoar.indexOf(s.date)], start: s.start, slutt: s.slutt, skift: s.skift }));
      const { data, error: err } = await supabase.from('shifts').insert(nye).select();
      if (err) throw err;
      innsette = (data || []).map(mapShift);
      varsle({ type: 'ny_vakt', shift_ids: innsette.map((x) => x.id) });
    }
    setShifts((prev) => [...prev.filter((x) => !tilDatoar.includes(x.date)), ...innsette]);
    toast(`Kopierte ${innsette.length} vakter`);
  };

  // ---- swaps ----
  const createSwap: AppData['createSwap'] = async (swap) => {
    const { data, error: err } = await supabase.from('shift_swaps').insert({
      shift_id: swap.shiftId, fra: swap.fra, til: swap.til, dag: swap.dag, tid: swap.tid, status: 'pending',
    }).select().single();
    if (err) throw err;
    setSwaps((prev) => [...prev, mapSwap(data)]);
    varsle({ type: 'bytteonske', swap_id: data.id });
  };
  const approveSwap: AppData['approveSwap'] = async (id) => {
    const swap = swaps.find((x) => x.id === id);
    if (!swap) return;
    const { error: err1 } = await supabase.from('shifts').update({ ansatt: swap.til }).eq('id', swap.shiftId);
    if (err1) throw err1;
    const { error: err2 } = await supabase.from('shift_swaps').update({ status: 'godkjent' }).eq('id', id);
    if (err2) throw err2;
    setShifts((prev) => prev.map((x) => (x.id === swap.shiftId ? { ...x, ansatt: swap.til } : x)));
    setSwaps((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'godkjent' } : x)));
    varsle({ type: 'bytte_svar', swap_id: id });
  };
  const declineSwap: AppData['declineSwap'] = async (id) => {
    const { error: err } = await supabase.from('shift_swaps').update({ status: 'avvist' }).eq('id', id);
    if (err) throw err;
    setSwaps((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'avvist' } : x)));
    varsle({ type: 'bytte_svar', swap_id: id });
  };

  // ---- ferie ----
  // Ny søknad → leiarane får varsel. Registrert direkte av leiar → den tilsette.
  // Servaren sjekkar sjølv status og kven som gjorde det, så feil type blir ignorert.
  const varsleFerie = (rad: { id: string; status?: string }) =>
    varsle(rad.status === 'ventar' ? { type: 'ferie_soknad', ferie_id: rad.id } : { type: 'ferie_svar', ferie_id: rad.id });
  const saveFerie: AppData['saveFerie'] = async (f) => {
    // status: leiarar kan registrere direkte som godkjend; tilsette sender søknad
    // (databasen tvingar òg «ventar» for dei som ikkje kan godkjenne).
    const status = f.status ?? 'ventar';
    if (f.id) {
      const { data, error: err } = await supabase.from('ferie').update({ ansatt: f.ansatt, type: f.type, tekst: f.tekst, fra: f.fra, til: f.til, status }).eq('id', f.id).select().single();
      if (err) throw err;
      setFerie((prev) => prev.map((x) => (x.id === f.id ? mapFerie(data) : x)));
      varsleFerie(data);
    } else {
      const { data, error: err } = await supabase.from('ferie').insert({ ansatt: f.ansatt, type: f.type, tekst: f.tekst, fra: f.fra, til: f.til, status }).select().single();
      if (err) throw err;
      setFerie((prev) => [...prev, mapFerie(data)]);
      varsleFerie(data);
    }
    toast(status === 'ventar' ? 'Søknaden er sendt til leiar' : 'Ferie/fri lagra');
  };
  const behandleFerie: AppData['behandleFerie'] = async (id, status, svar) => {
    const { data, error: err } = await supabase.from('ferie').update({ status, svar }).eq('id', id).select().single();
    if (err) throw err;
    varsle({ type: 'ferie_svar', ferie_id: id });
    setFerie((prev) => prev.map((x) => (x.id === id ? mapFerie(data) : x)));
    toast(status === 'godkjend' ? 'Søknaden er godkjend' : 'Søknaden er avslått');
  };
  const deleteFerie: AppData['deleteFerie'] = async (id) => {
    const { error: err } = await supabase.from('ferie').delete().eq('id', id);
    if (err) throw err;
    setFerie((prev) => prev.filter((x) => x.id !== id));
  };

  // ---- utilgjengeleg (raude dagar) ----
  const saveUnavailable: AppData['saveUnavailable'] = async (ansatt, dato, grunn) => {
    const reit = grunn?.trim() || null;
    const eksisterande = unavailable.find((x) => x.ansatt === ansatt && x.dato === dato);
    if (eksisterande) {
      const { data, error: err } = await supabase.from('utilgjengeleg').update({ grunn: reit }).eq('id', eksisterande.id).select().single();
      if (err) throw err;
      setUnavailable((prev) => prev.map((x) => (x.id === eksisterande.id ? mapUnavail(data) : x)));
    } else {
      const { data, error: err } = await supabase.from('utilgjengeleg').insert({ ansatt, dato, grunn: reit }).select().single();
      if (err) throw err;
      setUnavailable((prev) => [...prev, mapUnavail(data)]);
    }
    toast('Merka som utilgjengeleg');
  };
  const removeUnavailable: AppData['removeUnavailable'] = async (id) => {
    const { error: err } = await supabase.from('utilgjengeleg').delete().eq('id', id);
    if (err) throw err;
    setUnavailable((prev) => prev.filter((x) => x.id !== id));
  };
  const saveUnavailablePeriode: AppData['saveUnavailablePeriode'] = async (ansatt, fra, til, grunn, gamle = []) => {
    const reit = grunn?.trim() || null;
    const datoar: string[] = [];
    for (let d = fra; d <= til; d = addDays(d, 1)) datoar.push(d);
    // Gamle dagar utanfor den nye perioden blir fjerna.
    const fjern = gamle.filter((g) => !datoar.includes(g.dato)).map((g) => g.id);
    if (fjern.length) {
      const { error: err } = await supabase.from('utilgjengeleg').delete().in('id', fjern);
      if (err) throw err;
    }
    const finst = unavailable.filter((x) => x.ansatt === ansatt && datoar.includes(x.dato) && !fjern.includes(x.id));
    if (finst.length) {
      const { error: err } = await supabase.from('utilgjengeleg').update({ grunn: reit }).in('id', finst.map((x) => x.id));
      if (err) throw err;
    }
    const nye = datoar.filter((d) => !finst.some((x) => x.dato === d));
    let lagt: Unavailable[] = [];
    if (nye.length) {
      const { data, error: err } = await supabase.from('utilgjengeleg').insert(nye.map((dato) => ({ ansatt, dato, grunn: reit }))).select();
      if (err) throw err;
      lagt = (data || []).map(mapUnavail);
    }
    const oppdatert = new Set(finst.map((x) => x.id));
    setUnavailable((prev) => [
      ...prev.filter((x) => !fjern.includes(x.id)).map((x) => (oppdatert.has(x.id) ? { ...x, grunn: reit } : x)),
      ...lagt,
    ]);
    toast(datoar.length === 1 ? 'Merka som utilgjengeleg' : `Merka ${datoar.length} dagar som utilgjengeleg`);
  };
  const removeUnavailableMange: AppData['removeUnavailableMange'] = async (ids) => {
    const { error: err } = await supabase.from('utilgjengeleg').delete().in('id', ids);
    if (err) throw err;
    setUnavailable((prev) => prev.filter((x) => !ids.includes(x.id)));
    toast('Markering fjerna');
  };

  // ---- tasks ----
  // Varsle den som får oppgåva (servaren hoppar over den som gjorde det).
  const varsleTildelt = (task: Task, forrige?: string) => {
    if (!task.ferdig && task.ansatt !== 'ufordelt' && task.ansatt !== forrige) varsle({ type: 'oppgave_tildelt', task_id: task.id });
  };
  const lagreTask = async (t: TaskInput, melding: string | null) => {
    const felt: Record<string, unknown> = {
      tittel: t.tittel, detalj: t.detalj, prioritet: t.prioritet, ansatt: t.ansatt,
      frist: t.frist ?? null, kategori: t.kategori ?? 'Anna', gjentak: t.gjentak ?? 'ingen',
      sjekkliste: t.sjekkliste ?? [], ferdig: t.ferdig ?? false,
    };
    const nye: Record<string, unknown> = {};
    if (t.blokkert !== undefined) { nye.blokkert = t.blokkert && !t.ferdig; nye.blokkert_grunn = t.blokkert ? t.blokkertGrunn ?? '' : ''; }
    if (!t.id && t.orderId) nye.order_id = t.orderId;
    const lagre = (rad: Record<string, unknown>) => (t.id
      ? supabase.from('tasks').update(rad).eq('id', t.id).select().single()
      : supabase.from('tasks').insert(rad).select().single());
    let { data, error: err } = await lagre({ ...felt, ...nye });
    if (err && NYE_TASK_FELT.test(err.message)) ({ data, error: err } = await lagre(felt));
    if (err) throw err;
    const lagra = mapTask(data);
    const forrige = t.id ? tasks.find((x) => x.id === t.id) : undefined;
    if (t.id) setTasks((prev) => prev.map((x) => (x.id === t.id ? lagra : x)));
    else setTasks((prev) => [...prev, lagra]);
    varsleTildelt(lagra, forrige?.ansatt);
    if (lagra.blokkert && !forrige?.blokkert) varsle({ type: 'oppgave_blokkert', task_id: lagra.id });
    if (melding) toast(melding);
  };
  const saveTask: AppData['saveTask'] = (t) => lagreTask(t, 'Oppgåve lagra');
  // Marker ferdig, og lag automatisk neste førekomst om oppgåva er gjentakande.
  const completeTask: AppData['completeTask'] = async (task) => {
    await lagreTask({ ...task, ferdig: true, blokkert: false }, 'Oppgåva er fullført');
    if (task.gjentak && task.gjentak !== 'ingen') {
      await lagreTask({
        tittel: task.tittel, detalj: task.detalj, prioritet: task.prioritet, ansatt: task.ansatt,
        ferdig: false, kategori: task.kategori, gjentak: task.gjentak,
        frist: nesteFrist(task.frist, task.gjentak),
        sjekkliste: (task.sjekkliste || []).map((s) => ({ tekst: s.tekst, ferdig: false })),
      }, null);
    }
  };
  const reopenTask: AppData['reopenTask'] = (task) => lagreTask({ ...task, ferdig: false }, 'Oppgåva er open igjen');
  const blockTask: AppData['blockTask'] = (task, grunn) =>
    lagreTask({ ...task, blokkert: true, blokkertGrunn: grunn.trim() }, 'Merkt som blokkert – leiar får beskjed');
  const unblockTask: AppData['unblockTask'] = (task) => lagreTask({ ...task, blokkert: false }, 'Blokkeringa er oppheva');
  const deleteTask: AppData['deleteTask'] = async (id) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id);
    if (err) throw err;
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };
  const moveTask: AppData['moveTask'] = async (id, ansatt) => {
    const forrige = tasks.find((x) => x.id === id)?.ansatt;
    const { data, error: err } = await supabase.from('tasks').update({ ansatt }).eq('id', id).select().single();
    if (err) throw err;
    const flytta = mapTask(data);
    setTasks((prev) => prev.map((x) => (x.id === id ? flytta : x)));
    varsleTildelt(flytta, forrige);
  };

  // ---- rutinar ----
  const saveRutine: AppData['saveRutine'] = async (r) => {
    const rad = { tittel: r.tittel, detalj: r.detalj, kategori: r.kategori, prioritet: r.prioritet, ansvar: r.ansvar, dagar: r.dagar, manadsdag: r.manadsdag, sjekkliste: r.sjekkliste, aktiv: r.aktiv };
    const { data, error: err } = r.id
      ? await supabase.from('oppgave_rutinar').update(rad).eq('id', r.id).select().single()
      : await supabase.from('oppgave_rutinar').insert(rad).select().single();
    if (err) throw err;
    const lagra = mapRutine(data);
    setRutinar((prev) => (r.id ? prev.map((x) => (x.id === r.id ? lagra : x)) : [...prev, lagra]));
    // Gjeld rutinen i dag, skal oppgåva dukke opp med ein gong.
    const { data: nye } = await supabase.rpc('lag_rutineoppgaver');
    if (nye) await hent(true);
    toast('Rutine lagra');
  };
  const deleteRutine: AppData['deleteRutine'] = async (id) => {
    const { error: err } = await supabase.from('oppgave_rutinar').delete().eq('id', id);
    if (err) throw err;
    setRutinar((prev) => prev.filter((x) => x.id !== id));
  };

  // ---- orders ----
  // Hentar produktbiletet (og:image) frå lenka via edge-funksjonen og lagrar
  // det på bestillinga. `overskriv`=false fyller berre inn når det finst eit
  // bilete (brukt ved etterfylling); true reflekterer lenka slik ho er no.
  const resolveOrderBilete = useCallback<AppData['resolveOrderBilete']>(async (id, lenke, overskriv = false) => {
    if (!lenke) return;
    try {
      const { data, error: err } = await supabase.functions.invoke('lenke-bilete', { body: { url: lenke } });
      if (err) return;
      const bilde = ((data as { bilde?: string | null } | null)?.bilde) ?? null;
      if (!bilde && !overskriv) return;
      const { error: uerr } = await supabase.from('orders').update({ bilde }).eq('id', id);
      if (uerr) return;
      setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, bilde } : x)));
    } catch { /* best effort – bilete er valfritt */ }
  }, []);

  const saveOrder: AppData['saveOrder'] = async (o) => {
    const nyLenke = o.lenke || null;
    const felt = {
      kunde: o.kunde, telefon: o.telefon, vare: o.vare, leverandor: o.leverandor, varenr: o.varenr, lenke: nyLenke, dato: o.dato, antal: o.antal, status: o.status, pris: o.pris ?? null,
      // Biletet kjem frå skjemaet (manuelt/søk); er det tomt, hentar vi under.
      bilde: o.bilde ?? null,
    };
    // notat-kolonna kjem med bestilling-notat.sql. Finst ho ikkje enno, lagrar
    // vi resten så bestillinga ikkje går tapt.
    const lagre = async (medNotat: boolean) => {
      const rad = medNotat ? { ...felt, notat: o.notat ?? '' } : felt;
      return o.id
        ? supabase.from('orders').update(rad).eq('id', o.id).select().single()
        : supabase.from('orders').insert(rad).select().single();
    };
    let { data, error: err } = await lagre(true);
    if (err && /notat/.test(err.message)) ({ data, error: err } = await lagre(false));
    if (err) throw err;
    if (o.id) setOrders((prev) => prev.map((x) => (x.id === o.id ? mapOrder(data) : x)));
    else setOrders((prev) => [mapOrder(data), ...prev]);
    toast('Bestilling lagra');
    // Manglar bilete, men har lenke? Prøv å hente og:image i bakgrunnen.
    if (nyLenke && !data.bilde) void resolveOrderBilete(data.id, nyLenke, true);
  };
  const deleteOrder: AppData['deleteOrder'] = async (id) => {
    const { error: err } = await supabase.from('orders').delete().eq('id', id);
    if (err) throw err;
    setOrders((prev) => prev.filter((x) => x.id !== id));
  };
  const advanceOrder: AppData['advanceOrder'] = async (id, nextStatus) => {
    const { data, error: err } = await supabase.from('orders').update({ status: nextStatus }).eq('id', id).select().single();
    if (err) throw err;
    setOrders((prev) => prev.map((x) => (x.id === id ? mapOrder(data) : x)));
    toast('Status oppdatert');
  };
  const markOrderVarsla: AppData['markOrderVarsla'] = async (id, date) => {
    const { data, error: err } = await supabase.from('orders').update({ varsla: date }).eq('id', id).select().single();
    if (err) throw err;
    setOrders((prev) => prev.map((x) => (x.id === id ? mapOrder(data) : x)));
  };

  // ---- docs ----
  const saveDoc: AppData['saveDoc'] = async (d) => {
    if (d.id) {
      const { data, error: err } = await supabase.from('docs').update({ tittel: d.tittel, kategori: d.kategori, notat: d.notat, dato: d.dato, fil_url: d.fil_url, fil_namn: d.fil_namn }).eq('id', d.id).select().single();
      if (err) throw err;
      setDocs((prev) => prev.map((x) => (x.id === d.id ? mapDoc(data) : x)));
    } else {
      const { data, error: err } = await supabase.from('docs').insert({ tittel: d.tittel, kategori: d.kategori, notat: d.notat, dato: d.dato, fil_url: d.fil_url, fil_namn: d.fil_namn }).select().single();
      if (err) throw err;
      setDocs((prev) => [mapDoc(data), ...prev]);
    }
    toast('Dokument lagra');
  };
  const deleteDoc: AppData['deleteDoc'] = async (id) => {
    const { error: err } = await supabase.from('docs').delete().eq('id', id);
    if (err) throw err;
    setDocs((prev) => prev.filter((x) => x.id !== id));
  };
  const uploadDocFile: AppData['uploadDocFile'] = async (file) => {
    // Filene ligg i ei privat bøtte, i ei mappe per butikk. Vi lagrar berre
    // stien; dokumentet blir opna via ei kortliva signert lenke (docFileUrl).
    const { data: butikk } = await supabase.rpc('min_butikk');
    const reint = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');
    const path = `${butikk ? `${butikk}/` : ''}${Date.now()}-${reint}`;
    const { error: err } = await supabase.storage.from('docs').upload(path, file);
    if (err) throw err;
    return { url: path, namn: file.name };
  };

  // Lag ei signert lenke (gyldig i 60 s) for eit vedlegg. Gamle rader kan ha
  // ein offentleg storage-URL – han blir gjort om til stien. Filer under
  // /docs/ er felles malar i appen, og andre nettadresser blir opna som dei er.
  const docFileUrl: AppData['docFileUrl'] = async (filUrl) => {
    if (!filUrl) return null;
    const offentleg = filUrl.match(/\/storage\/v1\/object\/public\/docs\/(.+)$/);
    if (!offentleg && (/^https?:\/\//i.test(filUrl) || filUrl.startsWith('/'))) return filUrl;
    const path = offentleg ? decodeURIComponent(offentleg[1]) : filUrl;
    const { data, error: err } = await supabase.storage.from('docs').createSignedUrl(path, 60);
    if (err) return null;
    return data.signedUrl;
  };

  // Kven og når blir sett av databasen ut frå innlogga brukar.
  const stadfestDoc: AppData['stadfestDoc'] = async (docId) => {
    const { data, error: err } = await supabase.from('doc_stadfesting').insert({ doc_id: docId }).select().single();
    if (err) throw err;
    setStadfestingar((prev) => [...prev, mapStadfesting(data)]);
    toast('Stadfesta – takk!');
  };

  // ---- permissions & delegation ----
  const canApprove: AppData['canApprove'] = useCallback(
    (ansatt) => !!ansatt && (isLeder(ansatt) || permissions.some((p) => p.ansatt === ansatt && p.kan_godkjenne)),
    [permissions, isLeder]
  );
  const setKanGodkjenne: AppData['setKanGodkjenne'] = async (ansatt, kan) => {
    const { data, error: err } = await supabase.from('permissions').upsert({ ansatt, kan_godkjenne: kan }).select().single();
    if (err) throw err;
    setPermissions((prev) => [...prev.filter((p) => p.ansatt !== ansatt), mapPermission(data)]);
  };

  // ---- meldinger ----
  const sendMelding: AppData['sendMelding'] = async (fra, til, tekst) => {
    const { data, error: err } = await supabase.from('meldinger').insert({ fra, til, tekst }).select().single();
    if (err) throw err;
    setMeldinger((prev) => [mapMelding(data), ...prev]);
  };
  const deleteMelding: AppData['deleteMelding'] = async (id) => {
    const { error: err } = await supabase.from('meldinger').delete().eq('id', id);
    if (err) throw err;
    setMeldinger((prev) => prev.filter((x) => x.id !== id));
  };

  const value = useMemo<AppData>(
    () => ({
      loading, error, entries, shifts, swaps, ferie, tasks, orders, docs, stadfestingar, stadfestDoc, permissions, meldinger, unavailable, standardveke, refreshAll,
      canApprove, setKanGodkjenne,
      sendMelding, deleteMelding,
      saveEntry, deleteEntry, approveEmployeeEntries,
      saveShift, deleteShift, moveShiftDate, saveStandardveke, applyStandardveke, kopierVeke,
      createSwap, approveSwap, declineSwap,
      saveFerie, deleteFerie, behandleFerie, saveUnavailable, removeUnavailable, saveUnavailablePeriode, removeUnavailableMange,
      saveTask, deleteTask, moveTask, completeTask, reopenTask, blockTask, unblockTask,
      rutinar, saveRutine, deleteRutine, utleige,
      saveOrder, deleteOrder, advanceOrder, markOrderVarsla, resolveOrderBilete,
      saveDoc, deleteDoc, uploadDocFile, docFileUrl,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, error, entries, shifts, swaps, ferie, tasks, rutinar, utleige, orders, docs, stadfestingar, permissions, meldinger, unavailable, standardveke, canApprove]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
