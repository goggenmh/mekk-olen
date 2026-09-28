import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase, pinToPassword } from '../supabaseClient';
import type { Employee } from '../constants';
import { useAnsatte } from './AnsatteContext';

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
  const { alleAnsatte, findAnsatt } = useAnsatte();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Employee | null>(null);
  const [pick, setPick] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  // Hindrar at same PIN blir sendt inn to gonger samtidig.
  const submitting = useRef(false);
  // Enkel brute-force-sperre: låser PIN-panelet etter fleire feil forsøk.
  const feilForsok = useRef(0);
  const [laastTil, setLaastTil] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      const match = email ? alleAnsatte.find((a) => a.email === email) : null;
      // Foreldrelaus økt (ingen ansatt med den e-posten) – tøm ho lokalt så
      // ho ikkje ligg i vegen for neste innlogging.
      if (email && !match && alleAnsatte.length > 0) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
      setUser(match ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      const match = email ? alleAnsatte.find((a) => a.email === email) : null;
      setUser(match ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [alleAnsatte]);

  const tryLogin = async (employee: Employee, candidatePin: string) => {
    if (submitting.current) return;
    submitting.current = true;
    const creds = { email: employee.email, password: pinToPassword(candidatePin) };
    const erFeilPin = (e: { message?: string } | null) => !!e && /invalid login credentials/i.test(e.message || '');
    try {
      // Start alltid frå rein tilstand. Ei gammal økt som ligg lagra i
      // nettlesaren (typisk Georg, som oftast er den innlogga) kan elles
      // kollidere med ny innlogging og få rett PIN til å bli avvist.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      let { error } = await supabase.auth.signInWithPassword(creds);
      // Mellombels feil (auth-klienten ikkje klar, nettverk) – prøv ein gong
      // til, slik at ein rett PIN ikkje blir avvist ved uhell.
      if (error && !erFeilPin(error)) {
        await new Promise((r) => setTimeout(r, 400));
        ({ error } = await supabase.auth.signInWithPassword(creds));
      }
      if (error) {
        if (erFeilPin(error)) {
          feilForsok.current += 1;
          if (feilForsok.current >= 5) {
            feilForsok.current = 0;
            setLaastTil(Date.now() + 30000);
            setFeil('For mange forsøk – vent 30 sekund før du prøver igjen.');
            setPin('');
            return;
          }
          setFeil('Feil PIN – prøv igjen');
        } else {
          setFeil('Innlogging feila – prøv igjen');
        }
        setPin('');
      } else {
        feilForsok.current = 0;
        setPick(null);
        setPin('');
        setFeil(null);
      }
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
        // Ikkje vel ein ukjend/tom brukar (kan skje viss lista ikkje er lasta).
        if (!emp.email) return;
        setPick(emp);
        setPin('');
        setFeil(null);
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
    // findAnsatt MÅ vere med: elles brukar pickUser eit utdatert oppslag frå
    // før ansattlista var lasta, og vel ein «tom» brukar (? utan namn/e-post).
    [loading, user, pick, pin, feil, findAnsatt, laastTil]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
