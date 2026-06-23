import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ViewMode = 'auto' | 'mobile' | 'desktop';

const STORAGE_KEY = 'mekk-olen-viewmode';
const ORDER: ViewMode[] = ['auto', 'mobile', 'desktop'];

interface ViewModeState {
  mode: ViewMode;
  cycle: () => void;
}

const ViewModeContext = createContext<ViewModeState | null>(null);

function isViewMode(v: string | null): v is ViewMode {
  return v === 'auto' || v === 'mobile' || v === 'desktop';
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isViewMode(stored) ? stored : 'auto';
  });

  useEffect(() => {
    if (mode === 'auto') {
      document.documentElement.removeAttribute('data-viewmode');
    } else {
      document.documentElement.setAttribute('data-viewmode', mode);
    }
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const cycle = () => setMode((m) => ORDER[(ORDER.indexOf(m) + 1) % ORDER.length]);

  return (
    <ViewModeContext.Provider value={{ mode, cycle }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
  return ctx;
}
