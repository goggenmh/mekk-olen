import { addDays, datoKort } from './dates';
import type { Rutine, Task } from '../types';

const PRI_RANG: Record<string, number> = { høg: 0, medium: 1, låg: 2 };

export type Fristgruppe = 'forseinka' | 'idag' | 'komande' | 'utan';

export const FRISTGRUPPER: { key: Fristgruppe; tittel: string }[] = [
  { key: 'forseinka', tittel: 'Forseinka' },
  { key: 'idag', tittel: 'I dag' },
  { key: 'komande', tittel: 'Komande' },
  { key: 'utan', tittel: 'Utan frist' },
];

export const fristgruppe = (x: Task, t: string): Fristgruppe =>
  !x.frist ? 'utan' : x.frist < t ? 'forseinka' : x.frist === t ? 'idag' : 'komande';

export const erForseinka = (x: Task, t: string) => !x.ferdig && !!x.frist && x.frist < t;

/** «I dag», «I morgon», «I går» eller «24. okt». */
export const fristTekst = (frist: string | null, t: string) => {
  if (!frist) return 'Ingen frist';
  if (frist === t) return 'I dag';
  if (frist === addDays(t, 1)) return 'I morgon';
  if (frist === addDays(t, -1)) return 'I går';
  return datoKort(frist);
};

/** Tidlegast frist først (utan frist sist), så høgast prioritet. */
export const sorterOppgaver = (a: Task, b: Task) => {
  if (a.frist !== b.frist) {
    if (!a.frist) return 1;
    if (!b.frist) return -1;
    return a.frist < b.frist ? -1 : 1;
  }
  return (PRI_RANG[a.prioritet] ?? 1) - (PRI_RANG[b.prioritet] ?? 1);
};

/** Oppgåvene den tilsette skal gjere i dag (inkludert forseinka). */
export const mineIDag = (tasks: Task[], uid: string | undefined, t: string) =>
  tasks.filter((x) => !x.ferdig && !!uid && x.ansatt === uid && !!x.frist && x.frist <= t).sort(sorterOppgaver);

/** Ufordelte oppgåver som kven som helst kan ta ansvar for. */
export const ledigeOppgaver = (tasks: Task[]) => tasks.filter((x) => !x.ferdig && x.ansatt === 'ufordelt');

// ---- reklamasjonar ----
// Ein reklamasjon er ei vanleg oppgåve med kategorien «Reklamasjon». Han
// blir lagt på den som fører han inn, men dagleg leiar får òg varsel og
// kan følgje saka opp.
export const REKLAMASJON = 'Reklamasjon';
export const erReklamasjon = (x: Task) => x.kategori === REKLAMASJON;
/** Opne reklamasjonar – det dagleg leiar skal følgje opp. */
export const opneReklamasjonar = (tasks: Task[]) => tasks.filter((x) => !x.ferdig && erReklamasjon(x)).sort(sorterOppgaver);
/** Faste oppfølgingssteg for ein ny reklamasjon. */
export const REKLAMASJON_STEG = ['Kontakta kunde', 'Sendt til leverandør', 'Løyst med kunde'];
/** Kundens telefonnummer på ein reklamasjon (henta frå «Telefon: …»-linja). */
export const reklamasjonTelefon = (x: Task): string | null => {
  const m = x.detalj.match(/^Telefon:\s*(.+)$/m);
  return m ? m[1].trim() : null;
};

/** Kva status oppgåva har, i den rekkjefølgja det er viktigast å sjå. */
export function oppgaveStatus(x: Task, t: string): { tekst: string; fg: string; bg: string } {
  if (x.ferdig) return { tekst: 'Fullført', fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)' };
  if (x.blokkert) return { tekst: 'Blokkert', fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' };
  if (erForseinka(x, t)) return { tekst: 'Forseinka', fg: '#fff', bg: 'var(--danger)' };
  if (x.ansatt === 'ufordelt') return { tekst: 'Ledig', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' };
  return { tekst: 'Open', fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)' };
}

// ---- rutinar ----

export const VEKEDAGAR = ['Mån', 'Tys', 'Ons', 'Tor', 'Fre', 'Lau', 'Søn'];

export const ANSVAR_SPESIELL: Record<string, string> = {
  ufordelt: 'Ufordelt (kven som helst kan ta ho)',
  opnar: 'Den som opnar (første vakt)',
  stengjer: 'Den som stengjer (siste vakt)',
};

/** «Mån–lau», «Kvar måndag», «Den 1. kvar månad» … */
export const rutineTekst = (r: Pick<Rutine, 'dagar' | 'manadsdag'>) => {
  if (r.manadsdag) return r.manadsdag >= 31 ? 'Siste dag i månaden' : `Den ${r.manadsdag}. kvar månad`;
  const d = [...r.dagar].sort((a, b) => a - b);
  if (d.length === 0) return 'Ingen dagar valt';
  if (d.length === 7) return 'Kvar dag';
  if (d.length === 1) return `Kvar ${['måndag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag', 'søndag'][d[0] - 1]}`;
  const samanhengande = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  if (samanhengande && d.length > 2) return `${VEKEDAGAR[d[0] - 1]}–${VEKEDAGAR[d[d.length - 1] - 1].toLowerCase()}`;
  return d.map((x) => VEKEDAGAR[x - 1]).join(', ');
};

const punkt = (...tekst: string[]) => tekst.map((t) => ({ tekst: t, ferdig: false }));

/** Ferdige malar for faste rutinar i butikken. */
export const RUTINE_MALAR: Omit<Rutine, 'id' | 'aktiv'>[] = [
  {
    tittel: 'Opning av butikken', detalj: 'Gjer butikken klar før dørene opnar.', kategori: 'Butikk', prioritet: 'høg',
    ansvar: 'opnar', dagar: [1, 2, 3, 4, 5, 6], manadsdag: null,
    sjekkliste: punkt('Slå av alarmen og lås opp', 'Lys, kasse og kortterminal på', 'Tel opp vekselkassa', 'Set ut skilt og kampanjevarer'),
  },
  {
    tittel: 'Stenging og rydding', detalj: 'Rydd og lås forsvarleg etter stenging.', kategori: 'Butikk', prioritet: 'høg',
    ansvar: 'stengjer', dagar: [1, 2, 3, 4, 5, 6], manadsdag: null,
    sjekkliste: punkt('Rydd golv, disk og hyller', 'Ta inn skilt og varer frå utsida', 'Tøm boss og papp', 'Kasseoppgjer', 'Lås og set på alarmen'),
  },
  {
    tittel: 'Kontroll av utstyr', detalj: 'Fast vekessjekk av utstyr og tryggleik.', kategori: 'Lager', prioritet: 'medium',
    ansvar: 'ufordelt', dagar: [1], manadsdag: null,
    sjekkliste: punkt('Jekketralle og stigar', 'Brannsløkkjarar og nødutgangar fri', 'Kortterminal og prisskrivar', 'Nøkkel- og kappmaskin'),
  },
  {
    tittel: 'Oppfølging av bestillingar', detalj: 'Gå gjennom kundebestillingane så ingen blir gløymde.', kategori: 'Butikk', prioritet: 'medium',
    ansvar: 'ufordelt', dagar: [2, 5], manadsdag: null,
    sjekkliste: punkt('Bestill det som står som «Ny»', 'Ring kundar med varer som har kome', 'Purr hjå leverandør på det som har stått lenge'),
  },
  {
    tittel: 'Varetelling', detalj: 'Tel opp utvalde varegrupper.', kategori: 'Lager', prioritet: 'medium',
    ansvar: 'ufordelt', dagar: [], manadsdag: 1,
    sjekkliste: [],
  },
];
