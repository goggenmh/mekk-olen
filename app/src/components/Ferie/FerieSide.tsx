import { useMemo, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { FERIE_STYL, FERIE_TYPER } from '../../constants';
import { datoIntervall, MND, parseDate, shiftMonth, talDagar, today, UKE_KORT, weekdayIdx } from '../../lib/dates';
import { helligdagFor } from '../../lib/helligdagar';
import { feriesaldo, overlappar, raudePeriodar, virkedagar, type RaudPeriode } from '../../lib/ferie';
import { useIsMobile } from '../../lib/useIsMobile';
import { FerieModal } from '../Vaktplan/FerieModal';
import { UnavailableModal } from '../Vaktplan/UnavailableModal';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import type { Ferie, Unavailable } from '../../types';

const kort: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px', boxShadow: 'var(--shadow-card)' };
const etikett: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 10 };
const knapp: CSSProperties = { padding: '7px 13px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' };
const stil = (type: string) => FERIE_STYL[type] || FERIE_STYL.Fri;
// «Kan ikkje jobbe» (raude dagar frå vaktplanen) – eigen kategori, ikkje ein søknad.
const KAN_IKKJE = 'Kan ikkje jobbe';
const RAUD = { fg: 'var(--dag-raud-tekst)', bg: 'var(--dag-raud-sterk)', kant: 'var(--dag-raud-border)' };

const STATUS: Record<Ferie['status'], { tekst: string; fg: string; bg: string }> = {
  ventar: { tekst: 'Ventar på svar', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' },
  godkjend: { tekst: 'Godkjend', fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)' },
  avslatt: { tekst: 'Avslått', fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' },
};

export function FerieSide() {
  const { ferie, shifts, unavailable, canApprove, behandleFerie } = useAppData();
  const { ansatte, findAnsatt } = useAnsatte();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const leiar = canApprove(user?.id);
  const t = today();

  const [aar, setAar] = useState(Number(t.slice(0, 4)));
  const [manad, setManad] = useState(t.slice(0, 7));
  // Alle ser heile kalenderen, så det er lett å sjå kven som alt har fri.
  const [hvem, setHvem] = useState<string>('alle');
  const [typeFilter, setTypeFilter] = useState<string>('alle');
  const [modal, setModal] = useState<Ferie | 'ny' | null>(null);
  const [visTidlegare, setVisTidlegare] = useState(false);
  const [raudModal, setRaudModal] = useState<Unavailable[] | 'ny' | null>(null);

  // Tilsette ser eigne søknader og andre sitt godkjende fråvær (til planlegging).
  const synlege = useMemo(
    () => ferie.filter((f) => leiar || f.ansatt === user?.id || f.status === 'godkjend'),
    [ferie, leiar, user?.id],
  );
  const filtrert = synlege
    .filter((f) => hvem === 'alle' || f.ansatt === hvem)
    .filter((f) => typeFilter === 'alle' || f.type === typeFilter);
  const visRaude = typeFilter === 'alle' || typeFilter === KAN_IKKJE;
  const raude = useMemo(() => unavailable.filter((u) => hvem === 'alle' || u.ansatt === hvem), [unavailable, hvem]);
  const raudePer = useMemo(() => raudePeriodar(raude), [raude]);
  const kommandeRaude = raudePer.filter((p) => p.til >= t);

  const ventande = synlege.filter((f) => f.status === 'ventar').sort((a, b) => (a.fra || '').localeCompare(b.fra || ''));
  const kommande = filtrert.filter((f) => f.status === 'godkjend' && f.til && f.til >= t).sort((a, b) => (a.fra || '').localeCompare(b.fra || ''));
  const tidlegare = filtrert.filter((f) => f.status === 'godkjend' && f.til && f.til < t && (f.fra || '').slice(0, 4) <= String(aar) && (f.til || '').slice(0, 4) >= String(aar)).sort((a, b) => (b.fra || '').localeCompare(a.fra || ''));
  const avslatt = filtrert.filter((f) => f.status === 'avslatt' && (f.fra || '').slice(0, 4) === String(aar));

  const svar = async (f: Ferie, status: 'godkjend' | 'avslatt') => {
    const kommentar = window.prompt(status === 'godkjend' ? 'Kommentar til den tilsette (valfritt):' : 'Kvifor blir søknaden avslått? (valfritt)', '');
    if (kommentar === null) return;
    await behandleFerie(f.id, status, kommentar.trim());
  };

  const saldoListe = (leiar ? ansatte : ansatte.filter((a) => a.id === user?.id)).map((a) => ({ a, s: feriesaldo(a, ferie, aar) }));

  // Fråvær i år per type (dagar) for den/dei som er valt.
  const fravaerIAar = FERIE_TYPER.map((ty) => ({
    ty,
    dagar: synlege
      .filter((f) => f.status === 'godkjend' && f.type === ty && f.fra && f.til && (hvem === 'alle' ? (leiar || f.ansatt === user?.id) : f.ansatt === hvem))
      .reduce((s, f) => s + virkedagar(f.fra!, f.til!, aar), 0),
  }));
  const raudeIAar = raude.filter((u) => u.dato.slice(0, 4) === String(aar)).length;

  const Rad = ({ f }: { f: Ferie }) => {
    const a = findAnsatt(f.ansatt);
    const st = stil(f.type);
    const s = STATUS[f.status];
    const dagar = f.fra && f.til ? virkedagar(f.fra, f.til) : 0;
    const paagaar = f.status === 'godkjend' && !!f.fra && !!f.til && f.fra <= t && t <= f.til;
    const om = f.fra && f.fra > t ? talDagar(t, f.fra) - 1 : 0;
    return (
      <button
        onClick={() => setModal(f)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 12px', border: `1px solid ${st.kant}`, background: 'var(--surface-alt)', borderRadius: 'var(--r)', cursor: 'pointer', color: 'var(--text)' }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 'var(--r)', background: st.bg, color: st.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={st.ikon} size={17} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 13.5 }}>{a.navn}</b>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: st.fg, background: st.bg, borderRadius: 'var(--r)', padding: '1px 8px' }}>{f.type}</span>
            {f.status !== 'godkjend' && <span style={{ fontSize: 10.5, fontWeight: 700, color: s.fg, background: s.bg, borderRadius: 'var(--r)', padding: '1px 8px' }}>{s.tekst}</span>}
            {paagaar && <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--surface)', background: st.fg, borderRadius: 999, padding: '1px 8px' }}>Pågår</span>}
            {om > 0 && f.status === 'godkjend' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>om {om} d</span>}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
            {f.fra ? datoIntervall(f.fra, f.til) : 'Utan dato'} · {dagar} {dagar === 1 ? 'virkedag' : 'virkedagar'}{f.tekst ? ` — ${f.tekst}` : ''}
          </span>
          {f.svar && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Svar: {f.svar}</span>}
        </span>
      </button>
    );
  };

  const RaudRad = ({ p }: { p: RaudPeriode }) => {
    const a = findAnsatt(p.ansatt);
    const n = p.dagar.length;
    const paagaar = p.fra <= t && t <= p.til;
    const om = p.fra > t ? talDagar(t, p.fra) - 1 : 0;
    return (
      <button
        onClick={() => setRaudModal(p.dagar)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 12px', border: `1px solid ${RAUD.kant}`, background: 'var(--surface-alt)', borderRadius: 'var(--r)', cursor: 'pointer', color: 'var(--text)' }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 'var(--r)', background: RAUD.bg, color: RAUD.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="alert" size={17} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 13.5 }}>{a.navn}</b>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: RAUD.fg, background: RAUD.bg, borderRadius: 'var(--r)', padding: '1px 8px' }}>Kan ikkje jobbe</span>
            {paagaar && <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--surface)', background: RAUD.fg, borderRadius: 999, padding: '1px 8px' }}>{p.fra === p.til ? 'I dag' : 'Pågår'}</span>}
            {om > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>om {om} d</span>}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
            {datoIntervall(p.fra, p.til)} · {n} {n === 1 ? 'dag' : 'dagar'}{p.grunn ? ` — ${p.grunn}` : ''}
          </span>
        </span>
      </button>
    );
  };

  // ---- månadskalender ----
  const [my, mm] = manad.split('-').map(Number);
  const dagarIManad = new Date(my, mm, 0).getDate();
  const datoar = Array.from({ length: dagarIManad }, (_, i) => `${manad}-${String(i + 1).padStart(2, '0')}`);
  const kalenderTilsette = ansatte.filter((a) => hvem === 'alle' || a.id === hvem);

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="sidetittel">Ferie &amp; fri</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setAar(aar - 1)} style={knapp} aria-label="Førre år">‹</button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 44, textAlign: 'center' }}>{aar}</span>
          <button onClick={() => setAar(aar + 1)} style={knapp} aria-label="Neste år">›</button>
        </div>
        <button
          onClick={() => setModal('ny')}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {leiar ? '+ Registrer ferie/fri' : '+ Søk om ferie/fri'}
        </button>
        <button
          onClick={() => setRaudModal('ny')}
          style={{ padding: '9px 16px', background: 'var(--surface)', color: RAUD.fg, border: `1px solid ${RAUD.kant}`, borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Kan ikkje jobbe
        </button>
      </div>

      {/* Saldo */}
      <div style={{ display: 'grid', gridTemplateColumns: leiar && !isMobile ? '1.4fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div style={kort}>
          <div style={etikett}>Feriedagar {aar}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {saldoListe.map(({ a, s }) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <Avatar init={a.init} farge={a.farge} size={24} fontSize={9.5} />
                <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1, minWidth: 120 }}>{a.navn}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  <b style={{ color: 'var(--text)' }}>{s.brukt}</b> brukt · <b style={{ color: 'var(--text)' }}>{s.planlagt}</b> planlagt{s.sokt ? <> · <b style={{ color: 'var(--pill-amber-fg)' }}>{s.sokt}</b> søkt</> : null}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>Virkedagar (måndag–laurdag, utan raude dagar). Berre typen «Ferie» blir talt som feriedagar.</div>
        </div>

        <div style={kort}>
          <div style={etikett}>{leiar ? 'Søknader som ventar' : 'Mine søknader'}</div>
          {ventande.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen søknader ventar.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ventande.map((f) => {
              const andre = overlappar(f, ferie);
              const vakter = shifts.filter((s) => s.ansatt === f.ansatt && f.fra && f.til && s.date >= f.fra && s.date <= f.til).length;
              return (
                <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Rad f={f} />
                  {leiar && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingLeft: 4 }}>
                      {vakter > 0 && <span style={{ fontSize: 11.5, color: 'var(--pill-amber-fg)' }}>⚠ {vakter} {vakter === 1 ? 'vakt' : 'vakter'} i perioden</span>}
                      {andre.length > 0 && <span style={{ fontSize: 11.5, color: 'var(--pill-amber-fg)' }}>⚠ {andre.map((x) => findAnsatt(x.ansatt).navn.split(' ')[0]).join(', ')} òg borte</span>}
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        <button onClick={() => svar(f, 'avslatt')} style={{ ...knapp, color: 'var(--danger)' }}>Avslå</button>
                        <button onClick={() => svar(f, 'godkjend')} style={{ ...knapp, background: '#2f9e6f', color: '#fff', borderColor: '#2f9e6f' }}>Godkjenn</button>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={hvem} onChange={(e) => setHvem(e.target.value)} aria-label="Vel tilsett" style={{ ...knapp, paddingRight: 28 }}>
          <option value="alle">Alle tilsette</option>
          {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
        </select>
        {['alle', ...FERIE_TYPER, KAN_IKKJE].map((ty) => (
          <button
            key={ty}
            onClick={() => setTypeFilter(ty)}
            aria-pressed={typeFilter === ty}
            style={{ ...knapp, background: typeFilter === ty ? 'var(--brand-strong)' : 'var(--surface)', color: typeFilter === ty ? 'var(--on-brand)' : 'var(--text-secondary)' }}
          >
            {ty === 'alle' ? 'Alle typar' : ty}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--text-muted)' }}>
          {aar}: {[...fravaerIAar.filter((x) => x.dagar > 0).map((x) => `${x.ty.toLowerCase()} ${x.dagar} d`), ...(raudeIAar ? [`kan ikkje jobbe ${raudeIAar} d`] : [])].join(' · ') || 'ingen fråvær registrert'}
        </span>
      </div>

      {/* Kalender */}
      <div style={{ ...kort, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--divider)' }}>
          <button onClick={() => setManad(shiftMonth(manad, -1))} style={knapp} aria-label="Førre månad">‹</button>
          <b style={{ fontSize: 14.5, minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>{MND[mm - 1]} {my}</b>
          <button onClick={() => setManad(shiftMonth(manad, 1))} style={knapp} aria-label="Neste månad">›</button>
          <button onClick={() => setManad(t.slice(0, 7))} style={knapp}>I dag</button>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 11.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {FERIE_TYPER.map((ty) => <span key={ty} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: stil(ty).fg }} />{ty}</span>)}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: RAUD.bg, border: `1.5px solid ${RAUD.fg}` }} />Kan ikkje jobbe</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px dashed var(--text-muted)' }} />Søkt</span>
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: 'var(--surface)', textAlign: 'left', padding: '6px 12px', minWidth: 130, zIndex: 1 }} />
                {datoar.map((d) => {
                  const sondag = parseDate(d).getDay() === 0;
                  const raud = !!helligdagFor(d);
                  return (
                    <th key={d} title={helligdagFor(d) || undefined} style={{ padding: '4px 0', width: 26, minWidth: 26, fontWeight: 700, color: raud || sondag ? 'var(--dag-raud-tekst)' : d === t ? 'var(--brand-strong)' : 'var(--text-label)', background: d === t ? 'var(--brand-soft)' : undefined }}>
                      <div style={{ fontSize: 9 }}>{sondag ? 'SØN' : UKE_KORT[weekdayIdx(d)]?.slice(0, 2)}</div>
                      <div>{parseDate(d).getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {kalenderTilsette.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid var(--divider)' }}>
                  <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', padding: '6px 12px', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', zIndex: 1 }}>{a.navn}</td>
                  {datoar.map((d) => {
                    const f = synlege.find((x) => x.ansatt === a.id && x.status !== 'avslatt' && x.fra && x.til && x.fra <= d && d <= x.til && (typeFilter === 'alle' || x.type === typeFilter));
                    const u = !f && visRaude ? raude.find((x) => x.ansatt === a.id && x.dato === d) : undefined;
                    const up = u ? raudePer.find((p) => p.dagar.includes(u)) : undefined;
                    const sondag = parseDate(d).getDay() === 0 || !!helligdagFor(d);
                    const st = f ? stil(f.type) : null;
                    return (
                      <td key={d} style={{ padding: 2, background: sondag ? 'var(--surface-soft)' : undefined }}>
                        {f && st && (
                          <button
                            onClick={() => setModal(f)}
                            title={`${a.navn}: ${f.type}${f.status === 'ventar' ? ' (søkt)' : ''}${f.tekst ? ` – ${f.tekst}` : ''}`}
                            style={{ display: 'block', width: '100%', height: 20, borderRadius: 4, cursor: 'pointer', padding: 0, background: f.status === 'ventar' ? 'transparent' : st.fg, border: f.status === 'ventar' ? `1.5px dashed ${st.fg}` : 'none', opacity: sondag ? 0.5 : 1 }}
                          />
                        )}
                        {u && (
                          <button
                            onClick={() => setRaudModal(up?.dagar ?? [u])}
                            title={`${a.navn}: kan ikkje jobbe${u.grunn ? ` – ${u.grunn}` : ''}`}
                            style={{ display: 'block', width: '100%', height: 20, borderRadius: 4, cursor: 'pointer', padding: 0, background: RAUD.bg, border: `1.5px solid ${RAUD.fg}` }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lister */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={kort}>
          <div style={etikett}>Pågår og kommande</div>
          {(typeFilter === KAN_IKKJE ? 0 : kommande.length) + (visRaude ? kommandeRaude.length : 0) === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen planlagt fråvær.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ...(typeFilter === KAN_IKKJE ? [] : kommande.map((f) => ({ fra: f.fra || '', el: <Rad key={f.id} f={f} /> }))),
              ...(visRaude ? kommandeRaude.map((p) => ({ fra: p.fra, el: <RaudRad key={p.dagar[0].id} p={p} /> })) : []),
            ].sort((a, b) => a.fra.localeCompare(b.fra)).map((x) => x.el)}
          </div>
        </div>
        <div style={kort}>
          <button onClick={() => setVisTidlegare(!visTidlegare)} style={{ ...etikett, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', gap: 6 }}>
            {visTidlegare ? '▾' : '▸'} Tidlegare i {aar} ({tidlegare.length}){avslatt.length > 0 ? ` · avslått (${avslatt.length})` : ''}
          </button>
          {visTidlegare && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tidlegare.length === 0 && avslatt.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen registrert.</div>}
              {[...tidlegare, ...avslatt].map((f) => <Rad key={f.id} f={f} />)}
            </div>
          )}
          {!visTidlegare && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Trykk for å vise historikk.</div>}
        </div>
      </div>

      {raudModal && <UnavailableModal dato={t} existing={raudModal === 'ny' ? undefined : raudModal} ansatt={hvem !== 'alle' && leiar ? hvem : undefined} onClose={() => setRaudModal(null)} />}
      {modal && <FerieModal existing={modal === 'ny' ? undefined : modal} onClose={() => setModal(null)} />}
    </div>
  );
}

