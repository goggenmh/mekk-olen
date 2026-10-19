import type { Employee } from '../constants';
import type { TimeEntry } from '../types';
import { timar, weekdayIdx } from './dates';
import { feriepengar, trekkForPeriode } from './skatt';

// Timelista som ein ekte PDF (A4) med samandrag, éi side per tilsett, og – for leiarar i månadsvisning – lønsgrunnlaget.
// jsPDF er stort, så det blir berre lasta ned når nokon trykkjer på knappen.

type RGB = [number, number, number];
const NAVY: RGB = [0, 35, 55];
const TEAL: RGB = [15, 94, 107];
const SEBRA: RGB = [242, 246, 247];
const SUM_BG: RGB = [227, 236, 238];
const GRAA: RGB = [102, 112, 133];
const RAUD: RGB = [180, 35, 24];
const GROEN: RGB = [6, 118, 71];
const ORANSJE: RGB = [181, 71, 8];
const DAG = ['mån', 'tys', 'ons', 'tor', 'fre', 'lau', 'søn'];

const t2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const kr = (n: number) => `${Math.round(n).toLocaleString('nb-NO').replace(/\s/g, ' ')} kr`;
const krSats = (n: number) => `${n.toFixed(2).replace('.', ',')} kr`;
const datoKort = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;

export interface TimelistePdfVal {
  ansatte: Employee[];
  entries: TimeEntry[];
  /** Alle datoar i perioden (ÅÅÅÅ-MM-DD). */
  datoar: string[];
  /** T.d. «Veke 43» eller «Oktober 2026». */
  tittel: string;
  /** T.d. «19.–24. oktober 2026» (kan vere tom). */
  undertittel: string;
  butikk: string;
  /** Tilsette der løn og skatt for perioden skal stå på sida deira. */
  visLon: string[];
  /** Leiar: tek med lønsgrunnlag (berre når maaned er sett). */
  medLon: boolean;
  /** ÅÅÅÅ-MM når perioden er ein heil månad, elles null. */
  maaned: string | null;
}

export const timelistePdfNamn = ({ butikk, tittel }: Pick<TimelistePdfVal, 'butikk' | 'tittel'>) =>
  `${butikk}-timeliste-${tittel}.pdf`.replace(/\s+/g, '-').toLowerCase();

export async function lagTimelistePdf(val: TimelistePdfVal): Promise<ArrayBuffer> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const { ansatte, entries, datoar, tittel, undertittel, butikk, medLon, maaned } = val;
  const visLon = new Set(val.visLon);
  const nesteDag = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const periodeFra = datoar[0];
  const periodeTil = nesteDag(datoar[datoar.length - 1]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const B = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const sisteY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const no = new Date();
  const laga = `${no.getDate()}.${no.getMonth() + 1}.${no.getFullYear()} kl. ${String(no.getHours()).padStart(2, '0')}:${String(no.getMinutes()).padStart(2, '0')}`;
  const iPerioden = new Set(datoar);
  const iPeriode = entries.filter((e) => iPerioden.has(e.date));
  const perAnsatt = [...ansatte]
    .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
    .map((a) => {
      const ef = iPeriode.filter((e) => e.ansatt === a.id).sort((x, y) => x.date.localeCompare(y.date) || x.start.localeCompare(y.start));
      const sum = (s?: TimeEntry['status']) => ef.filter((e) => !s || e.status === s).reduce((acc, e) => acc + timar(e), 0);
      return { a, ef, total: sum(), godkjent: sum('godkjent'), ventar: sum('venter') };
    })
    .filter((x) => x.ef.length > 0);

  /** Stor mørkeblå topp på første side, smal stripe på dei andre. */
  const topp = (stor: boolean, overskrift?: string) => {
    doc.setFillColor(...NAVY);
    if (stor) {
      doc.rect(0, 0, B, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(`Timeliste – ${tittel}`, M, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(200, 214, 220);
      doc.text([butikk, undertittel].filter(Boolean).join(' · ') + ` · Laga ${laga}`, M, 22);
      return 40;
    }
    doc.rect(0, 0, B, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${butikk} · Timeliste – ${tittel}`, M, 7.2);
    if (overskrift) {
      doc.setTextColor(...NAVY);
      doc.setFontSize(15);
      doc.text(overskrift, M, 23);
    }
    return overskrift ? 28 : 18;
  };

  const tabellStil = {
    theme: 'plain' as const,
    margin: { left: M, right: M },
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: [30, 30, 30] as RGB },
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255] as RGB, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: SEBRA },
    footStyles: { fillColor: SUM_BG, textColor: NAVY, fontStyle: 'bold' as const },
  };

  // ---- Side 1: samandrag ----
  let y = topp(true);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Samandrag', M, y);
  if (perAnsatt.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAA);
    doc.text('Ingen timeføringar i perioden.', M, y + 8);
  } else {
    const sumAlle = (k: 'total' | 'godkjent' | 'ventar') => perAnsatt.reduce((s, x) => s + x[k], 0);
    autoTable(doc, {
      ...tabellStil,
      startY: y + 3,
      head: [['Tilsett', 'Føringar', 'Timar', 'Godkjent', 'Ventar']],
      body: perAnsatt.map((x) => [x.a.navn, String(x.ef.length), t2(x.total), t2(x.godkjent), x.ventar ? t2(x.ventar) : '–']),
      foot: [['Sum', String(perAnsatt.reduce((s, x) => s + x.ef.length, 0)), t2(sumAlle('total')), t2(sumAlle('godkjent')), sumAlle('ventar') ? t2(sumAlle('ventar')) : '–']],
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      didParseCell: (d) => {
        if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right';
        if (d.section === 'foot' && d.column.index > 0) d.cell.styles.halign = 'right';
        if (d.section === 'body' && d.column.index === 0) d.cell.styles.fontStyle = 'bold';
        if (d.section === 'body' && d.column.index === 4 && d.cell.raw !== '–') d.cell.styles.textColor = ORANSJE;
      },
    });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAA);
    doc.text('Kvar tilsett har eiga side med alle føringar.', M, sisteY() + 7);
  }

  // ---- Éi side per tilsett ----
  for (const x of perAnsatt) {
    doc.addPage();
    y = topp(false, x.a.navn);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAA);
    doc.text([x.a.rolle, `${x.ef.length} føringar`].filter(Boolean).join(' · '), M, y + 1);
    autoTable(doc, {
      ...tabellStil,
      startY: y + 5,
      head: [['Dato', 'Dag', 'Start', 'Slutt', 'Pause', 'Timar', 'Status']],
      body: x.ef.map((e) => [
        datoKort(e.date), DAG[weekdayIdx(e.date)], e.start, e.slutt,
        e.pause ? `${e.pause} min` : '–', t2(timar(e)), e.status === 'godkjent' ? 'Godkjent' : 'Ventar',
      ]),
      foot: [['Sum', '', '', '', '', t2(x.total), x.ventar ? `${t2(x.ventar)} t ventar` : 'Alt godkjent']],
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (d) => {
        if ((d.section === 'head' || d.section === 'foot') && (d.column.index === 4 || d.column.index === 5)) d.cell.styles.halign = 'right';
        if (d.section === 'body' && d.column.index === 6) d.cell.styles.textColor = d.cell.raw === 'Godkjent' ? GROEN : ORANSJE;
      },
    });

    // Under tabellen: lønsboks for perioden, når løna kan visast.
    if (visLon.has(x.a.id)) {
      let by = sisteY() + 10;
      if (by + 55 > H - 16) { doc.addPage(); by = topp(false, x.a.navn) + 4; }
      const s = x.a.lonn === 'time' ? trekkForPeriode(x.a, entries, periodeFra, periodeTil) : null;
      const f = feriepengar(x.a, entries, periodeFra, periodeTil);
      autoTable(doc, {
        ...tabellStil,
        startY: by,
        tableWidth: 96,
        styles: { ...tabellStil.styles, fontSize: 9, cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
        head: [['Løn for perioden (anslag)', '']],
        body: s ? [
          ['Godkjende timar', `${t2(x.godkjent)} × ${krSats(x.a.sats || 0)}`],
          ['Brutto', kr(s.brutto)],
          ['Forskotstrekk', s.trekk ? `– ${kr(s.trekk)}` : '–'],
          ['Skatt', s.forklaring],
          ...(f ? [['Feriepengar', `${String(f.sats).replace('.', ',')} %: ${kr(f.periode)} · i år ${kr(f.iAar)}`]] : []),
        ] : [['Fastløn', 'Blir ikkje rekna her']],
        foot: s ? [['Netto', kr(s.netto)]] : undefined,
        columnStyles: { 0: { cellWidth: 32 }, 1: { halign: 'right' } },
        didParseCell: (d) => {
          if (d.section === 'head' && d.column.index === 0) d.cell.colSpan = 2;
          if (d.section === 'foot' && d.column.index === 1) d.cell.styles.halign = 'right';
          if (d.section === 'body' && d.row.index === 2 && d.column.index === 1 && s?.trekk) d.cell.styles.textColor = RAUD;
          if (d.section === 'body' && d.row.index === 3 && d.column.index === 1 && s?.manglarKort) {
            d.cell.styles.textColor = RAUD; d.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }

  }

  // ---- Lønsgrunnlag (berre leiarar, berre for ein heil månad) ----
  if (medLon && maaned) {
    const [ar, mnd] = maaned.split('-').map(Number);
    const fra = `${maaned}-01`;
    const til = `${mnd === 12 ? ar + 1 : ar}-${String(mnd === 12 ? 1 : mnd + 1).padStart(2, '0')}-01`;
    const rader = [...ansatte]
      .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
      .map((a) => {
        const godkjent = entries.filter((e) => e.ansatt === a.id && e.status === 'godkjent' && e.date >= fra && e.date < til)
          .reduce((s, e) => s + timar(e), 0);
        if (a.lonn !== 'time') return { a, godkjent, s: null, f: null };
        return { a, godkjent, s: trekkForPeriode(a, entries, fra, til), f: feriepengar(a, entries, fra, til) };
      });
    doc.addPage();
    y = topp(false, 'Lønsgrunnlag');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAA);
    doc.text('Berre godkjende timar · Fortruleg: berre for leiar', M, y + 1);
    const sum = (f: (r: typeof rader[number]) => number) => rader.reduce((acc, r) => acc + f(r), 0);
    autoTable(doc, {
      ...tabellStil,
      startY: y + 5,
      styles: { ...tabellStil.styles, fontSize: 9 },
      head: [['Tilsett', 'Timar', 'Sats', 'Brutto', 'Trekk', 'Netto', 'Feriep.', 'Skatt']],
      body: rader.map((r) => r.s
        ? [r.a.navn, t2(r.godkjent), krSats(r.a.sats || 0), kr(r.s.brutto), r.s.trekk ? kr(r.s.trekk) : '–', kr(r.s.netto), kr(r.f?.periode ?? 0), r.s.forklaring]
        : [r.a.navn, t2(r.godkjent), '', '', '', '', '', 'Fastløn']),
      foot: [['Sum', t2(sum((r) => r.godkjent)), '', kr(sum((r) => r.s?.brutto ?? 0)), kr(sum((r) => r.s?.trekk ?? 0)), kr(sum((r) => r.s?.netto ?? 0)), kr(sum((r) => r.f?.periode ?? 0)), '']],
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { cellWidth: 46 } },
      didParseCell: (d) => {
        if ((d.section === 'head' || d.section === 'foot') && d.column.index >= 1 && d.column.index <= 6) d.cell.styles.halign = 'right';
        const r = rader[d.row.index];
        if (d.section === 'body' && d.column.index === 7) {
          if (r?.s?.manglarKort) { d.cell.styles.textColor = RAUD; d.cell.styles.fontStyle = 'bold'; }
          if (!r?.s) { d.cell.styles.textColor = GRAA; d.cell.styles.fontStyle = 'italic'; }
        }
      },
    });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAA);
    doc.text(doc.splitTextToSize('Forskotstrekket er eit anslag ut frå skatteopplysningane under Tilsette. Lønssystemet/a-meldinga er fasit. Raud skatt = manglar skattekort (50 % trekk). Feriep. = feriepengar opptent denne månaden, utbetalt neste år.', B - 2 * M), M, sisteY() + 7);
  }

  // ---- Botntekst på alle sider ----
  const sider = doc.getNumberOfPages();
  for (let i = 1; i <= sider; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAA);
    doc.text(`${butikk} · Timeliste – ${tittel}`, M, H - 8);
    doc.text(`Side ${i} av ${sider}`, B - M, H - 8, { align: 'right' });
  }

  doc.setProperties({ title: `Timeliste – ${tittel}`, author: butikk, creator: `${butikk} – vakt & timestyring` });
  return doc.output('arraybuffer');
}

export async function lastNedTimelistePdf(val: TimelistePdfVal) {
  const buffer = await lagTimelistePdf(val);
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
  const lenke = document.createElement('a');
  lenke.href = url;
  lenke.download = timelistePdfNamn(val);
  lenke.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
