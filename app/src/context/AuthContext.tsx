import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      const match = email ? alleAnsatte.find((a) => a.email === email) : null;
      setUser(match ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      const match = email ? alleAnsatte.find((a) => a.email === email) : null;
      setUser(match ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alleAnsatte]);

  const tryLogin = async (employee: Employee, candidatePin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: employee.email,
      password: pinToPassword(candidatePin),
    });
    if (error) {
      setFeil(error.message || 'Innlogging feila');
      setPin('');
    } else {
      setPick(null);
      setPin('');
      setFeil(null);
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
        setFeil(null);
      },
      back: () => {
        setPick(null);
        setPin('');
        setFeil(null);
      },
      pressDigit: (d: string) => {
        if (pin.length >= 4 || !pick) return;
        const next = pin + d;
        setPin(next);
        setFeil(null);
        if (next.length === 4) {
          setTimeout(() => tryLogin(pick, next), 120);
        }
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
