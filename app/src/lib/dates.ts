// Date/time helpers — ported from the original prototype's logic 1:1.
// Dates are always 'YYYY-MM-DD' strings, times are 'HH:MM' strings.

export const MND = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];
export const UKE_KORT = ['MÅN', 'TYS', 'ONS', 'TOR', 'FRE', 'LAU', 'SØN'];
export const UKE_FULL = ['måndag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag', 'søndag'];
export const DAG_IDX: Record<string, number> = { man: 0, tir: 1, ons: 2, tor: 3, fre: 4, lau: 5 };

export const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDate = (s: string) => {
  const p = s.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
};

export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export const weekdayIdx = (s: string) => (parseDate(s).getDay() + 6) % 7;
export const mondayOf = (s: string) => addDays(s, -weekdayIdx(s));

export const isoWeek = (s: string) => {
  const d = parseDate(s);
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w1 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
};

export const today = () => ymd(new Date());

export const weekDates = (ws: string) => [0, 1, 2, 3, 4, 5].map((i) => addDays(ws, i));

export const shiftMonth = (anchor: string, n: number) => {
  let [y, m] = anchor.split('-').map(Number);
  m = m - 1 + n;
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return `${y}-${pad(m + 1)}`;
};

export const mins = (t: string | null | undefined) => {
  const p = (t || '0:0').split(':');
  return Number(p[0]) * 60 + Number(p[1]);
};

export const dur = (a: string, b: string) => (mins(b) - mins(a)) / 60;

export const timar = (e: { start: string; slutt: string; pause?: number } | null | undefined) =>
  e ? Math.max(0, (mins(e.slutt) - mins(e.start) - (e.pause || 0)) / 60) : 0;

export const fmt = (n: number) => (Math.round(n * 4) / 4).toString().replace('.', ',');

export const fmtKr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`;

export const datoKort = (s: string | null | undefined) => {
  if (!s) return '';
  const d = parseDate(s);
  return `${d.getDate()}. ${MND[d.getMonth()].slice(0, 3)}`;
};

export const fullDatoTekst = (s: string) => {
  const d = parseDate(s);
  const wi = weekdayIdx(s);
  const dag = UKE_FULL[wi];
  return `${dag.charAt(0).toUpperCase()}${dag.slice(1)} ${d.getDate()}. ${MND[d.getMonth()]}`;
};
