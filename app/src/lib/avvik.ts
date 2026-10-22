import { dur, fmt, fullDatoTekst, timar } from './dates';
import type { Shift, TimeEntry } from '../types';

/** Under eit kvarter regnar vi ikkje som avvik (avrunding, pausar o.l.). */
const TERSKEL = 0.25;

/** Planlagde timar for ein tilsett ein dag, ut frå vaktplanen. */
export const planTimar = (shifts: Shift[], ansatt: string, dato: string) =>
  shifts.filter((s) => s.ansatt === ansatt && s.date === dato).reduce((sum, s) => sum + Math.max(0, dur(s.start, s.slutt)), 0);

/** Førte timar for ein tilsett ein dag. */
export const forteTimar = (entries: TimeEntry[], ansatt: string, dato: string) =>
  entries.filter((e) => e.ansatt === ansatt && e.date === dato).reduce((sum, e) => sum + timar(e), 0);

export interface Avvik { ansatt: string; dato: string; plan: number; fort: number }

/** Er førte timar ein dag ulike frå vaktplanen? */
export const erAvvik = (plan: number, fort: number) => Math.abs(fort - plan) >= TERSKEL;

/**
 * Dagar der timane som ventar på godkjenning ikkje stemmer med vaktplanen
 * (fleire eller færre timar enn vakta, eller timar utan vakt).
 */
export function avvikForGodkjenning(entries: TimeEntry[], shifts: Shift[], ansatt: string, datoar: string[]): Avvik[] {
  return datoar
    .filter((d) => entries.some((e) => e.ansatt === ansatt && e.date === d && e.status === 'venter'))
    .map((d) => ({ ansatt, dato: d, plan: planTimar(shifts, ansatt, d), fort: forteTimar(entries, ansatt, d) }))
    .filter((a) => erAvvik(a.plan, a.fort));
}

/** «Tysdag 21. oktober: vakt 4 t, ført 5 t» */
export const avvikTekst = (a: Avvik) =>
  `${fullDatoTekst(a.dato)}: ${a.plan > 0 ? `vakt ${fmt(a.plan)} t` : 'ikkje på vaktplanen'}, ført ${fmt(a.fort)} t`;
