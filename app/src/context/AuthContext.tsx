import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, pinToPassword } from '../supabaseClient';
import { ANSATTE, findAnsatt, type Employee } from '../constants';

interface AuthState {
  loading: boolean;
  user: Employee | null;
  /** The employee currently selected on the "who are you" screen, before PIN entry. */
  pick: Employee | null;
  pin: string;
  feil: boolean;
  pickUser: (id: string) => void;
  back: () => void;
  pressDigit: (d: string) => void;
  backspace: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Employee | null>(null);
  const [pick, setPick] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      const match = email ? ANSATTE.find((a) => a.email === email) : null;
      setUser(match ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      const match = email ? ANSATTE.find((a) => a.email === email) : null;
      setUser(match ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const tryLogin = async (employee: Employee, candidatePin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: employee.email,
      password: pinToPassword(candidatePin),
    });
    if (error) {
      setFeil(true);
      setPin('');
    } else {
      setPick(null);
      setPin('');
      setFeil(false);
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
        setPick(findAnsatt(id));
        setPin('');
        setFeil(false);
      },
      back: () => {
        setPick(null);
        setPin('');
        setFeil(false);
      },
      pressDigit: (d: string) => {
        if (pin.length >= 4 || !pick) return;
        const next = pin + d;
        setPin(next);
        setFeil(false);
        if (next.length === 4) {
          setTimeout(() => tryLogin(pick, next), 120);
        }
      },
      backspace: () => {
        setPin((p) => p.slice(0, -1));
        setFeil(false);
      },
      logout: () => {
        supabase.auth.signOut();
        setPick(null);
        setPin('');
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, user, pick, pin, feil]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
