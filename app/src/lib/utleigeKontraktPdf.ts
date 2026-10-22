import { kr, nr, tidKort, type UtleigeEining, type UtleigeInnstillingar, type UtleigeKunde, type UtleigeProdukt, type UtleigeReservasjon } from './utleige';

// Leigekontrakt som ein ekte PDF (A4) til utskrift eller e-post ved utlevering:
// leigetakar, utstyr, periode, pris og depositum, vilkår og signaturfelt.
// jsPDF er stort, så det blir berre lasta ned når nokon trykkjer på knappen.

type RGB = [number, number, number];
const NAVY: RGB = [0, 35, 55];
const GRAA: RGB = [102, 112, 133];
const LINJE: RGB = [210, 219, 222];

export interface KontraktVal {
  reservasjon: UtleigeReservasjon;
  produkt: UtleigeProdukt | undefined;
  eining: UtleigeEining | undefined;
  kunde: UtleigeKunde | undefined;
  innstillingar: UtleigeInnstillingar | null;
  butikk: string;
}

export const utleigeKontraktNamn = ({ reservasjon, butikk }: Pick<KontraktVal, 'reservasjon' | 'butikk'>) =>
  `${butikk}-leigekontrakt-${nr(reservasjon)}.pdf`.replace(/\s+/g, '-').toLowerCase();

export async function lagUtleigeKontraktPdf(val: KontraktVal): Promise<ArrayBuffer> {
  const { jsPDF } = await import('jspdf');
  const { reservasjon: r, produkt, eining, kunde, innstillingar, butikk } = val;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const B = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const LABEL = M + 34;

  const no = new Date();
  const laga = `${no.getDate()}.${no.getMonth() + 1}.${no.getFullYear()} kl. ${String(no.getHours()).padStart(2, '0')}:${String(no.getMinutes()).padStart(2, '0')}`;
  const kontakt = [innstillingar?.kontakt_telefon, innstillingar?.kontakt_epost].filter(Boolean).join(' · ');

  // Mørkeblå topp med tittel og reservasjonsnummer.
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, B, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Leigekontrakt', M, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(nr(r), B - M, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(200, 214, 220);
  doc.text([butikk, kontakt].filter(Boolean).join(' · '), M, 22);

  let y = 40;

  // Sikre plass; elles ny side med smal stripe.
  const plass = (behov: number) => {
    if (y + behov <= H - 16) return;
    doc.addPage();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, B, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${butikk} · Leigekontrakt ${nr(r)}`, M, 7.2);
    y = 20;
  };

  const seksjon = (tittel: string) => {
    plass(14);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...NAVY);
    doc.text(tittel, M, y);
    y += 2.5;
    doc.setDrawColor(...LINJE);
    doc.setLineWidth(0.3);
    doc.line(M, y, B - M, y);
    y += 5.5;
  };

  const rad = (label: string, value: string) => {
    const linjer = doc.splitTextToSize(value || '–', B - LABEL - M);
    plass(linjer.length * 5 + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAA);
    doc.text(label, M, y);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(linjer, LABEL, y);
    y += linjer.length * 5 + 1.5;
  };

  seksjon('Leigetakar');
  rad('Namn', kunde?.namn ?? '');
  rad('Telefon', kunde?.telefon ?? '');
  if (kunde?.epost) rad('E-post', kunde.epost);

  seksjon('Utstyr');
  rad('Utstyr', produkt?.namn ?? '');
  rad('Einingskode', eining?.kode ?? '');
  if (produkt?.tilbehor?.length) rad('Tilbehøyr', produkt.tilbehor.join(', '));

  seksjon('Leigeperiode');
  rad('Henting', tidKort(r.start));
  rad('Retur', tidKort(r.slutt));

  seksjon('Pris');
  rad('Leige', kr(r.pris_leige));
  if (r.gebyr > 0) rad('Gebyr', kr(r.gebyr));
  rad('Å betale', kr(r.pris_total));
  if (r.depositum > 0) {
    rad('Depositum', `${kr(r.depositum)} – blir betalt tilbake ved uskadd retur`);
  }

  const vilkar = innstillingar?.vilkar?.trim();
  if (vilkar) {
    seksjon('Vilkår');
    const linjer = doc.splitTextToSize(vilkar, B - 2 * M);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    for (const l of linjer as string[]) {
      plass(4.6);
      doc.text(l, M, y);
      y += 4.6;
    }
  }

  // Signaturfelt: leigetakar og butikk, side om side.
  plass(32);
  y += 10;
  const kolB = (B - 2 * M - 10) / 2;
  const sig = (x: number, tittel: string) => {
    doc.setDrawColor(...GRAA);
    doc.setLineWidth(0.3);
    doc.line(x, y, x + kolB, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAA);
    doc.text('Dato og signatur', x, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(tittel, x, y + 9.5);
  };
  sig(M, 'Leigetakar');
  sig(M + kolB + 10, `For ${butikk}`);

  // Botntekst på alle sider.
  const sider = doc.getNumberOfPages();
  for (let i = 1; i <= sider; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAA);
    doc.text(`${butikk} · Leigekontrakt ${nr(r)} · Laga ${laga}`, M, H - 8);
    if (sider > 1) doc.text(`Side ${i} av ${sider}`, B - M, H - 8, { align: 'right' });
  }

  doc.setProperties({ title: `Leigekontrakt ${nr(r)}`, author: butikk, creator: `${butikk} – utleige` });
  return doc.output('arraybuffer');
}

export async function lastNedUtleigeKontraktPdf(val: KontraktVal) {
  const buffer = await lagUtleigeKontraktPdf(val);
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
  const lenke = document.createElement('a');
  lenke.href = url;
  lenke.download = utleigeKontraktNamn(val);
  lenke.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
