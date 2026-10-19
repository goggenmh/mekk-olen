import { useAuth } from '../context/AuthContext';
import type { Employee } from '../constants';
import { fmtKr } from './dates';
import { erLeiar } from './view';

/**
 * Løn er privat: leiarar ser alle, andre berre si eiga. Databasen gir heller
 * ikkje ut timesatsen til andre enn leiarar, så eigen sats kjem frå profilen.
 * Returnerer null når lønna ikkje skal visast.
 */
export function useLonTekst() {
  const { user } = useAuth();
  const leiar = erLeiar(user);
  return (a: Employee, timar: number): string | null => {
    const eigen = a.id === user?.id;
    if (!leiar && !eigen) return null;
    if (a.lonn !== 'time') return 'Fastløn';
    const sats = eigen ? user?.sats ?? a.sats : a.sats;
    return fmtKr(timar * (sats || 0));
  };
}
