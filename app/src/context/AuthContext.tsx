import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, pinToPassword } from '../supabaseClient';
import type { Employee } from '../constants';
import { useAnsatte, mapAnsatt } from './AnsatteContext';

interface AuthState {
  loading: boolean;
  user: Employee | null;
  /** The employee currently selected on the "who are you" screen, before PIN entry. */
  pick: Employee | null;
  pin: string;
  feil: string | null;
  pickUser: (id: string) => void;
  back: () => void;
  pressDigit: (d: string) => void;
  backspace: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Innlogginga byggjer på loginAnsatte (økt-uavhengig liste med alle
  // aktive tilsette på tvers av butikkar), ikkje den RLS-avgrensa
  // alleAnsatte – elles kan ei foreldrelaus økt tømme lista midt i
  // innlogginga.
  const { loginAnsatte } = useAnsatte();
  const findAnsatt = (id: string | null | undefined): Employee | undefined =>
    loginAnsatte.find((a) => a.id === id);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Employee | null>(null);
  const [pick, setPick] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  // Hindrar at same PIN blir sendt inn to gonger samtidig.
  const submitting = useRef(false);
  // Låser PIN-panelet medan servaren har sperra kontoen (sjå pin-login).
  const [laastTil, setLaastTil] = useState(0);

  // «Kven er eg?» blir henta frå databasen (min_profil) ut frå økta, så
  // innloggings-lista treng ikkje innehalde e-postar.
  useEffect(() => {
    let levande = true;
    const synk = async (harOkt: boolean) => {
      if (!harOkt) {
        if (levande) { setUser(null); setLoading(false); }
        return;
      }
      const { data, error } = await supabase.rpc('min_profil');
      if (!levande) return;
      if (!error) {
        const rad = (data as unknown[] | null)?.[0];
        if (!rad) {
          // Foreldrelaus økt (ingen aktiv tilsett for denne innlogginga) – tøm
          // ho lokalt så ho ikkje ligg i vegen for neste innlogging.
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setUser(null);
        } else {
          const ny = mapAnsatt(rad);
          // Behald same objekt når ingenting er endra (t.d. ved token-fornying),
          // elles hentar appen alle data på nytt.
          setUser((prev) => (prev && JSON.stringify(prev) === JSON.stringify(ny) ? prev : ny));
        }
      }
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => synk(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Utsett: Supabase-kall direkte inne i denne callbacken kan låse auth-klienten.
      setTimeout(() => synk(!!session), 0);
    });
    return () => {
      levande = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const tryLogin = async (employee: Employee, candidatePin: string) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      // Start alltid frå rein tilstand, så ei gammal økt ikkje kolliderer.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      // Servaren sjekkar PIN, tel feil forsøk og gir tilbake ei økt. Det gamle
      // passordet blir sendt med så servaren kan flytte brukaren over til det
      // nye, sikre passordet første gong.
      const kall = () => supabase.functions.invoke('pin-login', {
        body: { id: employee.id, pin: candidatePin, legacy: pinToPassword(candidatePin) },
      });
      let { data, error } = await kall();
      // Nettverksfeil (ikkje svar frå servaren) – prøv éin gong til.
      if (error && !(error instanceof FunctionsHttpError)) {
        await new Promise((r) => setTimeout(r, 400));
        ({ data, error } = await kall());
      }
      if (error || !data?.access_token) {
        let svar: { kode?: string; sekund?: number; att?: number } = {};
        if (error instanceof FunctionsHttpError) svar = await error.context.json().catch(() => ({}));
        if (svar.kode === 'sperra') {
          const sek = svar.sekund ?? 900;
          setLaastTil(Date.now() + sek * 1000);
          setFeil(`For mange feil forsøk – prøv igjen om ${Math.ceil(sek / 60)} min.`);
        } else if (svar.kode === 'feil_pin') {
          setFeil(svar.att !== undefined && svar.att <= 2 ? `Feil PIN – ${svar.att} forsøk att` : 'Feil PIN – prøv igjen');
        } else if (svar.kode === 'deaktivert') {
          setFeil('Kontoen er deaktivert.');
        } else {
          setFeil('Innlogging feila – prøv igjen');
        }
        setPin('');
        return;
      }
      const { error: oktFeil } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (oktFeil) {
        setFeil('Innlogging feila – prøv igjen');
        setPin('');
        return;
      }
      setPick(null);
      setPin('');
      setFeil(null);
    } finally {
      submitting.current = false;
    }
  };

  const value: AuthState = useMemo(
    () => ({
      loading,
      user,
      pick,
      pin,
      feil,
      pickUser: (id: string) => {
        const emp = findAnsatt(id);
        // Ikkje vel ein ukjend brukar (kan skje viss lista ikkje er lasta).
        if (!emp) return;
        setPick(emp);
        setPin('');
        setFeil(null);
        setLaastTil(0); // Sperra gjeld per tilsett; servaren avgjer for den nye.
      },
      back: () => {
        setPick(null);
        setPin('');
        setFeil(null);
      },
      pressDigit: (d: string) => {
        if (!pick) return;
        if (Date.now() < laastTil) return; // sperra etter for mange feil forsøk
        setFeil(null);
        // Funksjonell oppdatering: byggjer alltid på nyaste PIN, så ingen
        // siffer går tapt sjølv om ein tastar raskt.
        setPin((prev) => {
          if (prev.length >= 4) return prev;
          const next = prev + d;
          if (next.length === 4) setTimeout(() => tryLogin(pick, next), 60);
          return next;
        });
      },
      backspace: () => {
        setPin((p) => p.slice(0, -1));
        setFeil(null);
      },
      logout: () => {
        supabase.auth.signOut();
        setPick(null);
        setPin('');
      },
    }),
    // loginAnsatte MÅ vere med: elles brukar pickUser eit utdatert oppslag
    // frå før lista var lasta, og vel ein «tom» brukar (? utan namn/e-post).
    [loading, user, pick, pin, feil, loginAnsatte, laastTil]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
