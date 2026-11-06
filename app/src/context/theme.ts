import { createContext, useContext } from 'react';

// Konteksten og hooken (ingen komponentar) så react-refresh/HMR verkar reint for
// ThemeProvider-fila.
export interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
