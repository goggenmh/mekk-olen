import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import type { EmployeeId } from '../constants';
import { useAnsatte } from './AnsatteContext';
import { sendPush } from '../lib/push';
import type { Doc, Ferie, Melding, Order, Permission, Shift, ShiftSwap, Task, TimeEntry } from '../types';

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
  permissions: Permission[];
  meldinger: Melding[];
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
  fillWeek: (template: { ansatt: EmployeeId; date: string; start: string; slutt: string; skift: string }[]) => Promise<void>;
  addShifts: (rows: { ansatt: EmployeeId; date: string; start: string; slutt: string; skift: string }[]) => Promise<void>;

  createSwap: (swap: Omit<ShiftSwap, 'id' | 'status'>) => Promise<void>;
  approveSwap: (id: string) => Promise<void>;
  declineSwap: (id: string) => Promise<void>;

  saveFerie: (f: Omit<Ferie, 'id'> & { id?: string }) => Promise<void>;
  deleteFerie: (id: string) => Promise<void>;

  saveTask: (t: Omit<Task, 'id'> & { id?: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, ansatt: EmployeeId | 'ufordelt') => Promise<void>;

  saveOrder: (o: Omit<Order, 'id'> & { id?: string }) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  advanceOrder: (id: string, nextStatus: string) => Promise<void>;
  markOrderVarsla: (id: string, date: string) => Promise<void>;

  saveDoc: (d: Omit<Doc, 'id'> & { id?: string }) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  uploadDocFile: (file: File) => Promise<{ url: string; namn: string }>;
}

const AppDataContext = createContext<AppData | null>(null);

const mapEntry = (r: any): TimeEntry => ({ id: r.id, ansatt: r.ansatt, date: r.date, start: r.start, slutt: r.slutt, pause: r.pause, status: r.status });
const mapShift = (r: any): Shift => ({ id: r.id, ansatt: r.ansatt, date: r.date, start: r.start, slutt: r.slutt, skift: r.skift });
const mapSwap = (r: any): ShiftSwap => ({ id: r.id, shiftId: r.shift_id, fra: r.fra, til: r.til, dag: r.dag, tid: r.tid, status: r.status });
const mapFerie = (r: any): Ferie => ({ id: r.id, ansatt: r.ansatt, type: r.type, tekst: r.tekst });
const mapTask = (r: any): Task => ({ id: r.id, tittel: r.tittel, detalj: r.detalj, prioritet: r.prioritet, ansatt: r.ansatt, ferdig: r.ferdig });
const mapOrder = (r: any): Order => ({ id: r.id, kunde: r.kunde, telefon: r.telefon, vare: r.vare, leverandor: r.leverandor, varenr: r.varenr, dato: r.dato, antal: r.antal, status: r.status, varsla: r.varsla });
const mapDoc = (r: any): Doc => ({ id: r.id, tittel: r.tittel, kategori: r.kategori, notat: r.notat, dato: r.dato, fil_url: r.fil_url, fil_namn: r.fil_namn });
const mapPermission = (r: any): Permission => ({ ansatt: r.ansatt, kan_godkjenne: r.kan_godkjenne });
const mapMelding = (r: any): Melding => ({ id: r.id, fra: r.fra, til: r.til, tekst: r.tekst, created_at: r.created_at });

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isLeder, findAnsatt, alleAnsatte } = useAnsatte();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [ferie, setFerie] = useState<Ferie[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [meldinger, setMeldinger] = useState<Melding[]>([]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [e, s, sw, f, t, o, d, p, m] = await Promise.all([
      supabase.from('time_entries').select('*'),
      supabase.from('shifts').select('*'),
      supabase.from('shift_swaps').select('*'),
      supabase.from('ferie').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('docs').select('*').order('dato', { ascending: false }),
      supabase.from('permissions').select('*'),
      supabase.from('meldinger').select('*').order('created_at', { ascending: false }),
    ]);
    const firstError = [e, s, sw, f, t, o, d, p, m].find((r) => r.error)?.error;
    if (firstError) {
      setError(firstError.message);
    } else {
      setEntries((e.data || []).map(mapEntry));
      setShifts((s.data || []).map(mapShift));
      setSwaps((sw.data || []).map(mapSwap));
      setFerie((f.data || []).map(mapFerie));
      setTasks((t.data || []).map(mapTask));
      setOrders((o.data || []).map(mapOrder));
      setDocs((d.data || []).map(mapDoc));
      setPermissions((p.data || []).map(mapPermission));
      setMeldinger((m.data || []).map(mapMelding));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ---- time entries ----
  const saveEntry: AppData['saveEntry'] = async (entry) => {
    if (entry.id) {
      const { data, error: err } = await supabase.from('time_entries').update({
        start: entry.start, slutt: entry.slutt, pause: entry.pause, status: entry.status,
      }).eq('id', entry.id).select().single();
      if (err) throw err;
      setEntries((prev) => prev.map((x) => (x.id === entry.id ? mapEntry(data) : x)));
    } else {
      const { data, error: err } = await supabase.from('time_entries').upsert({
        ansatt: entry.ansatt, date: entry.date, start: entry.start, slutt: entry.slutt, pause: entry.pause, status: entry.status,
      }, { onConflict: 'ansatt,date' }).select().single();
      if (err) throw err;
      setEntries((prev) => {
        const i = prev.findIndex((x) => x.ansatt === entry.ansatt && x.date === entry.date);
        const mapped = mapEntry(data);
        if (i >= 0) { const next = prev.slice(); next[i] = mapped; return next; }
        return [...prev, mapped];
      });
    }
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
    sendPush([ansatt], 'Timar godkjent', 'Timane dine er no godkjent.');
  };

  // ---- shifts ----
  const saveShift: AppData['saveShift'] = async (shift) => {
    if (shift.id) {
      const { data, error: err } = await supabase.from('shifts').update({
        ansatt: shift.ansatt, date: shift.date, start: shift.start, slutt: shift.slutt, skift: shift.skift,
      }).eq('id', shift.id).select().single();
      if (err) throw err;
      setShifts((prev) => prev.map((x) => (x.id === shift.id ? mapShift(data) : x)));
    } else {
      const { data, error: err } = await supabase.from('shifts').insert({
        ansatt: shift.ansatt, date: shift.date, start: shift.start, slutt: shift.slutt, skift: shift.skift,
      }).select().single();
      if (err) throw err;
      setShifts((prev) => [...prev, mapShift(data)]);
      sendPush([shift.ansatt], 'Ny vakt', `Du har fått ei ny vakt ${shift.date} ${shift.start}–${shift.slutt}.`);
    }
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
  const fillWeek: AppData['fillWeek'] = async (template) => {
    const missing = template.filter((t) => !shifts.some((x) => x.ansatt === t.ansatt && x.date === t.date));
    if (missing.length === 0) return;
    const { data, error: err } = await supabase.from('shifts').insert(missing).select();
    if (err) throw err;
    setShifts((prev) => [...prev, ...(data || []).map(mapShift)]);
    sendPush([...new Set(missing.map((m) => m.ansatt))], 'Nye vakter', 'Du har fått nye vakter i vaktplanen.');
  };
  const addShifts: AppData['addShifts'] = async (rows) => {
    const nye = rows.filter((r) => !shifts.some((x) => x.ansatt === r.ansatt && x.date === r.date && x.start === r.start && x.slutt === r.slutt));
    if (nye.length === 0) return;
    const { data, error: err } = await supabase.from('shifts').insert(nye).select();
    if (err) throw err;
    setShifts((prev) => [...prev, ...(data || []).map(mapShift)]);
    sendPush([...new Set(nye.map((r) => r.ansatt))], 'Nye vakter', 'Du har fått nye vakter i vaktplanen.');
  };

  // ---- swaps ----
  const createSwap: AppData['createSwap'] = async (swap) => {
    const { data, error: err } = await supabase.from('shift_swaps').insert({
      shift_id: swap.shiftId, fra: swap.fra, til: swap.til, dag: swap.dag, tid: swap.tid, status: 'pending',
    }).select().single();
    if (err) throw err;
    setSwaps((prev) => [...prev, mapSwap(data)]);
    const ledereIds = alleAnsatte.filter((a) => a.leder && a.aktiv).map((a) => a.id);
    sendPush([...new Set([swap.til, ...ledereIds])], 'Bytteønske', `${findAnsatt(swap.fra).navn} vil bytte vakt ${swap.dag} ${swap.tid}.`);
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
    sendPush([swap.fra, swap.til], 'Bytte godkjent', `Vaktbyttet ${swap.dag} ${swap.tid} er godkjent.`);
  };
  const declineSwap: AppData['declineSwap'] = async (id) => {
    const { error: err } = await supabase.from('shift_swaps').update({ status: 'avvist' }).eq('id', id);
    if (err) throw err;
    setSwaps((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'avvist' } : x)));
    const swap = swaps.find((x) => x.id === id);
    if (swap) sendPush([swap.fra], 'Bytte avvist', `Vaktbyttet ${swap.dag} ${swap.tid} blei ikkje godkjent.`);
  };

  // ---- ferie ----
  const saveFerie: AppData['saveFerie'] = async (f) => {
    if (f.id) {
      const { data, error: err } = await supabase.from('ferie').update({ ansatt: f.ansatt, type: f.type, tekst: f.tekst }).eq('id', f.id).select().single();
      if (err) throw err;
      setFerie((prev) => prev.map((x) => (x.id === f.id ? mapFerie(data) : x)));
    } else {
      const { data, error: err } = await supabase.from('ferie').insert({ ansatt: f.ansatt, type: f.type, tekst: f.tekst }).select().single();
      if (err) throw err;
      setFerie((prev) => [...prev, mapFerie(data)]);
    }
  };
  const deleteFerie: AppData['deleteFerie'] = async (id) => {
    const { error: err } = await supabase.from('ferie').delete().eq('id', id);
    if (err) throw err;
    setFerie((prev) => prev.filter((x) => x.id !== id));
  };

  // ---- tasks ----
  const saveTask: AppData['saveTask'] = async (t) => {
    if (t.id) {
      const { data, error: err } = await supabase.from('tasks').update({ tittel: t.tittel, detalj: t.detalj, prioritet: t.prioritet, ansatt: t.ansatt, ferdig: t.ferdig }).eq('id', t.id).select().single();
      if (err) throw err;
      setTasks((prev) => prev.map((x) => (x.id === t.id ? mapTask(data) : x)));
    } else {
      const { data, error: err } = await supabase.from('tasks').insert({ tittel: t.tittel, detalj: t.detalj, prioritet: t.prioritet, ansatt: t.ansatt, ferdig: t.ferdig ?? false }).select().single();
      if (err) throw err;
      setTasks((prev) => [...prev, mapTask(data)]);
    }
  };
  const deleteTask: AppData['deleteTask'] = async (id) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id);
    if (err) throw err;
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };
  const moveTask: AppData['moveTask'] = async (id, ansatt) => {
    const { data, error: err } = await supabase.from('tasks').update({ ansatt }).eq('id', id).select().single();
    if (err) throw err;
    setTasks((prev) => prev.map((x) => (x.id === id ? mapTask(data) : x)));
  };

  // ---- orders ----
  const saveOrder: AppData['saveOrder'] = async (o) => {
    if (o.id) {
      const { data, error: err } = await supabase.from('orders').update({
        kunde: o.kunde, telefon: o.telefon, vare: o.vare, leverandor: o.leverandor, varenr: o.varenr, dato: o.dato, antal: o.antal, status: o.status,
      }).eq('id', o.id).select().single();
      if (err) throw err;
      setOrders((prev) => prev.map((x) => (x.id === o.id ? mapOrder(data) : x)));
    } else {
      const { data, error: err } = await supabase.from('orders').insert({
        kunde: o.kunde, telefon: o.telefon, vare: o.vare, leverandor: o.leverandor, varenr: o.varenr, dato: o.dato, antal: o.antal, status: o.status,
      }).select().single();
      if (err) throw err;
      setOrders((prev) => [mapOrder(data), ...prev]);
    }
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
  };
  const deleteDoc: AppData['deleteDoc'] = async (id) => {
    const { error: err } = await supabase.from('docs').delete().eq('id', id);
    if (err) throw err;
    setDocs((prev) => prev.filter((x) => x.id !== id));
  };
  const uploadDocFile: AppData['uploadDocFile'] = async (file) => {
    const path = `${Date.now()}-${file.name}`;
    const { error: err } = await supabase.storage.from('docs').upload(path, file);
    if (err) throw err;
    const { data } = supabase.storage.from('docs').getPublicUrl(path);
    return { url: data.publicUrl, namn: file.name };
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
      loading, error, entries, shifts, swaps, ferie, tasks, orders, docs, permissions, meldinger, refreshAll,
      canApprove, setKanGodkjenne,
      sendMelding, deleteMelding,
      saveEntry, deleteEntry, approveEmployeeEntries,
      saveShift, deleteShift, moveShiftDate, fillWeek, addShifts,
      createSwap, approveSwap, declineSwap,
      saveFerie, deleteFerie,
      saveTask, deleteTask, moveTask,
      saveOrder, deleteOrder, advanceOrder, markOrderVarsla,
      saveDoc, deleteDoc, uploadDocFile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, error, entries, shifts, swaps, ferie, tasks, orders, docs, permissions, meldinger, canApprove]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
