import { addDays, today, weekdayIdx } from './dates';
import { helligdagFor } from './helligdagar';
import type { Shift, Ferie } from '../types';

// Framoverskodande driftsrisiko for dagleg leiar – det det reaktive
// varslingssenteret IKKJE dekkjer: bemanningsglipar og ferie-kollisjonar i
// dagane som kjem. Reine utrekningar over data som alt finst.
export interface DriftRisiko { dato: string; type: 'ubemanna' | 'ferie'; tal: number }

// Butikken er open måndag–laurdag (weekdayIdx 0–5) og ikkje på heilagdagar.
const opeDag = (d: string) => weekdayIdx(d) < 6 && !helligdagFor(d);

export function komandeRisiko(shifts: Shift[], ferie: Ferie[], dagar = 14, fra = today()): DriftRisiko[] {
  const ut: DriftRisiko[] = [];
  const godkjend = ferie.filter((f) => f.status === 'godkjend' && f.fra && f.til);
  for (let i = 0; i < dagar; i++) {
    const d = addDays(fra, i);
    if (!opeDag(d)) continue;
    const vakter = shifts.filter((s) => s.date === d).length;
    if (vakter === 0) { ut.push({ dato: d, type: 'ubemanna', tal: 0 }); continue; }
    // Kor mange ulike tilsette er borte (godkjend fri/ferie/kurs/sjukmeld) den dagen.
    const borte = new Set(godkjend.filter((f) => f.fra! <= d && d <= f.til!).map((f) => f.ansatt));
    if (borte.size >= 2) ut.push({ dato: d, type: 'ferie', tal: borte.size });
  }
  return ut;
}
