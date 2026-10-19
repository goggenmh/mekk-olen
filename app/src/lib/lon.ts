import { useAuth } from '../context/AuthContext';
import type { Employee } from '../constants';
import type { TimeEntry } from '../types';
import { feriepengar, trekkForPeriode, type Feriepengar, type Trekk } from './skatt';
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

/**
 * Den tilsette slik den innlogga har lov å sjå hen: leiarar ser alle med
 * sats og skatt; andre får berre seg sjølv (med eigne private felt frå
 * profilen). Returnerer null når løna ikkje skal visast.
 */
export function useLonsTilgang() {
  const { user } = useAuth();
  const leiar = erLeiar(user);
  return (a: Employee): Employee | null => {
    const eigen = a.id === user?.id;
    if (!leiar && !eigen) return null;
    if (!eigen || !user) return a;
    return {
      ...a,
      sats: user.sats ?? a.sats,
      skattetype: user.skattetype ?? a.skattetype,
      skatteprosent: user.skatteprosent ?? a.skatteprosent,
      frikortgrense: user.frikortgrense ?? a.frikortgrense,
      feriepengesats: user.feriepengesats ?? a.feriepengesats,
      tidlegare_ar: user.tidlegare_ar ?? a.tidlegare_ar,
      tidlegare_mekk: user.tidlegare_mekk ?? a.tidlegare_mekk,
      tidlegare_andre: user.tidlegare_andre ?? a.tidlegare_andre,
    };
  };
}

/** Brutto, forskotstrekk og netto for perioden [fra, til), eller 'fast'/null. */
export function useLonsTrekk() {
  const tilgang = useLonsTilgang();
  return (a: Employee, entries: TimeEntry[], fra: string, til: string): Trekk | 'fast' | null => {
    const synleg = tilgang(a);
    if (!synleg) return null;
    if (synleg.lonn !== 'time') return 'fast';
    return trekkForPeriode(synleg, entries, fra, til);
  };
}

/** Opptente feriepengar for perioden og hittil i år, med same tilgang som løna. */
export function useFeriepengar() {
  const tilgang = useLonsTilgang();
  return (a: Employee, entries: TimeEntry[], fra: string, til: string): Feriepengar | null => {
    const synleg = tilgang(a);
    return synleg ? feriepengar(synleg, entries, fra, til) : null;
  };
}
