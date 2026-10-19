import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, pinToPassword } from '../supabaseClient';
import { toast } from '../lib/toast';
import { type Employee, type EmployeeId, type Butikk } from '../constants';

const TOMT_ANSATT: Employee = { id: '', navn: '', rolle: '', lonn: 'time', sats: 0, farge: '#999', init: '?', email: '', telefon: '', leder: false, aktiv: false };

interface AnsatteState {
  loading: boolean;
  ansatte: Employee[];
  alleAnsatte: Employee[];
  /** Alle aktive tilsette på tvers av butikkar – trygg, økt-uavhengig
   *  kjelde til innloggings-skjermen (namn/initial/e-post, ikkje løn). */
  loginAnsatte: Employee[];
  butikkar: Butikk[];
  finnButikk: (id?: string | null) => Butikk | undefined;
  findAnsatt: (id: EmployeeId | null | undefined) => Employee;
  isLeder: (id: EmployeeId | null | undefined) => boolean;
  refreshAnsatte: () => Promise<void>;
  createAnsatt: (input: { navn: string; rolle: string; lonn: 'fast' | 'time'; sats: number; farge: string; init: string; telefon: string; leder: boolean; pin: string; email?: string; butikk_id?: string; konsern_admin?: boolean }) => Promise<void>;
  updateAnsatt: (id: EmployeeId, patch: Partial<Pick<Employee, 'navn' | 'rolle' | 'lonn' | 'sats' | 'farge' | 'init' | 'telefon' | 'leder'>>) => Promise<void>;
  setAktiv: (id: EmployeeId, aktiv: boolean) => Promise<void>;
  resetPin: (id: EmployeeId, pin: string) => Promise<void>;
  updateEmail: (id: EmployeeId, email: string) => Promise<void>;
}

const AnsatteContext = createContext<AnsatteState | null>(null);

export const mapAnsatt = (r: any): Employee => ({
  id: r.id, navn: r.navn, rolle: r.rolle, lonn: r.lonn, sats: r.sats, farge: r.farge, init: r.init,
  email: r.email, telefon: r.telefon || '', leder: r.leder, aktiv: r.aktiv,
  butikk_id: r.butikk_id ?? undefined, konsern_admin: r.konsern_admin ?? false,
});
// Alle kolonnar utanom timesatsen (sats), som berre leiarar får lese.
const KOLONNER = 'id, navn, rolle, lonn, farge, init, email, telefon, leder, aktiv, created_at, butikk_id, konsern_admin';
const mapButikk = (r: any): Butikk => ({ id: r.id, namn: r.namn, farge: r.farge || '#11788a', aktiv: r.aktiv });

export function AnsatteProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  // Startar tomt: den ekte lista blir henta frå databasen. Ei innebygd
  // standardliste her ville vist «spøkelses-brukarar» eit blink på
  // innlogginga, som kunne veljast med feil identitet.
  const [alleAnsatte, setAlleAnsatte] = useState<Employee[]>([]);
  const [loginAnsatte, setLoginAnsatte] = useState<Employee[]>([]);
  const [butikkar, setButikkar] = useState<Butikk[]>([]);

  const refreshAnsatte = useCallback(async () => {
    // Tabellane krev innlogging (401 utan); innloggings-lista gjer ikkje det.
    const { data: okt } = await supabase.auth.getSession();
    const tomt = Promise.resolve({ data: null, error: { message: 'ikkje innlogga' } });
    const [ansRes, butRes, loginRes, satsRes] = await Promise.all([
      okt.session ? supabase.from('ansatte').select(KOLONNER).order('created_at', { ascending: true }) : tomt,
      okt.session ? supabase.from('butikkar').select('*').eq('aktiv', true).order('created_at', { ascending: true }) : tomt,
      // Økt-uavhengig liste til innloggings-skjermen (SECURITY DEFINER, utan e-post).
      supabase.rpc('login_liste'),
      // Timesatsar er private: berre leiarar får rader her (tomt for andre).
      okt.session ? supabase.rpc('lonssatsar') : tomt,
    ]);
    if (!ansRes.error && ansRes.data) {
      const satsar = new Map(((satsRes.data as { id: string; sats: number }[] | null) || []).map((r) => [r.id, r.sats]));
      setAlleAnsatte(ansRes.data.map((r: any) => mapAnsatt({ ...r, sats: satsar.get(r.id) ?? 0 })));
    }
    if (!butRes.error && butRes.data) setButikkar(butRes.data.map(mapButikk));
    // Bruk RPC-en når han finst; elles fall tilbake på det vanlege
    // uttrekket (så innlogging verkar sjølv før fase5-SQL-en er køyrd).
    const loginRows = loginRes.data as unknown[] | null;
    if (!loginRes.error && loginRows && loginRows.length) {
      setLoginAnsatte(loginRows.map(mapAnsatt));
    } else if (!ansRes.error && ansRes.data && ansRes.data.length) {
      setLoginAnsatte(ansRes.data.map(mapAnsatt));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAnsatte();
    // Hent lista på nytt når innlogginga endrar seg. Utan dette ville
    // alleAnsatte spegle økta ved oppstart (typisk tom / anon), og ikkje
    // den innlogga brukaren sin butikk – så namn viste «?» etter innlogging.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshAnsatte();
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshAnsatte]);

  const ansatte = useMemo(() => alleAnsatte.filter((a) => a.aktiv), [alleAnsatte]);

  const findAnsatt = useCallback(
    (id: EmployeeId | null | undefined): Employee => alleAnsatte.find((a) => a.id === id) || { ...TOMT_ANSATT, id: id || '' },
    [alleAnsatte]
  );
  const finnButikk = useCallback(
    (id?: string | null): Butikk | undefined => butikkar.find((b) => b.id === id),
    [butikkar]
  );
  const isLeder = useCallback(
    (id: EmployeeId | null | undefined): boolean => !!alleAnsatte.find((a) => a.id === id)?.leder,
    [alleAnsatte]
  );

  const callAdmin = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('ansatte-admin', { body: { action, ...payload } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const createAnsatt: AnsatteState['createAnsatt'] = async (input) => {
    const id = input.navn.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { pin, ...rest } = input;
    // Servaren lagar det sikre passordet av PIN-en; `password` er reserve for
    // ein servar utan PIN_PEPPER.
    await callAdmin('create', { id, ...rest, pin, password: pinToPassword(pin) });
    await refreshAnsatte();
    toast('Tilsett oppretta');
  };


  const updateAnsatt: AnsatteState['updateAnsatt'] = async (id, patch) => {
    const { data, error } = await supabase.from('ansatte').update(patch).eq('id', id).select(KOLONNER).single();
    if (error) throw error;
    setAlleAnsatte((prev) => prev.map((a) => (a.id === id ? mapAnsatt({ ...data, sats: patch.sats ?? a.sats }) : a)));
    toast('Tilsett oppdatert');
  };

  const setAktiv: AnsatteState['setAktiv'] = async (id, aktiv) => {
    await callAdmin(aktiv ? 'reactivate' : 'deactivate', { id });
    await refreshAnsatte();
    toast(aktiv ? 'Tilsett reaktivert' : 'Tilsett deaktivert');
  };

  const resetPin: AnsatteState['resetPin'] = async (id, pin) => {
    await callAdmin('resetpin', { id, pin, password: pinToPassword(pin) });
    toast('PIN nullstilt');
  };

  const updateEmail: AnsatteState['updateEmail'] = async (id, email) => {
    await callAdmin('updateemail', { id, email });
    await refreshAnsatte();
    toast('E-post oppdatert');
  };

  const value = useMemo<AnsatteState>(
    () => ({ loading, ansatte, alleAnsatte, loginAnsatte, butikkar, finnButikk, findAnsatt, isLeder, refreshAnsatte, createAnsatt, updateAnsatt, setAktiv, resetPin, updateEmail }),
    [loading, ansatte, alleAnsatte, loginAnsatte, butikkar, finnButikk, findAnsatt, isLeder, refreshAnsatte]
  );

  return <AnsatteContext.Provider value={value}>{children}</AnsatteContext.Provider>;
}

export function useAnsatte() {
  const ctx = useContext(AnsatteContext);
  if (!ctx) throw new Error('useAnsatte must be used within AnsatteProvider');
  return ctx;
}
