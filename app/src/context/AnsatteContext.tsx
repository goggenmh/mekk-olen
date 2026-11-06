import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, pinToPassword } from '../supabaseClient';
import { toast } from '../lib/toast';
import { type Employee, type EmployeeId, type Butikk } from '../constants';
import { AnsatteContext, PRIVATE_FELT, mapAnsatt, type AnsatteState } from './ansatte';

const TOMT_ANSATT: Employee = { id: '', navn: '', rolle: '', lonn: 'time', sats: 0, farge: '#999', init: '?', email: '', telefon: '', leder: false, aktiv: false };
// Alle kolonnar utanom timesatsen (sats), som berre leiarar får lese.
const KOLONNER = 'id, navn, rolle, lonn, farge, init, email, telefon, leder, aktiv, created_at, butikk_id, konsern_admin, feriedagar';
const mapButikk = (r: any): Butikk => ({ id: r.id, namn: r.namn, farge: r.farge || '#11788a', aktiv: r.aktiv, moduler: Array.isArray(r.moduler) ? r.moduler : null, tema: r.tema ?? null });

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
      okt.session ? supabase.rpc('lonsdata') : tomt,
    ]);
    if (!ansRes.error && ansRes.data) {
      // Leiarar får sats og skatteopplysningar herfrå; andre får ingenting.
      const privat = new Map(((satsRes.data as { id: string }[] | null) || []).map((r) => [r.id, r]));
      setAlleAnsatte(ansRes.data.map((r: any) => mapAnsatt({ sats: 0, ...r, ...privat.get(r.id) })));
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
    return id;
  };


  const updateAnsatt: AnsatteState['updateAnsatt'] = async (id, patch) => {
    const { data, error } = await supabase.from('ansatte').update(patch).eq('id', id).select(KOLONNER).single();
    if (error) throw error;
    // Svaret har ikkje dei private felta (ikkje lesbare), så dei kjem frå patch/førre verdi.
    const privat = (a: Employee) => Object.fromEntries(PRIVATE_FELT.map((k) => [k, patch[k] !== undefined ? patch[k] : a[k]]));
    setAlleAnsatte((prev) => prev.map((a) => (a.id === id ? mapAnsatt({ ...data, ...privat(a) }) : a)));
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
