import { useMemo, useState } from 'react';
import { kortStil, kortLabel } from './stil';
import { today, addDays, parseDate, MND } from '../../lib/dates';
import { kr, type UtleigeReservasjon } from '../../lib/utleige';
import type { UtleigeData } from './useUtleige';

// Enkel rapport for dagleg leiar. Alt blir rekna på klienten frå data som alt
// er lasta (reservasjonar, produkt, einingar, sperrer). Beløp er RESERVERT,
// ikkje betalt – det finst ingen betalingsleverandør enno, så vi presenterer
// aldri reserverte beløp som om dei er innbetalte.

// Statusar som gir reservert leigeinntekt (ikkje 'ny', 'avbestilt', 'avslatt').
const INNTEKT: UtleigeReservasjon['status'][] = ['stadfesta', 'klar', 'utleigd', 'forseinka', 'returnert', 'kontroll'];
const DOGN = 864e5;

type Val = { namn: string; fra: string; til: string };

export function UtleigeRapport({ data }: { data: UtleigeData }) {
  const { produkt, einingar, reservasjonar, sperrer } = data;
  const t = today();
  const forsteIMnd = `${t.slice(0, 7)}-01`;
  const [val, setVal] = useState<Val>({ namn: 'Denne månaden', fra: forsteIMnd, til: t });

  const presets: Val[] = [
    { namn: 'Denne månaden', fra: forsteIMnd, til: t },
    { namn: 'Siste 30 dagar', fra: addDays(t, -29), til: t },
    { namn: 'Siste 90 dagar', fra: addDays(t, -89), til: t },
    { namn: 'I år', fra: `${t.slice(0, 4)}-01-01`, til: t },
  ];

  const r = useMemo(() => {
    const fra = parseDate(val.fra).getTime();
    const til = parseDate(addDays(val.til, 1)).getTime(); // til og med heile sluttdagen
    const spenn = Math.max(DOGN, til - fra);
    const startIPerioden = (x: UtleigeReservasjon) => { const s = parseDate(x.start.slice(0, 10)).getTime(); return s >= fra && s < til; };
    const overlapp = (x: UtleigeReservasjon) => {
      const s = Math.max(new Date(x.start).getTime(), fra);
      const e = Math.min(new Date(x.slutt).getTime(), til);
      return Math.max(0, e - s);
    };
    const iPerioden = reservasjonar.filter(startIPerioden);
    const inntektsres = iPerioden.filter((x) => INNTEKT.includes(x.status));
    const perProdukt = produkt.map((p) => ({
      p,
      antal: inntektsres.filter((x) => x.produkt_id === p.id).length,
      inntekt: inntektsres.filter((x) => x.produkt_id === p.id).reduce((s, x) => s + x.pris_total, 0),
    })).sort((a, b) => b.antal - a.antal || b.inntekt - a.inntekt);
    const perEining = einingar.map((e) => {
      const brukt = reservasjonar.filter((x) => x.eining_id === e.id && INNTEKT.includes(x.status)).reduce((s, x) => s + overlapp(x), 0);
      return { e, prosent: Math.min(100, Math.round((brukt / spenn) * 100)), produkt: produkt.find((p) => p.id === e.produkt_id)?.namn ?? '' };
    }).sort((a, b) => b.prosent - a.prosent);
    return {
      antal: iPerioden.length,
      inntekt: inntektsres.reduce((s, x) => s + x.pris_total, 0),
      depositum: inntektsres.reduce((s, x) => s + x.depositum, 0),
      avbestilt: iPerioden.filter((x) => ['avbestilt', 'avslatt'].includes(x.status)).length,
      forseinka: reservasjonar.filter((x) => x.status === 'forseinka').length,
      perProdukt,
      perEining,
      vedlikehald: einingar.filter((e) => e.status === 'vedlikehald' || e.status === 'kontroll'),
      opneSperrer: sperrer.filter((s) => !s.slutt || new Date(s.slutt) > new Date()),
    };
  }, [val, reservasjonar, produkt, einingar, sperrer]);

  const periodeTekst = `${parseDate(val.fra).getDate()}. ${MND[parseDate(val.fra).getMonth()]} – ${parseDate(val.til).getDate()}. ${MND[parseDate(val.til).getMonth()]}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {presets.map((p) => (
          <button key={p.namn} onClick={() => setVal(p)} aria-pressed={val.namn === p.namn}
            style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
              background: val.namn === p.namn ? 'var(--brand-soft)' : 'var(--surface)', color: val.namn === p.namn ? 'var(--brand-strong)' : 'var(--text-secondary)' }}>
            {p.namn}
          </button>
        ))}
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto', fontSize: 13 }}>
          <input type="date" value={val.fra} max={val.til} onChange={(e) => setVal({ namn: 'Eigen', fra: e.target.value, til: val.til })} style={datoFelt} />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="date" value={val.til} min={val.fra} max={t} onChange={(e) => setVal({ namn: 'Eigen', fra: val.fra, til: e.target.value })} style={datoFelt} />
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Tal label="Reservasjonar" verdi={String(r.antal)} under={periodeTekst} />
        <Tal label="Reservert leigeinntekt" verdi={kr(r.inntekt)} under="reservert, ikkje betalt" sterk />
        <Tal label="Avbestillingar / avslag" verdi={String(r.avbestilt)} under="i perioden" />
        <Tal label="Forseinka returar no" verdi={String(r.forseinka)} under={r.forseinka > 0 ? 'treng oppfølging' : 'ingen'} fare={r.forseinka > 0} />
      </div>

      {/* Betalingsstatus – tydeleg skilje mellom reservert og betalt */}
      <div style={{ ...kortStil, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={kortLabel}>Betalingsstatus</div>
        <Rad k="Reservert leigeinntekt (ikkje betalt)" v={kr(r.inntekt)} />
        <Rad k="Reservert depositum" v={kr(r.depositum)} />
        <Rad k="Faktisk innbetalt" v="–" grå />
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>
          Ingen betalingsleverandør er kopla til enno, så systemet registrerer ikkje innbetalingar. Beløpa over er <strong>reserverte</strong> (det kundane skal betale ved henting), ikkje innbetalte. Betaling og depositum blir i dag handtert i kassa/manuelt.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'start' }}>
        <div style={{ ...kortStil, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={kortLabel}>Utleige per produkt</div>
          {r.perProdukt.length === 0 && <Tom>Ingen produkt enno.</Tom>}
          {r.perProdukt.map(({ p, antal, inntekt }) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
              <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.namn}</span>
              <span style={{ color: 'var(--text-muted)' }}>{antal} {antal === 1 ? 'leige' : 'leiger'}</span>
              <span style={{ width: 92, textAlign: 'right', fontWeight: 700 }}>{kr(inntekt)}</span>
            </div>
          ))}
          {r.perProdukt.length > 1 && r.perProdukt[0].antal > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', borderTop: '1px solid var(--divider)', paddingTop: 6 }}>
              Mest utleigd: <strong>{r.perProdukt[0].p.namn}</strong>. Minst: <strong>{r.perProdukt[r.perProdukt.length - 1].p.namn}</strong>.
            </div>
          )}
        </div>

        <div style={{ ...kortStil, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={kortLabel}>Belegg per eining <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({periodeTekst})</span></div>
          {r.perEining.length === 0 && <Tom>Ingen einingar enno.</Tom>}
          {r.perEining.map(({ e, prosent, produkt: pn }) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ width: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{e.kode}</strong> <span style={{ color: 'var(--text-muted)' }}>{pn}</span></span>
              <span style={{ flex: 1, height: 8, background: 'var(--surface-alt)', borderRadius: 999, overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${prosent}%`, background: prosent >= 70 ? 'var(--mekk-navy)' : 'var(--mekk-teal)' }} />
              </span>
              <span style={{ width: 38, textAlign: 'right', fontWeight: 700 }}>{prosent}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...kortStil, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={kortLabel}>Vedlikehald</div>
        {r.vedlikehald.length === 0 && r.opneSperrer.length === 0 ? (
          <Tom>Ingen einingar treng vedlikehald.</Tom>
        ) : (
          <>
            {r.vedlikehald.map((e) => (
              <Rad key={e.id} k={`${e.kode} · ${produkt.find((p) => p.id === e.produkt_id)?.namn ?? ''}`} v={e.status === 'vedlikehald' ? 'Vedlikehald' : 'Til kontroll'} />
            ))}
            {r.opneSperrer.length > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.opneSperrer.length} opne sperre(r) på utstyr.</div>}
          </>
        )}
      </div>
    </div>
  );
}

const datoFelt = { padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-sans)' } as const;

function Tal({ label, verdi, under, sterk, fare }: { label: string; verdi: string; under?: string; sterk?: boolean; fare?: boolean }) {
  return (
    <div style={{ ...kortStil, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--kort-label)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, color: fare ? 'var(--danger)' : sterk ? 'var(--brand-strong)' : 'var(--text)' }}>{verdi}</div>
      {under && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{under}</div>}
    </div>
  );
}

function Rad({ k, v, grå }: { k: string; v: string; grå?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
      <strong style={{ color: grå ? 'var(--text-muted)' : 'var(--text)' }}>{v}</strong>
    </div>
  );
}

const Tom = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{children}</div>;
