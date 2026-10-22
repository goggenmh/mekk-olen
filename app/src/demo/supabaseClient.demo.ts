// Demo-utgåve av supabaseClient: ein liten database i minnet med oppdikta
// testdata, så heile appen kan opnast som éi HTML-fil utan nett og utan
// innlogging. Blir berre brukt av `npm run build:demo` (sjå vite.demo.config.ts).
// Alt som blir endra, forsvinn når sida blir lasta på nytt.
import { lagTestdata, type Rad } from './testdata';

type Db = Record<string, Rad[]>;
let db: Db | null = null;
const data = (): Db => (db ??= lagTestdata());
const tabell = (t: string) => (data()[t] ??= []);

let innlogga: string | null = null;
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
  return n;
}

type Filter = (r: Rad) => boolean;

/** Kopi av rada utan dei gitte felta. */
const utan = (r: Rad, ...felt: string[]): Rad => Object.fromEntries(Object.entries(r).filter(([k]) => !felt.includes(k)));

class Sporjing implements PromiseLike<{ data: unknown; error: unknown }> {
  private filter: Filter[] = [];
  private sortering: { kol: string; opp: boolean } | null = null;
  private returner = false;
  private berreEin = false;
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

const rpc = async (namn: string): Promise<{ data: unknown; error: unknown }> => {
  const a = meg();
  switch (namn) {
    case 'login_liste':
      return ok(tabell('ansatte').filter((x) => x.aktiv).map((r) => utan(r, 'sats', 'email', 'skattetype', 'skatteprosent', 'frikortgrense', 'feriepengesats', 'tidlegare_ar', 'tidlegare_mekk', 'tidlegare_andre')));
    case 'min_profil':
      return ok(a && a.aktiv ? [JSON.parse(JSON.stringify(a))] : []);
    case 'min_butikk':
      return ok(a?.butikk_id ?? null);
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
  rpc: (namn: string) => rpc(namn),
  functions: funksjonar,
  auth: {
    async getSession() { return ok({ session: okt() }); },
    onAuthStateChange(cb: Lyttar) {
      lyttarar.add(cb);
      return { data: { subscription: { unsubscribe: () => lyttarar.delete(cb) } } };
    },
    async setSession() { varsleAuth('SIGNED_IN'); return ok({ session: okt() }); },
    async signOut() { innlogga = null; varsleAuth('SIGNED_OUT'); return { error: null }; },
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
