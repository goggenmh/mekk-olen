// Oppdikta testdata til demo-fila. Alle namn, telefonnummer og bestillingar
// er funne på. Datoane blir rekna ut frå dagens dato, så demoen alltid ser
// «levande» ut: vakter denne veka, timar til godkjenning, gamle bestillingar osv.
import { addDays, mondayOf, today } from '../lib/dates';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rad = Record<string, any>;

const B = 'demo-butikk';

export function lagTestdata(): Record<string, Rad[]> {
  const t = today();
  const man = mondayOf(t);
  const dag = (i: number) => addDays(man, i); // 0 = måndag denne veka
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;

  const ansatte: Rad[] = [
    { id: 'kari', navn: 'Kari Nordmann', rolle: 'Dagleg leiar', lonn: 'fast', sats: 0, farge: '#11788a', init: 'KN', email: 'kari@demo.local', telefon: '900 11 222', leder: true, aktiv: true, butikk_id: B, konsern_admin: false, created_at: '2026-01-01' },
    { id: 'ola', navn: 'Ola Haugland', rolle: 'Butikkmedarbeidar', lonn: 'time', sats: 168, skattetype: 'skattekort', skatteprosent: 31, farge: '#e08a1e', init: 'OH', email: 'ola@demo.local', telefon: '900 33 444', leder: false, aktiv: true, butikk_id: B, konsern_admin: false, created_at: '2026-01-02' },
    { id: 'ingrid', navn: 'Ingrid Vik', rolle: 'Butikkmedarbeidar', lonn: 'time', sats: 152, skattetype: 'frikort', frikortgrense: 4000, farge: '#2f9e6f', init: 'IV', email: 'ingrid@demo.local', telefon: '900 55 666', leder: false, aktiv: true, butikk_id: B, konsern_admin: false, created_at: '2026-01-03' },
    { id: 'jonas', navn: 'Jonas Berg', rolle: 'Helgehjelp', lonn: 'time', sats: 145, skattetype: null, farge: '#6a5acd', init: 'JB', email: 'jonas@demo.local', telefon: '900 77 888', leder: false, aktiv: true, butikk_id: B, konsern_admin: false, created_at: '2026-01-04' },
    { id: 'siri', navn: 'Siri Lund', rolle: 'Sommarvikar', lonn: 'time', sats: 140, farge: '#c0392b', init: 'SL', email: 'siri@demo.local', telefon: '', leder: false, aktiv: false, butikk_id: B, konsern_admin: false, created_at: '2026-01-05' },
  ];

  // Fast veke: Kari formiddag, Ola/Ingrid annankvar kveld, Jonas laurdag.
  const mal = [
    ...[0, 1, 2, 3, 4].map((d) => ({ ansatt: 'kari', d, start: '09:00', slutt: '15:00', skift: 'Formiddag' })),
    ...[0, 2, 4].map((d) => ({ ansatt: 'ola', d, start: '14:00', slutt: '18:00', skift: 'Kveld' })),
    ...[1, 3].map((d) => ({ ansatt: 'ingrid', d, start: '14:00', slutt: '18:00', skift: 'Kveld' })),
    { ansatt: 'jonas', d: 5, start: '09:00', slutt: '16:00', skift: 'Laurdag' },
  ];
  const shifts: Rad[] = [];
  for (const veke of [-7, 0, 7]) {
    for (const m of mal) {
      // Eitt hol i neste veke, så bemanningssjekken har noko å vise.
      if (veke === 7 && m.ansatt === 'ingrid' && m.d === 3) continue;
      shifts.push({ id: id('vakt'), ansatt: m.ansatt, date: addDays(man, veke + m.d), start: m.start, slutt: m.slutt, skift: m.skift });
    }
  }
  const standardveke: Rad[] = mal.map((m) => ({ id: id('std'), ansatt: m.ansatt, dag: ['man', 'tir', 'ons', 'tor', 'fre', 'lau'][m.d], start: m.start, slutt: m.slutt }));

  // Timar: førre veke godkjent, denne veka (til og med i dag) ventar.
  const time_entries: Rad[] = shifts
    .filter((s) => s.date <= t)
    .map((s) => ({ id: id('time'), ansatt: s.ansatt, date: s.date, start: s.start, slutt: s.slutt, pause: s.skift === 'Formiddag' || s.skift === 'Laurdag' ? 30 : 0, status: s.date < man ? 'godkjent' : 'venter' }));

  // Litt realistisk støy: Kari jobba lenger enn planlagt i dag, og Ingrid har
  // ikkje ført timar for ein vakt førre veke (blir vist som avvik/«manglar»).
  const kariIdag = time_entries.find((e) => e.ansatt === 'kari' && e.date === t);
  if (kariIdag) kariIdag.slutt = '16:30';
  const ingridHol = time_entries.findIndex((e) => e.ansatt === 'ingrid' && e.date === dag(-6));
  if (ingridHol >= 0) time_entries.splice(ingridHol, 1);
  const olaForre = time_entries.find((e) => e.ansatt === 'ola' && e.date === dag(-3));
  if (olaForre) olaForre.slutt = '19:15';

  const kveldNeste = shifts.find((s) => s.ansatt === 'ola' && s.date === dag(9));
  const shift_swaps: Rad[] = kveldNeste
    ? [{ id: id('byte'), shift_id: kveldNeste.id, fra: 'ola', til: 'ingrid', dag: 'onsdag', tid: '14:00–18:00', status: 'pending' }]
    : [];

  // Ferie og fri: historikk frå sommaren, planlagt, søknader og eitt avslag.
  const aar = t.slice(0, 4);
  const fr = (ansatt: string, type: string, tekst: string, fra: string, til: string, status = 'godkjend', svar = ''): Rad =>
    ({ id: id('ferie'), ansatt, type, tekst, fra, til, status, svar, behandla_av: status === 'ventar' ? null : 'kari', created_at: addDays(fra, -30) });
  const ferie: Rad[] = [
    fr('kari', 'Ferie', 'Sommarferie', `${aar}-07-06`, `${aar}-07-24`),
    fr('ola', 'Ferie', 'Sommarferie', `${aar}-07-20`, `${aar}-08-07`),
    fr('ingrid', 'Ferie', 'Sommarferie', `${aar}-06-29`, `${aar}-07-10`),
    fr('jonas', 'Ferie', 'Sommarferie', `${aar}-08-03`, `${aar}-08-14`),
    fr('ola', 'Sjukmeld', 'Influensa', addDays(t, -24), addDays(t, -22)),
    fr('ingrid', 'Fri', 'Flytting', addDays(t, -40), addDays(t, -40)),
    fr('jonas', 'Ferie', 'Haustferie', dag(14), dag(19)),
    fr('ingrid', 'Kurs', 'Truckførarkurs', dag(10), dag(10)),
    fr('ola', 'Ferie', 'Juleferie', `${aar}-12-21`, `${aar}-12-31`, 'ventar'),
    fr('ingrid', 'Fri', 'Bryllaup i familien', dag(18), dag(18), 'ventar'),
    fr('jonas', 'Ferie', 'Langhelg', dag(5), dag(5), 'avslatt', 'Varetelling den laurdagen – ta gjerne helga etter.'),
  ];
  // Ola har vakt denne dagen òg – blir vist som konflikt i vaktplanen.
  const utilgjengeleg: Rad[] = [{ id: id('util'), ansatt: 'ola', dato: dag(9), grunn: 'Tannlege' }];

  const tasks: Rad[] = [
    { id: id('oppg'), tittel: 'Varetelling hageavdelinga', detalj: 'Tel opp gjødsel, jord og frø før sesongslutt.', prioritet: 'høg', ansatt: 'ola', ferdig: false, frist: addDays(t, -1), kategori: 'Lager', gjentak: 'ingen', sjekkliste: [{ tekst: 'Gjødsel', ferdig: true }, { tekst: 'Jord', ferdig: false }, { tekst: 'Frø', ferdig: false }], oppretta_av: 'kari' },
    { id: id('oppg'), tittel: 'Prismerk nye skrutrekkjarar', detalj: 'Kom med siste leveranse.', prioritet: 'medium', ansatt: 'ingrid', ferdig: false, frist: addDays(t, 2), kategori: 'Butikk', gjentak: 'ingen', sjekkliste: [], oppretta_av: 'kari', blokkert: true, blokkert_grunn: 'Prisane er ikkje lagde inn i kassasystemet enno.' },
    { id: id('oppg'), tittel: 'Følg opp nytt sortiment', detalj: 'Betongskruar, gjengestang og syrefaste variantar.', prioritet: 'medium', ansatt: 'ufordelt', ferdig: false, frist: t, kategori: 'Butikk', gjentak: 'ingen', sjekkliste: [], oppretta_av: 'kari' },
    { id: id('oppg'), tittel: 'Byt ut kampanjeskilt i vindauget', detalj: 'Vinterkampanje frå neste veke.', prioritet: 'låg', ansatt: 'ufordelt', ferdig: false, frist: addDays(t, 5), kategori: 'Kampanje', gjentak: 'ingen', sjekkliste: [], oppretta_av: 'kari' },
    { id: id('oppg'), tittel: 'Tøm pantemaskina', detalj: '', prioritet: 'medium', ansatt: 'jonas', ferdig: false, frist: t, kategori: 'Butikk', gjentak: 'vekevis', sjekkliste: [] },
    { id: id('oppg'), tittel: 'Rydd lageret bak', detalj: '', prioritet: 'låg', ansatt: 'kari', ferdig: true, frist: addDays(t, -3), kategori: 'Lager', gjentak: 'ingen', sjekkliste: [], oppretta_av: 'kari', ferdig_av: 'kari', ferdig_at: new Date(Date.now() - 864e5).toISOString() },
  ];

  const ordre = (kunde: string, telefon: string, vare: string, leverandor: string, dagarSidan: number, status: string, ekstra: Rad = {}): Rad => ({
    id: id('ordre'), kunde, telefon, vare, leverandor, varenr: '', lenke: null, dato: addDays(t, -dagarSidan), antal: 1, status, varsla: null, notat: '', registrert_av: 'kari', created_at: addDays(t, -dagarSidan), ...ekstra,
  });
  const orders: Rad[] = [
    ordre('Per Hansen', '911 22 333', 'Kjedesag 40 cm sverd', 'Stihl', 12, 'ny', { notat: 'Vil ha beskjed før me bestiller' }),
    ordre('Liv Solberg', '922 33 444', 'Varmepumpefilter', 'Mitsubishi', 2, 'ny'),
    ordre('Arne Moe', '933 44 555', 'Batteri 18V 5Ah', 'Ryobi', 5, 'tinga', { registrert_av: 'ola', antal: 2 }),
    ordre('Bygg & Bad AS', '944 55 666', 'Pipeinnfesting 110 mm', 'Biltema', 20, 'tinga'),
    ordre('Tone Bakke', '955 66 777', 'Snøfresar-reim', 'MTD', 8, 'komen', { varsla: addDays(t, -1), registrert_av: 'ingrid' }),
    ordre('Knut Aas', '966 77 888', 'Hagesaks', 'Fiskars', 16, 'komen', { varsla: addDays(t, -12) }),
    ordre('Mari Fjeld', '977 88 999', 'Trimmartråd 2,4 mm', 'Ryobi', 3, 'komen'),
    ordre('Eirik Nes', '988 99 000', 'Kompressor 24 l', 'Einhell', 40, 'henta'),
  ];

  const docs: Rad[] = [
    { id: id('dok'), tittel: 'HMS-handbok', kategori: 'HMS', notat: 'Ansvar, tryggleik i butikk og lager, kjemikaliar og avvik.', dato: addDays(t, -30), fil_url: null, fil_namn: null },
    { id: id('dok'), tittel: 'Brann- og førstehjelpsinstruks', kategori: 'HMS', notat: 'Kva du gjer ved brann og skade.', dato: addDays(t, -30), fil_url: null, fil_namn: null },
    { id: id('dok'), tittel: 'Opnings- og stengerutine', kategori: 'Rutine', notat: 'Steg for steg for opning og stenging.', dato: addDays(t, -60), fil_url: null, fil_namn: null },
    { id: id('dok'), tittel: 'Reklamasjonsskjema', kategori: 'Skjema', notat: '', dato: addDays(t, -90), fil_url: null, fil_namn: null },
    { id: id('dok'), tittel: 'Mal for arbeidsavtale', kategori: 'Avtale', notat: '', dato: addDays(t, -120), fil_url: null, fil_namn: null },
  ];
  const doc_stadfesting: Rad[] = [{ id: id('stf'), doc_id: docs[0].id, ansatt: 'kari', stadfesta_at: addDays(t, -10) }];

  const meldinger: Rad[] = [
    { id: id('meld'), fra: 'kari', til: null, tekst: 'Hugs varetelling laurdag etter stenging. Pizza på huset!', created_at: new Date().toISOString() },
  ];

  return {
    ansatte,
    butikkar: [{ id: B, namn: 'MEKK Ølen', farge: '#11788a', aktiv: true, created_at: '2026-01-01' }],
    shifts, standardveke, time_entries, shift_swaps, ferie, utilgjengeleg, tasks, orders, docs, doc_stadfesting, meldinger,
    oppgave_rutinar: [
      { id: id('rutine'), tittel: 'Opning av butikken', detalj: 'Gjer butikken klar før dørene opnar.', kategori: 'Butikk', prioritet: 'høg', ansvar: 'opnar', dagar: [1, 2, 3, 4, 5, 6], manadsdag: null, aktiv: true, sjekkliste: [{ tekst: 'Slå av alarmen og lås opp', ferdig: false }, { tekst: 'Lys, kasse og kortterminal på', ferdig: false }, { tekst: 'Tel opp vekselkassa', ferdig: false }] },
      { id: id('rutine'), tittel: 'Stenging og rydding', detalj: 'Rydd og lås forsvarleg etter stenging.', kategori: 'Butikk', prioritet: 'høg', ansvar: 'stengjer', dagar: [1, 2, 3, 4, 5, 6], manadsdag: null, aktiv: true, sjekkliste: [{ tekst: 'Rydd golv, disk og hyller', ferdig: false }, { tekst: 'Kasseoppgjer', ferdig: false }, { tekst: 'Lås og set på alarmen', ferdig: false }] },
    ],
    permissions: [{ ansatt: 'ola', kan_godkjenne: false }],
  };
}
