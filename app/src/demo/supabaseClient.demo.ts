// Demo-utgåve av supabaseClient: ein liten database i minnet med oppdikta
// testdata, så heile appen kan opnast som éi HTML-fil utan nett og utan
// innlogging. Blir berre brukt av `npm run build:demo` (sjå vite.demo.config.ts).
// Alt som blir endra, forsvinn når sida blir lasta på nytt.
import { lagTestdata, type Rad } from './testdata';
import { addDays } from '../lib/dates';

type Db = Record<string, Rad[]>;
let db: Db | null = null;
const data = (): Db => (db ??= lagTestdata());
const tabell = (t: string) => (data()[t] ??= []);

let innlogga: string | null = null;
// Utleigekunde innlogga på «Mi side» (eigen frå tilsett-innlogginga).
let kundeEpost: string | null = null;
type Lyttar = (event: string, session: unknown) => void;
const lyttarar = new Set<Lyttar>();
const okt = () => (innlogga ? { access_token: 'demo', refresh_token: 'demo', user: { id: innlogga } } : null);
const varsleAuth = (ev: string) => lyttarar.forEach((l) => setTimeout(() => l(ev, okt()), 0));

const nyId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ok = <T>(d: T) => ({ data: d, error: null });
const feil = (message: string) => ({ data: null, error: { message } });

// Slik databasen fyller inn felt sjølv (triggerar og standardverdiar).
function utfyll(t: string, r: Rad): Rad {
  const n: Rad = { id: nyId(), created_at: new Date().toISOString(), ...r };
  if (t === 'orders') { n.registrert_av = innlogga; n.notat ??= ''; n.varsla ??= null; }
  if (t === 'doc_stadfesting') { n.ansatt = innlogga; n.stadfesta_at = new Date().toISOString(); }
  if (t === 'tasks') {
    n.sjekkliste ??= []; n.ferdig ??= false; n.blokkert ??= false; n.blokkert_grunn ??= '';
    n.oppretta_av = n.rutine_id ? null : innlogga;
    n.oppretta_at = new Date().toISOString();
    if (n.ferdig) { n.ferdig_av = innlogga; n.ferdig_at = new Date().toISOString(); }
  }
  if (t === 'oppgave_rutinar') { n.aktiv ??= true; n.sjekkliste ??= []; }
  if (t === 'utleige_reservasjon') {
    n.nummer ??= tabell('utleige_reservasjon').reduce((m, r) => Math.max(m, Number(r.nummer) || 0), 1000) + 1;
    n.butikk_id ??= meg()?.butikk_id ?? 'demo-butikk';
    n.status ??= 'stadfesta'; n.kunde_melding ??= ''; n.internt_notat ??= ''; n.retur_sjekk ??= null; n.oppgave_id ??= null;
    n.utlevert_at ??= null; n.utlevert_av ??= null; n.returnert_at ??= null; n.returnert_av ??= null;
  }
  return n;
}

// --- Utleige: same reglar som i supabase/utleige.sql, forenkla for demoen ---
const AKTIVE_RES = ['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka'];
const overlapp = (aStart: number, aSlutt: number, bStart: string, bSlutt: string | null) =>
  new Date(bStart).getTime() < aSlutt && (bSlutt ? new Date(bSlutt).getTime() : Infinity) > aStart;

function einingLedig(einingId: string, start: number, slutt: number, utan?: string): boolean {
  const e = tabell('utleige_eining').find((x) => x.id === einingId);
  if (!e || e.status !== 'tilgjengeleg') return false;
  if (tabell('utleige_sperre').some((s) => s.eining_id === einingId && overlapp(start, slutt, s.start, s.slutt))) return false;
  return !tabell('utleige_reservasjon').some((r) => r.eining_id === einingId && r.id !== utan && AKTIVE_RES.includes(r.status) && overlapp(start, slutt, r.start, r.slutt));
}

function utleigePris(produktId: string, startISO: string, sluttISO: string): Rad {
  const p = tabell('utleige_produkt').find((x) => x.id === produktId);
  if (!p) throw new Error('Ukjent produkt.');
  const start = new Date(startISO), slutt = new Date(sluttISO);
  if (slutt <= start) throw new Error('Sluttid må vere etter starttid.');
  const timar = (slutt.getTime() - start.getTime()) / 3600000;
  const dagar = Math.max(1, Math.ceil(timar / 24));
  const isodow = ((start.getDay() + 6) % 7) + 1; // måndag = 1 … søndag = 7
  const dagarMellom = (new Date(slutt.getFullYear(), slutt.getMonth(), slutt.getDate()).getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / 864e5;
  let leige: number, modell: string;
  if (p.halvdag_pris != null && timar <= 4) { leige = p.halvdag_pris; modell = 'halvdag'; }
  else if (p.helg_pris != null && isodow === 5 && dagarMellom <= 3 && dagar <= 3) { leige = p.helg_pris; modell = 'helg'; }
  else { leige = p.dogn_pris * dagar; modell = 'dogn'; }
  return { modell, dagar, timar: Math.round(timar * 10) / 10, leige, gebyr: p.gebyr, depositum: p.depositum, total: leige + p.gebyr };
}

type Filter = (r: Rad) => boolean;

/** Kopi av rada utan dei gitte felta. */
const utan = (r: Rad, ...felt: string[]): Rad => Object.fromEntries(Object.entries(r).filter(([k]) => !felt.includes(k)));

class Sporjing implements PromiseLike<{ data: unknown; error: unknown }> {
  private filter: Filter[] = [];
  private sortering: { kol: string; opp: boolean } | null = null;
  private returner = false;
  private berreEin = false;
  private grense: number | null = null;
  private t: string;
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private nytt?: Rad | Rad[];
  constructor(t: string) { this.t = t; }

  select() { if (this.op !== 'select') this.returner = true; return this; }
  insert(r: Rad | Rad[]) { this.op = 'insert'; this.nytt = r; return this; }
  update(r: Rad) { this.op = 'update'; this.nytt = r; return this; }
  upsert(r: Rad) { this.op = 'upsert'; this.nytt = r; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(k: string, v: unknown) { this.filter.push((r) => r[k] === v); return this; }
  neq(k: string, v: unknown) { this.filter.push((r) => r[k] !== v); return this; }
  in(k: string, v: unknown[]) { this.filter.push((r) => v.includes(r[k])); return this; }
  order(kol: string, o?: { ascending?: boolean }) { this.sortering = { kol, opp: o?.ascending !== false }; return this; }
  limit(n: number) { this.grense = n; return this; }
  single() { this.berreEin = true; return this; }
  maybeSingle() { this.berreEin = true; return this; }

  private kopi = (r: Rad) => JSON.parse(JSON.stringify(r)) as Rad;
  private treff = (r: Rad) => this.filter.every((f) => f(r));

  private koyr() {
    const rader = tabell(this.t);
    let ut: Rad[] = [];
    if (this.op === 'select') {
      ut = rader.filter(this.treff);
      // Timesatsen er privat for andre enn leiarar, som i den ekte databasen.
      if (this.t === 'ansatte') ut = ut.map((r) => utan(r, 'sats', 'skattetype', 'skatteprosent', 'frikortgrense', 'feriepengesats', 'tidlegare_ar', 'tidlegare_mekk', 'tidlegare_andre'));
    } else if (this.op === 'insert') {
      const liste = Array.isArray(this.nytt) ? this.nytt : [this.nytt!];
      ut = liste.map((r) => utfyll(this.t, r));
      rader.push(...ut);
    } else if (this.op === 'upsert') {
      const r = this.nytt as Rad;
      const nokkel = this.t === 'permissions' ? 'ansatt' : 'id';
      const fins = rader.find((x) => x[nokkel] === r[nokkel]);
      if (fins) Object.assign(fins, r); else rader.push(utfyll(this.t, r));
      ut = [fins ?? rader[rader.length - 1]];
    } else if (this.op === 'update') {
      ut = rader.filter(this.treff);
      ut.forEach((r) => {
        const varFerdig = r.ferdig;
        Object.assign(r, this.nytt);
        // Som triggeren tasks_spor: kven fullførte, og når.
        if (this.t === 'tasks') {
          if (!r.ferdig) { r.ferdig_av = null; r.ferdig_at = null; } else if (!varFerdig) { r.ferdig_av = innlogga; r.ferdig_at = new Date().toISOString(); r.blokkert = false; }
          if (!r.blokkert) r.blokkert_grunn = '';
        }
      });
    } else {
      ut = rader.filter(this.treff);
      data()[this.t] = rader.filter((r) => !ut.includes(r));
    }
    if (this.sortering) {
      const { kol, opp } = this.sortering;
      ut = [...ut].sort((a, b) => (String(a[kol]) < String(b[kol]) ? -1 : String(a[kol]) > String(b[kol]) ? 1 : 0) * (opp ? 1 : -1));
    }
    if (this.grense != null) ut = ut.slice(0, this.grense);
    const kopi = ut.map(this.kopi);
    if (this.op !== 'select' && !this.returner) return ok(null);
    if (this.berreEin) return kopi[0] ? ok(kopi[0]) : feil('Fann ingen rad');
    return ok(kopi);
  }

  then<A = { data: unknown; error: unknown }, B = never>(
    onOk?: ((v: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null,
    onFeil?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.koyr()).then(onOk, onFeil);
  }
}

const meg = () => tabell('ansatte').find((a) => a.id === innlogga);

// Same logikk som lag_rutineoppgaver() i oppgaver-v2.sql.
function lagRutineoppgaver() {
  const d = new Date();
  const dag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const iso = ((d.getDay() + 6) % 7) + 1;
  const sisteIMnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  let n = 0;
  for (const r of tabell('oppgave_rutinar')) {
    const idag = r.manadsdag ? d.getDate() === Math.min(Number(r.manadsdag), sisteIMnd) : (r.dagar as number[]).includes(iso);
    if (!r.aktiv || !idag || tabell('tasks').some((x) => x.rutine_id === r.id && x.frist === dag)) continue;
    const vakter = tabell('shifts').filter((s) => s.date === dag).sort((x, y) => String(x.start).localeCompare(String(y.start)));
    const ansatt = r.ansvar === 'opnar' ? vakter[0]?.ansatt
      : r.ansvar === 'stengjer' ? [...vakter].sort((x, y) => String(y.slutt).localeCompare(String(x.slutt)))[0]?.ansatt
      : r.ansvar;
    tabell('tasks').push(utfyll('tasks', {
      tittel: r.tittel, detalj: r.detalj, prioritet: r.prioritet, ansatt: ansatt ?? 'ufordelt', frist: dag, kategori: r.kategori, gjentak: 'ingen',
      sjekkliste: (r.sjekkliste as { tekst: string }[]).map((p) => ({ tekst: p.tekst, ferdig: false })), rutine_id: r.id, ferdig: false,
    }));
    n++;
  }
  return n;
}

const rpc = async (namn: string, args: Rad = {}): Promise<{ data: unknown; error: unknown }> => {
  const a = meg();
  switch (namn) {
    case 'utleige_katalog': {
      const innst = tabell('utleige_innstillingar');
      const rows = tabell('utleige_produkt')
        .filter((p) => p.aktiv)
        .sort((x, y) => (x.sortering - y.sortering) || String(x.namn).localeCompare(String(y.namn)))
        .map((p) => {
          const i = innst.find((x) => x.butikk_id === p.butikk_id && x.offentleg);
          const b = tabell('butikkar').find((x) => x.id === p.butikk_id && x.aktiv);
          if (!i || !b) return null;
          const einingar = tabell('utleige_eining').filter((e) => e.produkt_id === p.id && e.status !== 'ikkje_tilgjengeleg').length;
          return { id: p.id, butikk_id: p.butikk_id, butikk: b.namn, namn: p.namn, beskriving: p.beskriving, kategori: p.kategori, bilete_url: p.bilete_url,
            dogn_pris: p.dogn_pris, halvdag_pris: p.halvdag_pris, helg_pris: p.helg_pris, gebyr: p.gebyr, depositum: p.depositum, tilbehor: p.tilbehor || [],
            einingar, vilkar: i.vilkar, hente_tid: i.hente_tid, retur_tid: i.retur_tid, maks_dagar: i.maks_dagar };
        })
        .filter(Boolean);
      return ok(rows);
    }
    case 'utleige_ledigheit': {
      const tal = Math.min(Math.max(Number(args.p_dagar) || 42, 1), 92);
      const einingar = tabell('utleige_eining').filter((e) => e.produkt_id === args.p_produkt && e.status === 'tilgjengeleg');
      const ut: Rad[] = [];
      for (let k = 0; k < tal; k++) {
        const d = addDays(String(args.p_fra), k);
        const fra = new Date(`${d}T00:00:00`).getTime();
        const til = new Date(`${addDays(d, 1)}T00:00:00`).getTime();
        ut.push({ dato: d, totalt: einingar.length, ledige: einingar.filter((e) => einingLedig(e.id, fra, til)).length });
      }
      return ok(ut);
    }
    case 'utleige_sjekk': {
      const p = tabell('utleige_produkt').find((x) => x.id === args.p_produkt && x.aktiv);
      if (!p) return feil('Produktet finst ikkje.');
      const start = new Date(args.p_start).getTime(), slutt = new Date(args.p_slutt).getTime();
      const ledige = tabell('utleige_eining').filter((e) => e.produkt_id === args.p_produkt && einingLedig(e.id, start, slutt)).length;
      try { return ok({ ...utleigePris(args.p_produkt, args.p_start, args.p_slutt), ledige }); }
      catch (e) { return feil((e as Error).message); }
    }
    case 'utleige_pris':
      try { return ok(utleigePris(args.p_produkt, args.p_start, args.p_slutt)); }
      catch (e) { return feil((e as Error).message); }
    case 'utleige_send_forespurnad': {
      const p = tabell('utleige_produkt').find((x) => x.id === args.p_produkt && x.aktiv);
      if (!p) return feil('Produktet finst ikkje.');
      const i = tabell('utleige_innstillingar').find((x) => x.butikk_id === p.butikk_id && x.offentleg);
      if (!i) return feil('Utleige er ikkje opna.');
      if (!args.p_vilkar) return feil('Du må godta leigevilkåra.');
      const start = new Date(args.p_start).getTime(), slutt = new Date(args.p_slutt).getTime();
      if (slutt <= start) return feil('Sluttid må vere etter starttid.');
      const eining = tabell('utleige_eining')
        .filter((e) => e.produkt_id === args.p_produkt)
        .sort((x, y) => String(x.kode).localeCompare(String(y.kode)))
        .find((e) => einingLedig(e.id, start, slutt));
      if (!eining) return feil('Utstyret er ikkje ledig i perioden. Prøv andre datoar.');
      const tlf = String(args.p_telefon || '').replace(/[^0-9+]/g, '');
      let kunde = tabell('utleige_kunde').find((k) => k.butikk_id === p.butikk_id && k.telefon === tlf);
      if (kunde) { kunde.namn = String(args.p_namn).trim(); kunde.epost = String(args.p_epost).trim().toLowerCase(); }
      else { kunde = { id: nyId(), butikk_id: p.butikk_id, namn: String(args.p_namn).trim(), telefon: tlf, epost: String(args.p_epost).trim().toLowerCase(), notat: '', created_at: new Date().toISOString() }; tabell('utleige_kunde').push(kunde); }
      const pris = utleigePris(args.p_produkt, args.p_start, args.p_slutt);
      const nummer = tabell('utleige_reservasjon').reduce((m, r) => Math.max(m, Number(r.nummer) || 0), 1000) + 1;
      tabell('utleige_reservasjon').push({ id: nyId(), nummer, butikk_id: p.butikk_id, produkt_id: args.p_produkt, eining_id: eining.id, kunde_id: kunde.id,
        start: args.p_start, slutt: args.p_slutt, status: 'ny', pris_leige: pris.leige, gebyr: pris.gebyr, depositum: pris.depositum, pris_total: pris.total,
        kunde_melding: String(args.p_melding || '').slice(0, 1000), internt_notat: '', retur_sjekk: null, oppgave_id: null,
        utlevert_at: null, utlevert_av: null, returnert_at: null, returnert_av: null, created_at: new Date().toISOString() });
      return ok({ nummer, start: args.p_start, slutt: args.p_slutt, total: pris.total, depositum: pris.depositum });
    }
    case 'utleige_retur': {
      const r = tabell('utleige_reservasjon').find((x) => x.id === args.p_res);
      if (!r) return feil('Fann ikkje reservasjonen.');
      r.status = args.p_vedlikehald ? 'kontroll' : 'returnert';
      r.retur_sjekk = args.p_sjekk ?? null;
      r.returnert_at = new Date().toISOString(); r.returnert_av = innlogga;
      const e = tabell('utleige_eining').find((x) => x.id === r.eining_id);
      if (e && args.p_vedlikehald) e.status = 'vedlikehald';
      return ok(null);
    }
    case 'utleige_frigjer': {
      const e = tabell('utleige_eining').find((x) => x.id === args.p_eining);
      if (e) e.status = 'tilgjengeleg';
      return ok(null);
    }
    case 'utleige_mine_leige': {
      const epost = (kundeEpost || '').toLowerCase();
      if (!epost) return ok([]);
      const rows = tabell('utleige_reservasjon')
        .filter((r) => tabell('utleige_kunde').some((k) => k.id === r.kunde_id && String(k.epost).toLowerCase() === epost))
        .sort((x, y) => String(y.start).localeCompare(String(x.start)))
        .map((r) => {
          const k = tabell('utleige_kunde').find((x) => x.id === r.kunde_id);
          const p = tabell('utleige_produkt').find((x) => x.id === r.produkt_id);
          const e = tabell('utleige_eining').find((x) => x.id === r.eining_id);
          const b = tabell('butikkar').find((x) => x.id === r.butikk_id);
          const i = tabell('utleige_innstillingar').find((x) => x.butikk_id === r.butikk_id);
          return { id: r.id, nummer: r.nummer, status: r.status, start: r.start, slutt: r.slutt,
            pris_leige: r.pris_leige, gebyr: r.gebyr, depositum: r.depositum, pris_total: r.pris_total,
            produkt_namn: p?.namn, produkt_tilbehor: p?.tilbehor || [], eining_kode: e?.kode || null,
            butikk: b?.namn, vilkar: i?.vilkar, kontakt_telefon: i?.kontakt_telefon, kontakt_epost: i?.kontakt_epost,
            kunde_namn: k?.namn, kunde_telefon: k?.telefon, kunde_epost: k?.epost };
        });
      return ok(rows);
    }
    case 'login_liste':
      return ok(tabell('ansatte').filter((x) => x.aktiv).map((r) => utan(r, 'sats', 'email', 'skattetype', 'skatteprosent', 'frikortgrense', 'feriepengesats', 'tidlegare_ar', 'tidlegare_mekk', 'tidlegare_andre')));
    case 'min_profil':
      return ok(a && a.aktiv ? [JSON.parse(JSON.stringify(a))] : []);
    case 'min_butikk':
      return ok(a?.butikk_id ?? null);
    case 'login_status': {
      const d = new Date();
      const dag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return ok(tabell('shifts').filter((x) => x.date === dag).map((x) => ({ id: x.ansatt, start: x.start, slutt: x.slutt })));
    }
    case 'lag_rutineoppgaver':
      return ok(lagRutineoppgaver());
    case 'lonssatsar':
    case 'lonsdata':
      return ok(a && (a.leder || a.konsern_admin) ? tabell('ansatte').map((x) => ({
        id: x.id, sats: x.sats, skattetype: x.skattetype ?? null, skatteprosent: x.skatteprosent ?? null, frikortgrense: x.frikortgrense ?? null,
        feriepengesats: x.feriepengesats ?? 10.2, tidlegare_ar: x.tidlegare_ar ?? null, tidlegare_mekk: x.tidlegare_mekk ?? 0, tidlegare_andre: x.tidlegare_andre ?? 0,
      })) : []);
    default:
      return ok(null);
  }
};

const funksjonar = {
  async invoke(namn: string, opts?: { body?: Rad }) {
    const b = opts?.body ?? {};
    if (namn === 'pin-login') {
      // I demoen fungerer alle PIN-kodar.
      innlogga = String(b.id);
      return ok({ access_token: 'demo', refresh_token: 'demo' });
    }
    if (namn === 'ansatte-admin') {
      const liste = tabell('ansatte');
      const r = liste.find((x) => x.id === b.id);
      if (b.action === 'create') {
        const felt = utan(b, 'action', 'pin', 'password');
        liste.push({ aktiv: true, email: `${b.id}@demo.local`, butikk_id: 'demo-butikk', konsern_admin: false, created_at: new Date().toISOString(), ...felt });
      } else if (r && (b.action === 'deactivate' || b.action === 'reactivate')) {
        r.aktiv = b.action === 'reactivate';
      } else if (r && b.action === 'updateemail') {
        r.email = b.email;
      }
      return ok({ ok: true });
    }
    return ok({}); // send-push o.l.: ingenting å gjere i demoen
  },
};

export const supabase = {
  from: (t: string) => new Sporjing(t),
  rpc: (namn: string, args?: Rad) => rpc(namn, args),
  functions: funksjonar,
  auth: {
    async getSession() {
      if (kundeEpost) return ok({ session: { access_token: 'demo', refresh_token: 'demo', user: { email: kundeEpost } } });
      return ok({ session: okt() });
    },
    async refreshSession() { return ok({ session: okt() }); },
    onAuthStateChange(cb: Lyttar) {
      lyttarar.add(cb);
      return { data: { subscription: { unsubscribe: () => lyttarar.delete(cb) } } };
    },
    async setSession() { varsleAuth('SIGNED_IN'); return ok({ session: okt() }); },
    // Kundeinnlogging på «Mi side»: i demoen blir koden ikkje send, og kva som
    // helst 6-sifra kode godkjenner e-posten.
    async signInWithOtp() { return ok({}); },
    async verifyOtp(opts?: { email?: string }) { kundeEpost = String(opts?.email || '').toLowerCase(); return ok({ session: { user: { email: kundeEpost } } }); },
    async signOut() { innlogga = null; kundeEpost = null; varsleAuth('SIGNED_OUT'); return { error: null }; },
  },
  storage: {
    from: () => ({
      async upload(path: string, fil: File) {
        filer.set(path, URL.createObjectURL(fil));
        return ok({ path });
      },
      async createSignedUrl(path: string) {
        const u = filer.get(path);
        return u ? ok({ signedUrl: u }) : feil('Fila finst ikkje i demoen');
      },
    }),
  },
  channel() {
    const k = { on: () => k, subscribe: () => k };
    return k;
  },
  removeChannel() { return Promise.resolve('ok'); },
};

const filer = new Map<string, string>();

export const PIN_SALT = 'demo-';
export const pinToPassword = (pin: string) => `${PIN_SALT}${pin}`;
