import type { Employee } from '../constants';
import type { TimeEntry } from '../types';
import { timar } from './dates';

// Forskotstrekk etter reglane frå Skatteetaten, forenkla:
// - Skattekort: prosenttrekket frå skattekortet. (Tabelltrekk krev
//   trekktabellane; skriv då inn prosentsatsen frå skattekortet som eit anslag.)
// - Frikort: ikkje trekk før frikortbeløpet er brukt opp i året, deretter 50 %.
// - Ikkje registrert skattekort: 50 % trekk, slik regelverket krev.
// Dette er eit anslag for leiaren. Lønssystemet/a-meldinga er fasit.

export type Skattetype = 'skattekort' | 'frikort';

export interface Trekk {
  brutto: number;
  trekk: number;
  netto: number;
  /** Kort forklaring til leiaren, t.d. «Frikort: 12 300 kr att». */
  forklaring: string;
  /** Sant når skattekort manglar og 50 % blir trekt. */
  manglarKort: boolean;
}

const kr = (n: number) => Math.round(n).toLocaleString('nb-NO');

export function forskotstrekk(a: Employee, brutto: number, tidlegareIAar: number): Trekk {
  if (a.skattetype === 'skattekort') {
    const pst = a.skatteprosent ?? 0;
    const trekk = Math.floor((brutto * pst) / 100);
    return { brutto, trekk, netto: brutto - trekk, forklaring: `Skattekort ${String(pst).replace('.', ',')} %`, manglarKort: false };
  }
  if (a.skattetype === 'frikort') {
    const grense = a.frikortgrense ?? 0;
    const att = Math.max(0, grense - tidlegareIAar);
    const over = Math.max(0, brutto - att);
    const trekk = Math.floor(over * 0.5);
    const forklaring = over > 0
      ? `Frikort brukt opp – 50 % av ${kr(over)} kr`
      : `Frikort: ${kr(att - brutto)} kr att etter denne`;
    return { brutto, trekk, netto: brutto - trekk, forklaring, manglarKort: false };
  }
  const trekk = Math.floor(brutto * 0.5);
  return { brutto, trekk, netto: brutto - trekk, forklaring: 'Manglar skattekort – 50 % trekk', manglarKort: true };
}

/** Godkjent bruttoløn for ein tilsett i eit datointervall [fra, til). */
export function godkjentBrutto(a: Employee, entries: TimeEntry[], fra: string, til: string): number {
  if (a.lonn !== 'time') return 0;
  return entries
    .filter((e) => e.ansatt === a.id && e.status === 'godkjent' && e.date >= fra && e.date < til)
    .reduce((s, e) => s + timar(e), 0) * (a.sats || 0);
}

/** Tidlegare løn som er registrert manuelt under Tilsette – gjeld berre for det året. */
export function tidlegareIAar(a: Employee, ar: number) {
  const gjeld = a.tidlegare_ar === ar;
  return { mekk: gjeld ? a.tidlegare_mekk ?? 0 : 0, andre: gjeld ? a.tidlegare_andre ?? 0 : 0 };
}

/**
 * Trekk for ein periode. For frikortet tel alt som alt er tent same år før
 * perioden: godkjende timar i appen + manuelt registrert løn før appen og
 * anna skattbar inntekt (andre arbeidsgivarar, utbetalte feriepengar).
 */
export function trekkForPeriode(a: Employee, entries: TimeEntry[], fra: string, til: string): Trekk {
  const brutto = godkjentBrutto(a, entries, fra, til);
  const t = tidlegareIAar(a, Number(fra.slice(0, 4)));
  const tidlegare = godkjentBrutto(a, entries, `${fra.slice(0, 4)}-01-01`, fra) + t.mekk + t.andre;
  return forskotstrekk(a, brutto, tidlegare);
}

// Feriepengar (ferielova): ein prosent av løna som er tent i året, utbetalt
// året etter. Feriepengar er ikkje sjølv med i grunnlaget.
export const STANDARD_FERIEPENGESATS = 10.2;
export const FERIEPENGESATSAR: { sats: number; tekst: string }[] = [
  { sats: 10.2, tekst: '10,2 % – lovfesta (4 veker + 1 dag)' },
  { sats: 12, tekst: '12 % – avtalefesta (5 veker)' },
  { sats: 12.5, tekst: '12,5 % – over 60 år, lovfesta' },
  { sats: 14.3, tekst: '14,3 % – over 60 år, avtalefesta' },
];

export interface Feriepengar {
  sats: number;
  /** Opptent av godkjende timar i perioden. */
  periode: number;
  /** Opptent hittil i året (til og med perioden), inkl. løn frå MEKK før appen. */
  iAar: number;
}

/** Opptente feriepengar for perioden [fra, til) og hittil i året. Null for fastløn. */
export function feriepengar(a: Employee, entries: TimeEntry[], fra: string, til: string): Feriepengar | null {
  if (a.lonn !== 'time') return null;
  const sats = a.feriepengesats ?? STANDARD_FERIEPENGESATS;
  const ar = Number(fra.slice(0, 4));
  const periode = (godkjentBrutto(a, entries, fra, til) * sats) / 100;
  const grunnlagIAar = godkjentBrutto(a, entries, `${ar}-01-01`, til) + tidlegareIAar(a, ar).mekk;
  return { sats, periode, iAar: (grunnlagIAar * sats) / 100 };
}

export const SKATTETYPE_TEKST: Record<Skattetype, string> = {
  skattekort: 'Skattekort (prosenttrekk)',
  frikort: 'Frikort',
};
