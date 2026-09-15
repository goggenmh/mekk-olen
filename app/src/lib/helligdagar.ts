import { ymd, addDays } from './dates';

// Reknar ut påskesundag (Meeus/Jones/Butcher-algoritmen) og returnerer ymd.
function paaskesundag(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = april
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(new Date(year, month - 1, day));
}

const cache: Record<number, Record<string, string>> = {};

/** Alle norske offentlege heilagdagar (raude dagar) for eit år: { 'YYYY-MM-DD': namn }. */
export function helligdagarForAar(year: number): Record<string, string> {
  if (cache[year]) return cache[year];
  const p = paaskesundag(year);
  const m: Record<string, string> = {
    [`${year}-01-01`]: 'Nyttårsdag',
    [addDays(p, -3)]: 'Skjærtorsdag',
    [addDays(p, -2)]: 'Langfredag',
    [p]: 'Første påskedag',
    [addDays(p, 1)]: 'Andre påskedag',
    [addDays(p, 39)]: 'Kristi himmelfartsdag',
    [addDays(p, 49)]: 'Første pinsedag',
    [addDays(p, 50)]: 'Andre pinsedag',
    [`${year}-05-01`]: 'Arbeidarnas dag',
    [`${year}-05-17`]: 'Grunnlovsdagen',
    [`${year}-12-25`]: 'Første juledag',
    [`${year}-12-26`]: 'Andre juledag',
  };
  cache[year] = m;
  return m;
}

/** Namnet på heilagdagen for ein dato, eller null om det ikkje er ein raud dag. */
export function helligdagFor(dateStr: string): string | null {
  const year = Number(dateStr.slice(0, 4));
  if (!year) return null;
  return helligdagarForAar(year)[dateStr] || null;
}
