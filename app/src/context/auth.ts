import { createContext, useContext } from 'react';
import type { Employee } from '../constants';

// Konteksten og hooken (ingen komponentar) så react-refresh/HMR verkar reint for
// AuthProvider-fila.
export interface AuthState {
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

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
