import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, pinToPassword } from '../supabaseClient';
import { DEFAULT_ANSATTE, type Employee, type EmployeeId } from '../constants';

const TOMT_ANSATT: Employee = { id: '', navn: '', rolle: '', lonn: 'time', sats: 0, farge: '#999', init: '?', email: '', telefon: '', leder: false, aktiv: false };

interface AnsatteState {
  loading: boolean;
  ansatte: Employee[];
  alleAnsatte: Employee[];
  findAnsatt: (id: EmployeeId | null | undefined) => Employee;
  isLeder: (id: EmployeeId | null | undefined) => boolean;
  refreshAnsatte: () => Promise<void>;
  createAnsatt: (input: { navn: string; rolle: string; lonn: 'fast' | 'time'; sats: number; farge: string; init: string; telefon: string; leder: boolean; pin: string; email?: string }) => Promise<void>;
  updateAnsatt: (id: EmployeeId, patch: Partial<Pick<Employee, 'navn' | 'rolle' | 'lonn' | 'sats' | 'farge' | 'init' | 'telefon' | 'leder'>>) => Promise<void>;
  setAktiv: (id: EmployeeId, aktiv: boolean) => Promise<void>;
  resetPin: (id: EmployeeId, pin: string) => Promise<void>;
  updateEmail: (id: EmployeeId, email: string) => Promise<void>;
}

const AnsatteContext = createContext<AnsatteState | null>(null);

const mapAnsatt = (r: any): Employee => ({
  id: r.id, navn: r.navn, rolle: r.rolle, lonn: r.lonn, sats: r.sats, farge: r.farge, init: r.init,
  email: r.email, telefon: r.telefon || '', leder: r.leder, aktiv: r.aktiv,
});

export function AnsatteProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [alleAnsatte, setAlleAnsatte] = useState<Employee[]>(DEFAULT_ANSATTE);

  const refreshAnsatte = useCallback(async () => {
    const { data, error } = await supabase.from('ansatte').select('*').order('created_at', { ascending: true });
    if (!error && data) setAlleAnsatte(data.map(mapAnsatt));
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAnsatte();
  }, [refreshAnsatte]);

  const ansatte = useMemo(() => alleAnsatte.filter((a) => a.aktiv), [alleAnsatte]);

  const findAnsatt = useCallback(
    (id: EmployeeId | null | undefined): Employee => alleAnsatte.find((a) => a.id === id) || { ...TOMT_ANSATT, id: id || '' },
    [alleAnsatte]
  );
  const isLeder = useCallback(
    (id: EmployeeId | null | undefined): boolean => !!alleAnsatte.find((a) => a.id === id)?.leder,
    [alleAnsatte]
  );

  const callAdmin = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('ansatte-admin', { body: { action, ...payload } });
    if (error) {
      const response = (error as { context?: Response }).context;
      if (response) {
        const body = await response.clone().json().catch(() => null);
        if (body?.error) throw new Error(body.error);
      }
      throw error;
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const createAnsatt: AnsatteState['createAnsatt'] = async (input) => {
    const id = input.navn.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { pin, ...rest } = input;
    await callAdmin('create', { id, ...rest, password: pinToPassword(pin) });
    await refreshAnsatte();
  };

  const updateAnsatt: AnsatteState['updateAnsatt'] = async (id, patch) => {
    const { data, error } = await supabase.from('ansatte').update(patch).eq('id', id).select().single();
    if (error) throw error;
    setAlleAnsatte((prev) => prev.map((a) => (a.id === id ? mapAnsatt(data) : a)));
  };

  const setAktiv: AnsatteState['setAktiv'] = async (id, aktiv) => {
    await callAdmin(aktiv ? 'reactivate' : 'deactivate', { id });
    await refreshAnsatte();
  };

  const resetPin: AnsatteState['resetPin'] = async (id, pin) => {
    await callAdmin('resetpin', { id, password: pinToPassword(pin) });
  };

  const updateEmail: AnsatteState['updateEmail'] = async (id, email) => {
    await callAdmin('updateemail', { id, email });
    await refreshAnsatte();
  };

  const value = useMemo<AnsatteState>(
    () => ({ loading, ansatte, alleAnsatte, findAnsatt, isLeder, refreshAnsatte, createAnsatt, updateAnsatt, setAktiv, resetPin, updateEmail }),
    [loading, ansatte, alleAnsatte, findAnsatt, isLeder, refreshAnsatte]
  );

  return <AnsatteContext.Provider value={value}>{children}</AnsatteContext.Provider>;
}

export function useAnsatte() {
  const ctx = useContext(AnsatteContext);
  if (!ctx) throw new Error('useAnsatte must be used within AnsatteProvider');
  return ctx;
}
