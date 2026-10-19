import { talDagar, today } from './dates';
import type { Order } from '../types';

/** Kor mange dagar ei bestilling kan stå i kvar status før ho treng blikk. */
const GRENSE: Record<string, number> = { ny: 7, tinga: 14, komen: 10 };

/**
 * Dagar bestillinga har vore liggjande, og om ho er over grensa.
 * «Komen» blir rekna frå då kunden vart varsla (eller bestillingsdatoen).
 */
export function alder(o: Order, t = today()): { dagar: number; gammal: boolean } {
  const grense = GRENSE[o.status];
  const fra = o.status === 'komen' && o.varsla ? o.varsla : o.dato;
  if (!grense || !fra || fra > t) return { dagar: 0, gammal: false };
  const dagar = talDagar(fra, t) - 1;
  return { dagar, gammal: dagar >= grense };
}

export const ALDER_TEKST: Record<string, string> = {
  ny: 'ikkje bestilt',
  tinga: 'ikkje komen',
  komen: 'ikkje henta',
};

/** Telefonnummer klart for tel:/sms:-lenker (berre siffer og +). */
export const reinTelefon = (t: string) => t.replace(/[^\d+]/g, '');
