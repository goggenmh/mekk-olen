import type { Employee } from '../constants';
import type { TimeEntry } from '../types';
import { MND, timar, weekdayIdx } from './dates';
import { trekkForPeriode } from './skatt';

// Lønsgrunnlaget som ei ekte Excel-fil (.xlsx) med formatering, summar og
// eit eige ark med timane dag for dag. exceljs er stort, så det blir berre
// lasta ned når nokon faktisk trykkjer på knappen.

const NAVY = 'FF002337';
const TEAL = 'FF0F5E6B';
const SEBRA = 'FFF2F6F7';
const SUM_BG = 'FFE3ECEE';
const GRAA = 'FF667085';
const RAUD = 'FFB42318';
const KANT = 'FFD0D9DC';

const KR = '#,##0 "kr";-#,##0 "kr";"–"';
const SATS = '#,##0.00 "kr"';
const TIMAR = '0.00';
const VEKEDAG = ['måndag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag', 'søndag'];

const utcDato = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const rund2 = (n: number) => Math.round(n * 100) / 100;

interface Val {
  ansatte: Employee[];
  entries: TimeEntry[];
  /** ÅÅÅÅ-MM */
  maaned: string;
  butikk: string;
}

export const lonsfilNamn = ({ butikk, maaned }: Pick<Val, 'butikk' | 'maaned'>) =>
  `${butikk.replace(/\s+/g, '-')}-lonsgrunnlag-${maaned}.xlsx`;

/** Lagar arbeidsboka og returnerer innhaldet (.xlsx). */
export async function lagLonsfil({ ansatte, entries, maaned, butikk }: Val): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const [ar, mnd] = maaned.split('-').map(Number);
  const mndNamn = MND[mnd - 1];
  const fra = `${maaned}-01`;
  const til = `${mnd === 12 ? ar + 1 : ar}-${String(mnd === 12 ? 1 : mnd + 1).padStart(2, '0')}-01`;
  const godkjende = entries.filter((e) => e.status === 'godkjent' && e.date >= fra && e.date < til);
  const no = new Date();
  const laga = `${no.getDate()}.${no.getMonth() + 1}.${no.getFullYear()} kl. ${String(no.getHours()).padStart(2, '0')}:${String(no.getMinutes()).padStart(2, '0')}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = `${butikk} – vakt & timestyring`;
  wb.created = no;

  type Ark = ReturnType<typeof wb.addWorksheet>;
  const kantar = (rad: ReturnType<Ark['getRow']>, fra_: number, til_: number) => {
    for (let c = fra_; c <= til_; c++) rad.getCell(c).border = { bottom: { style: 'thin', color: { argb: KANT } } };
  };
  /** Tittel, undertittel og kolonneoverskrifter øvst på eit ark. */
  const toppen = (ark: Ark, tittel: string, under: string, overskrifter: string[], talKolonnar: number[] = []) => {
    const n = overskrifter.length;
    ark.mergeCells(1, 1, 1, n);
    const t = ark.getCell(1, 1);
    t.value = tittel;
    t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    t.alignment = { vertical: 'middle', indent: 1 };
    ark.getRow(1).height = 34;

    ark.mergeCells(2, 1, 2, n);
    const u = ark.getCell(2, 1);
    u.value = under;
    u.font = { name: 'Calibri', size: 10, italic: true, color: { argb: GRAA } };
    u.alignment = { vertical: 'middle', indent: 1 };
    ark.getRow(2).height = 20;

    const h = ark.getRow(4);
    overskrifter.forEach((o, i) => {
      const c = h.getCell(i + 1);
      c.value = o;
      c.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      c.alignment = { vertical: 'middle', horizontal: talKolonnar.includes(i + 1) ? 'right' : 'left', wrapText: true, indent: 1 };
    });
    h.height = 22;
    ark.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
    ark.pageSetup = {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: '4:4',
    };
    ark.headerFooter.oddFooter = `&L&8${butikk} – lønsgrunnlag ${mndNamn} ${ar}&R&8Side &P av &N`;
  };
  const sebra = (rad: ReturnType<Ark['getRow']>, i: number, n: number) => {
    if (i % 2 === 1) for (let c = 1; c <= n; c++) rad.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEBRA } };
  };
  const sumRad = (ark: Ark, radNr: number, n: number) => {
    const r = ark.getRow(radNr);
    for (let c = 1; c <= n; c++) {
      const celle = r.getCell(c);
      celle.font = { name: 'Calibri', bold: true };
      celle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUM_BG } };
      celle.border = { top: { style: 'medium', color: { argb: TEAL } } };
      celle.alignment = { vertical: 'middle', indent: 1 };
    }
    r.height = 22;
    return r;
  };

  // ---- Ark 1: lønsgrunnlag per tilsett ----
  const ark = wb.addWorksheet('Lønsgrunnlag', { properties: { tabColor: { argb: TEAL } } });
  const hovud = ['Tilsett', 'Lønstype', 'Timar', 'Sats', 'Brutto', 'Forskotstrekk', 'Netto', 'Skatt'];
  toppen(ark, `${butikk} – lønsgrunnlag ${mndNamn} ${ar}`, `Berre godkjende timar · Laga ${laga}`, hovud, [3, 4, 5, 6, 7]);
  ark.columns = [
    { width: 26 }, { width: 12 }, { width: 10, style: { numFmt: TIMAR } }, { width: 13, style: { numFmt: SATS } },
    { width: 14, style: { numFmt: KR } }, { width: 15, style: { numFmt: KR } }, { width: 14, style: { numFmt: KR } }, { width: 38 },
  ];

  const sortert = [...ansatte].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
  let radNr = 5;
  sortert.forEach((a, i) => {
    const tot = rund2(godkjende.filter((e) => e.ansatt === a.id).reduce((s, e) => s + timar(e), 0));
    const r = ark.getRow(radNr);
    if (a.lonn !== 'time') {
      r.values = [a.navn, 'Fastløn', tot, null, null, null, null, 'Fastløn – blir ikkje rekna her'];
      r.getCell(8).font = { name: 'Calibri', color: { argb: GRAA }, italic: true };
    } else {
      const s = trekkForPeriode(a, entries, fra, til);
      r.values = [a.navn, 'Timeløn', tot, a.sats || 0, Math.round(s.brutto), s.trekk, Math.round(s.netto), s.forklaring];
      if (s.manglarKort) r.getCell(8).font = { name: 'Calibri', color: { argb: RAUD }, bold: true };
    }
    r.height = 20;
    // Innrykk per celle, så tal og tekst ikkje står klistra inntil kvarandre.
    for (let c = 1; c <= hovud.length; c++) {
      r.getCell(c).alignment = { vertical: 'middle', indent: 1, horizontal: c >= 3 && c <= 7 ? 'right' : 'left' };
    }
    r.getCell(1).font = { name: 'Calibri', bold: true };
    sebra(r, i, hovud.length);
    kantar(r, 1, hovud.length);
    radNr++;
  });
  const sisteData = radNr - 1;
  if (sortert.length) ark.autoFilter = { from: { row: 4, column: 1 }, to: { row: sisteData, column: hovud.length } };

  const s = sumRad(ark, radNr, hovud.length);
  s.getCell(1).value = 'Sum';
  for (const [kol, bokstav] of [[3, 'C'], [5, 'E'], [6, 'F'], [7, 'G']] as const) {
    s.getCell(kol).value = { formula: `SUM(${bokstav}5:${bokstav}${Math.max(5, sisteData)})` };
  }

  ark.mergeCells(radNr + 2, 1, radNr + 2, hovud.length);
  const merk = ark.getCell(radNr + 2, 1);
  merk.value = 'Forskotstrekket er eit anslag ut frå skatteopplysningane under Tilsette. Lønssystemet/a-meldinga er fasit. Raud skatt = manglar skattekort (50 % trekk).';
  merk.font = { name: 'Calibri', size: 9, italic: true, color: { argb: GRAA } };
  merk.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  ark.getRow(radNr + 2).height = 30;

  // ---- Ark 2: timane dag for dag ----
  const dag = wb.addWorksheet('Timar per dag', { properties: { tabColor: { argb: NAVY } } });
  const dHovud = ['Dato', 'Vekedag', 'Tilsett', 'Start', 'Slutt', 'Pause (min)', 'Timar'];
  toppen(dag, `Godkjende timar – ${mndNamn} ${ar}`, `${butikk} · Laga ${laga}`, dHovud, [6, 7]);
  dag.columns = [
    { width: 13, style: { numFmt: 'dd.mm.yyyy' } }, { width: 12 }, { width: 26 }, { width: 9 }, { width: 9 },
    { width: 12 }, { width: 10, style: { numFmt: TIMAR } },
  ];
  const namn = new Map(ansatte.map((a) => [a.id, a.navn]));
  const linjer = [...godkjende].sort((a, b) =>
    a.date.localeCompare(b.date) || (namn.get(a.ansatt) || '').localeCompare(namn.get(b.ansatt) || '', 'nb') || a.start.localeCompare(b.start));
  let dRad = 5;
  linjer.forEach((e, i) => {
    const r = dag.getRow(dRad);
    r.values = [utcDato(e.date), VEKEDAG[weekdayIdx(e.date)], namn.get(e.ansatt) || e.ansatt, e.start, e.slutt, e.pause || 0, rund2(timar(e))];
    for (const c of [2, 4, 5, 6]) r.getCell(c).alignment = { horizontal: 'center' };
    r.height = 18;
    sebra(r, i, dHovud.length);
    kantar(r, 1, dHovud.length);
    dRad++;
  });
  if (linjer.length) dag.autoFilter = { from: { row: 4, column: 1 }, to: { row: dRad - 1, column: dHovud.length } };
  const ds = sumRad(dag, dRad, dHovud.length);
  ds.getCell(1).value = 'Sum';
  ds.getCell(7).value = { formula: `SUM(G5:G${Math.max(5, dRad - 1)})` };

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

/** Lagar lønsfila og lastar henne ned i nettlesaren. */
export async function lastNedLonsfil(val: Val) {
  const buffer = await lagLonsfil(val);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const lenke = document.createElement('a');
  lenke.href = url;
  lenke.download = lonsfilNamn(val);
  lenke.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
