import type { Employee } from '../constants';
import type { Ferie, Unavailable } from '../types';
import { addDays, parseDate, today } from './dates';
import { helligdagFor } from './helligdagar';

/** Virkedagar i perioden: måndag–laurdag, utan raude dagar (som ferielova reknar). */
export function virkedagar(fra: string, til: string, innanforAar?: number): number {
  let n = 0;
  for (let d = fra; d <= til; d = addDays(d, 1)) {
    if (innanforAar && Number(d.slice(0, 4)) !== innanforAar) continue;
    if (parseDate(d).getDay() === 0 || helligdagFor(d)) continue;
    n++;
  }
  return n;
}

export interface Feriesaldo {
  /** Godkjend ferie som er avvikla (til og med i dag). */
  brukt: number;
  /** Godkjend ferie fram i tid. */
  planlagt: number;
  /** Søknader som ventar på svar. */
  sokt: number;
}

/** Feriedagar for éin tilsett i eit år (berre typen «Ferie» blir talt). */
export function feriesaldo(a: Employee, ferie: Ferie[], aar = Number(today().slice(0, 4))): Feriesaldo {
  const t = today();
  let brukt = 0, planlagt = 0, sokt = 0;
  for (const f of ferie) {
    if (f.ansatt !== a.id || f.type !== 'Ferie' || !f.fra || !f.til || f.status === 'avslatt') continue;
    if (f.status === 'ventar') { sokt += virkedagar(f.fra, f.til, aar); continue; }
    // Del perioden ved i dag: før = brukt, etter = planlagt.
    const bruktTil = f.til < t ? f.til : t;
    if (f.fra <= bruktTil) brukt += virkedagar(f.fra, bruktTil, aar);
    const planFra = f.fra > t ? f.fra : addDays(t, 1);
    if (planFra <= f.til) planlagt += virkedagar(planFra, f.til, aar);
  }
  return { brukt, planlagt, sokt };
}

/** Andre tilsette som er borte (godkjend eller søkt) i same periode. */
export function overlappar(f: Pick<Ferie, 'ansatt' | 'fra' | 'til'> & { id?: string }, alle: Ferie[]): Ferie[] {
  if (!f.fra || !f.til) return [];
  return alle.filter((x) => x.id !== f.id && x.ansatt !== f.ansatt && x.status !== 'avslatt' && x.fra && x.til && x.fra <= f.til! && f.fra! <= x.til);
}

/** Søknader som ventar på svar (til varsel for leiarar). */
export const ventandeFerie = (ferie: Ferie[]) => ferie.filter((f) => f.status === 'ventar').length;

/** Raude dagar («kan ikkje jobbe») slått saman til periodar: same person,
 *  same grunn og dagar på rad. */
export interface RaudPeriode { ansatt: string; fra: string; til: string; grunn: string | null; dagar: Unavailable[] }
export function raudePeriodar(liste: Unavailable[]): RaudPeriode[] {
  const sortert = [...liste].sort((a, b) => a.ansatt.localeCompare(b.ansatt) || a.dato.localeCompare(b.dato));
  const ut: RaudPeriode[] = [];
  for (const u of sortert) {
    const sist = ut[ut.length - 1];
    if (sist && sist.ansatt === u.ansatt && (sist.grunn || '') === (u.grunn || '') && addDays(sist.til, 1) === u.dato) {
      sist.til = u.dato;
      sist.dagar.push(u);
    } else {
      ut.push({ ansatt: u.ansatt, fra: u.dato, til: u.dato, grunn: u.grunn, dagar: [u] });
    }
  }
  return ut.sort((a, b) => a.fra.localeCompare(b.fra));
}
