import { useEffect, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { DAGER_VAKTPLAN } from '../../constants';
import { weekDates, mondayOf, today, fullDatoTekst, fmt, timar, UKE_KORT, weekdayIdx, addDays, datoKort, datoIntervall, parseDate, isoWeek } from '../../lib/dates';
import { useIsMobile } from '../../lib/useIsMobile';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { TimeEntryModal } from '../Timeliste/TimeEntryModal';
import { ShiftModal } from '../Vaktplan/ShiftModal';
import { TaskModal } from '../Oppgaver/TaskModal';
import { OrderModal } from '../Bestillinger/OrderModal';
import type { View } from '../../lib/view';
import { alder } from '../../lib/bestilling';
import { tal } from '../../lib/tekst';
import { ustadfesta } from '../../lib/dokument';
import { ventandeFerie } from '../../lib/ferie';
import { erForseinka, fristTekst, ledigeOppgaver, mineIDag } from '../../lib/oppgave';
import type { Task } from '../../types';
import { HurtigKnapp } from './HurtigKnapp';
import { planTimar } from '../../lib/avvik';

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', boxShadow: 'var(--shadow-card)' } as const;
const labelStyle = { fontSize: 11.5, fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--kort-label)', marginBottom: 9 } as const;
const DAG_KEYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lau'];

export function Dashboard({ setView }: { setView: (v: View) => void }) {
  const { entries, shifts, swaps, tasks, orders, ferie: alleFerie, meldinger, docs, stadfestingar, canApprove, completeTask, moveTask } = useAppData();
  const [opneTask, setOpneTask] = useState<Task | null>(null);
  const ferie = alleFerie.filter((f) => f.status === 'godkjend');
  const { user } = useAuth();
  const kanLageVakt = canApprove(user?.id);
  const { ansatte, findAnsatt } = useAnsatte();
  const isMobile = useIsMobile();
  const [quickAction, setQuickAction] = useState<'timer' | 'vakt' | 'oppgave' | 'bestilling' | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Klokka viser berre timar og minutt: teikn oversikta på nytt når
    // minuttet skiftar, ikkje kvart sekund.
    const id = setInterval(() => setNow((prev) => {
      const d = new Date();
      return d.getMinutes() === prev.getMinutes() && d.getHours() === prev.getHours() ? prev : d;
    }), 1000);
    return () => clearInterval(id);
  }, []);
  const klokke = now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });

  const mineMeldinger = meldinger.filter((m) => m.til === null || m.til === user?.id).slice(0, 5);

  const t = today();
  const weekDays = weekDates(mondayOf(t));
  const forrigeVeke = weekDates(mondayOf(addDays(t, -7)));

  // ---- helsing ----
  const time = now.getHours();
  const helsing = time < 10 ? 'God morgon' : time < 18 ? 'God dag' : 'God kveld';
  const fornamn = (user?.navn || '').split(' ')[0];

  // ---- varslingssenter ----
  const pendingSwaps = swaps.filter((s) => s.status === 'pending');
  const ventandeTimar = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
  const ufordelteOppgaver = ledigeOppgaver(tasks).length;
  const blokkerteOppgaver = kanLageVakt ? tasks.filter((x) => !x.ferdig && x.blokkert).length : 0;
  const ankomneBestillingar = orders.filter((o) => o.status === 'komen' && !o.varsla);
  const gamleBestillingar = orders.filter((o) => alder(o, t).gammal).length;
  const forseinka = tasks.filter((x) => !x.ferdig && x.frist && x.frist < t && (kanLageVakt || x.ansatt === user?.id)).length;
  const ulesneHms = ustadfesta(docs, stadfestingar, user?.id);

  // Alvorsgrad: høg (raud) → middels (gul) → info. Alder der vi veit han.
  const nyasteFerie = alleFerie.filter((f) => f.status === 'ventar' && f.createdAt).map((f) => f.createdAt!).sort().pop();
  const eldsteForseinka = tasks.filter((x) => !x.ferdig && x.frist && x.frist < t && (kanLageVakt || x.ansatt === user?.id)).map((x) => x.frist!).sort()[0];
  const varslerUsortert: Varsel[] = [
    ...pendingSwaps.map((s) => ({ key: `swap-${s.id}`, tekst: `${findAnsatt(s.fra).navn} ønskjer å bytte vakt ${s.dag}`, view: 'vaktplan' as View, niva: 'middels' as const })),
    ...(ventandeTimar > 0 ? [{ key: 'timar', tekst: `${tal(ventandeTimar, 'timeføring', 'timeføringar')} ventar på godkjenning`, view: 'timeliste' as View, niva: 'middels' as const }] : []),
    ...ankomneBestillingar.map((o) => ({ key: `order-${o.id}`, tekst: `Bestilling til ${o.kunde} har kome`, view: 'bestilling' as View, niva: 'middels' as const })),
    ...(gamleBestillingar > 0 ? [{ key: 'gamle', tekst: `${tal(gamleBestillingar, 'bestilling', 'bestillingar')} har stått lenge`, view: 'bestilling' as View, niva: 'hog' as const }] : []),
    ...(kanLageVakt && ventandeFerie(alleFerie) > 0 ? [{ key: 'ferie', tekst: `${ventandeFerie(alleFerie)} søknader om ferie/fri ventar på svar`, view: 'ferie' as View, niva: 'middels' as const, alder: nyasteFerie ? alderTekst(nyasteFerie, now) : undefined }] : []),
    ...(blokkerteOppgaver > 0 ? [{ key: 'blokkert', tekst: `${tal(blokkerteOppgaver, 'oppgåve', 'oppgåver')} står fast og treng hjelp`, view: 'oppgaver' as View, niva: 'hog' as const }] : []),
    ...(forseinka > 0 ? [{ key: 'forseinka', tekst: `${tal(forseinka, 'oppgåve', 'oppgåver')} har passert fristen`, view: 'oppgaver' as View, niva: 'hog' as const, alder: eldsteForseinka ? `Frist ${fristTekst(eldsteForseinka, t).toLowerCase()}` : undefined }] : []),
    ...(ulesneHms > 0 ? [{ key: 'hms', tekst: `${ulesneHms} HMS-dokument ventar på stadfesting`, view: 'dokument' as View, niva: 'middels' as const }] : []),
    ...(ufordelteOppgaver > 0 ? [{ key: 'oppgaver', tekst: tal(ufordelteOppgaver, 'ufordelt oppgåve', 'ufordelte oppgåver'), view: 'oppgaver' as View, niva: 'info' as const }] : []),
  ];
  const varsler = varslerUsortert.slice().sort((a, b) => NIVA_RANG[a.niva] - NIVA_RANG[b.niva]).slice(0, 8);
  // Leiarar får «Treng handling» øvst på sida; tilsette ser varsla lenger ned.
  const leiarVisning = kanLageVakt;

  // ---- nøkkeltal (topp) ----
  const totalTimarUke = entries.filter((e) => weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
  // Trend: samanlikn dagane som er ferdige denne veka med dei same dagane
  // førre veke. Elles ser måndag morgon alltid ut som «↓ 100 %».
  const ferdigeDagar = weekDays.filter((d) => d < t).length;
  const sumDagar = (dagar: string[]) => entries.filter((e) => dagar.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
  const hittilNo = sumDagar(weekDays.slice(0, ferdigeDagar));
  const hittilForrige = sumDagar(forrigeVeke.slice(0, ferdigeDagar));
  const timarTrend = ferdigeDagar > 0 && hittilForrige > 0 ? Math.round(((hittilNo - hittilForrige) / hittilForrige) * 100) : null;
  const aktiveBestillingar = orders.filter((o) => o.status !== 'henta').length;
  const opneOppgaver = tasks.filter((x) => !x.ferdig).length;

  const nokkeltal = [
    { verdi: `${fmt(totalTimarUke)} t`, lab: 'Timar denne veka', trend: timarTrend },
    { verdi: String(aktiveBestillingar), lab: 'Bestillingar', trend: null as number | null },
    { verdi: String(ventandeTimar), lab: 'Til godkjenning', trend: null as number | null },
    { verdi: String(opneOppgaver), lab: 'Opne oppgåver', trend: null as number | null },
  ];

  // ---- denne uka: timar per ansatt ----
  const timarPerAnsatt = ansatte.map((a) => ({
    a,
    t: entries.filter((e) => e.ansatt === a.id && weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0),
  }));
  const maxTimar = Math.max(1, ...timarPerAnsatt.map((x) => x.t));

  // ---- kommande vakter ----
  const kommendeVakter = weekDays
    .filter((d) => d >= t)
    .map((d) => ({ dato: d, vakter: shifts.filter((s) => s.date === d).slice().sort((a, b) => (a.start < b.start ? -1 : 1)) }))
    .filter((g) => g.vakter.length > 0)
    .slice(0, 4);

  // ---- neste vakt for innlogga brukar ----
  const mineFramtidige = shifts
    // Vakter som alt er ferdige i dag, er ikkje «neste vakt».
    .filter((s) => s.ansatt === user?.id && (s.date > t || (s.date === t && s.slutt > klokke)))
    .slice()
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.start < b.start ? -1 : 1)));
  const nesteVakt = mineFramtidige[0];
  const nesteKollegaer = nesteVakt
    ? shifts.filter((s) => s.date === nesteVakt.date && s.ansatt !== user?.id).map((s) => findAnsatt(s.ansatt).navn.split(' ')[0])
    : [];
  let startOm = '';
  if (nesteVakt && nesteVakt.date === t) {
    const [hh, mm] = nesteVakt.start.split(':').map(Number);
    const diff = hh * 60 + mm - (now.getHours() * 60 + now.getMinutes());
    if (diff > 0) startOm = diff >= 60 ? `Startar om ${Math.floor(diff / 60)} t ${diff % 60} min` : `Startar om ${diff} min`;
    else startOm = 'På jobb no';
  }

  // ---- timar per dag (denne veka) ----
  // Førte timar mot vaktplanen (alle tilsette), så avvik syner.
  const timarPerDag = weekDays.map((d) => ({
    d,
    t: entries.filter((e) => e.date === d).reduce((acc, e) => acc + timar(e), 0),
    plan: ansatte.reduce((acc, a) => acc + planTimar(shifts, a.id, d), 0),
  }));
  const maxDag = Math.max(1, ...timarPerDag.map((x) => Math.max(x.t, x.plan)));
  const sumFort = timarPerDag.reduce((acc, x) => acc + x.t, 0);
  const sumPlan = timarPerDag.reduce((acc, x) => acc + x.plan, 0);

  // ---- dagens oppgåver for den innlogga ----
  const dagensOppgaver = mineIDag(tasks, user?.id, t);
  const ledigeIDag = ledigeOppgaver(tasks).filter((x) => !x.frist || x.frist <= t);

  // ---- i dag: opne/steng ----
  const wi = weekdayIdx(t);
  const dagDef = DAGER_VAKTPLAN.find((d) => d.key === DAG_KEYS[wi]);
  const [apnTid, stengTid] = (dagDef?.open || '').split('–');

  // ---- ansattstatus ----
  // Pågåande og kommande ferie/fri først, avslutta blir droppa.
  const dashFerie = ferie
    .filter((f) => !f.til || f.til >= t)
    .slice()
    .sort((a, b) => (a.fra || '9999').localeCompare(b.fra || '9999'))
    .slice(0, 4);

  type HurtigKey = 'timer' | 'vakt' | 'oppgave' | 'bestilling';
  const hurtighandlinger: { key: HurtigKey; ikon: string; tekst: string }[] = [
    { key: 'timer', ikon: 'ny-timer', tekst: 'Registrer timar' },
    // Berre leiar/delegert kan opprette vakter.
    ...(kanLageVakt ? [{ key: 'vakt' as const, ikon: 'ny-vakt', tekst: 'Ny vakt' }] : []),
    { key: 'oppgave', ikon: 'ny-oppgave', tekst: 'Ny oppgåve' },
    { key: 'bestilling', ikon: 'ny-bestilling', tekst: 'Ny bestilling' },
  ];

  return (
    <div style={{ padding: isMobile ? '16px 16px 28px' : '24px 28px 34px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: isMobile ? 22 : 26, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            {helsing}, <span style={{ background: 'linear-gradient(120deg, var(--brand), var(--brand-strong))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fornamn}</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>{fullDatoTekst(t)}</div>
        </div>
        {!isMobile && (
          <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
            <div style={{ fontFamily: "'Geist Mono Variable'", fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>{klokke}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>Veke {isoWeek(t)}</div>
          </div>
        )}
      </div>

      {/* Neste vakt er det viktigaste for dei fleste – størst, øvst. */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 15, alignItems: 'stretch' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r)', padding: isMobile ? '18px 20px' : '24px 28px', minHeight: isMobile ? 0 : 230, display: 'flex', flexDirection: 'column', background: 'var(--hero-grad)', color: 'var(--hero-fg)', boxShadow: '0 12px 32px rgba(12, 90, 105, 0.28)' }}>
          <span style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 68%)', pointerEvents: 'none' }} />
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', background: 'var(--cta)', color: 'var(--on-cta)', padding: '5px 11px', borderRadius: 20 }}>
            Neste vakt {nesteVakt ? (nesteVakt.date === t ? '· I dag' : `· ${datoKort(nesteVakt.date)}`) : ''}
          </span>
          {nesteVakt ? (
            <>
              <div style={{ fontFamily: "'Geist Mono Variable'", fontSize: isMobile ? 40 : 56, fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, margin: '14px 0 4px' }}>{nesteVakt.start} – {nesteVakt.slutt}</div>
              <div style={{ fontSize: 15, color: 'var(--hero-sub)', fontWeight: 600, textTransform: 'capitalize' }}>{nesteVakt.skift || 'Vakt'}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16, flexWrap: 'wrap' }}>
                {nesteKollegaer.length > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.14)', padding: '8px 12px', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600 }}><Icon name="user" size={14} /> Saman med {nesteKollegaer.join(' & ')}</span>
                )}
                {startOm && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.14)', padding: '8px 12px', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600 }}><Icon name="timeliste" size={14} /> {startOm}</span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 15, color: 'var(--hero-sub)', marginTop: 16, fontWeight: 500 }}>Ingen komande vakt planlagt denne veka.</div>
          )}
        </div>

      {/* Dagens oppgåver: det den innlogga skal gjere i dag, utan å opne modulen. */}
      <div style={{ ...cardStyle, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>Dine oppgåver i dag</div>
          <button onClick={() => setView('oppgaver')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--brand)' }}>Alle oppgåver ‹</button>
        </div>
        {dagensOppgaver.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen oppgåver med frist i dag. 👍</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dagensOppgaver.slice(0, 6).map((o) => {
            const forfalle = erForseinka(o, t);
            return (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
                <button onClick={() => setOpneTask(o)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.tittel}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: o.blokkert || forfalle ? 'var(--danger)' : 'var(--text-muted)', marginTop: 1 }}>
                    {o.blokkert ? 'Står fast – ventar på hjelp' : forfalle ? `Forseinka · frist ${fristTekst(o.frist, t).toLowerCase()}` : 'Frist i dag'}
                    {o.sjekkliste.length > 0 && ` · ☑ ${o.sjekkliste.filter((s) => s.ferdig).length}/${o.sjekkliste.length}`}
                  </div>
                </button>
                {!o.blokkert && (
                  <button onClick={() => completeTask(o)} style={{ padding: '7px 12px', background: 'var(--brand-strong)', color: 'var(--on-brand)', border: 'none', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>✓ Fullfør</button>
                )}
              </div>
            );
          })}
          {dagensOppgaver.length > 6 && (
            <button onClick={() => setView('oppgaver')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>+ {dagensOppgaver.length - 6} til</button>
          )}
          {ledigeIDag.slice(0, 2).map((o) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r)', border: '1px dashed var(--border)' }}>
              <button onClick={() => setOpneTask(o)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.tittel}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>Ledig · {fristTekst(o.frist, t).toLowerCase()}</div>
              </button>
              {user && (
                <button onClick={() => moveTask(o.id, user.id)} style={{ padding: '7px 12px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>Ta ansvar</button>
              )}
            </div>
          ))}
        </div>
      </div>

      </div>

      {leiarVisning && varsler.length > 0 && (
        <div style={cardStyle}>
          <div style={labelStyle}>Treng handling</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8 }}>
            {varsler.map((v) => <VarselRad key={v.key} v={v} onClick={() => setView(v.view)} />)}
          </div>
        </div>
      )}

      {/* nøkkeltal – samla i eitt panel */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)' }}>
          {nokkeltal.map((k, i) => {
            const nyRad = isMobile ? i >= 2 : false;
            const forsteIKol = isMobile ? i % 2 === 0 : i === 0;
            return (
              <div key={k.lab} style={{ padding: '13px 18px', borderLeft: forsteIKol ? 'none' : '1px solid var(--divider)', borderTop: nyRad ? '1px solid var(--divider)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Geist Mono Variable'", color: 'var(--brand-strong)', letterSpacing: '-0.5px' }}>{k.verdi}</div>
                  {k.trend !== null && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: k.trend >= 0 ? '#2f9e6f' : 'var(--danger)', background: k.trend >= 0 ? 'rgba(47,158,111,0.12)' : 'rgba(192,57,43,0.10)' }}>
                      {k.trend >= 0 ? '↑' : '↓'} {Math.abs(k.trend)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{k.lab}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, alignItems: 'start' }}>
        {/* Kolonne 1: meldingar, varsel, kommande vakter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {mineMeldinger.length > 0 && (
            <div style={cardStyle}>
              <div style={labelStyle}>Meldingar frå leiinga</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mineMeldinger.map((m) => (
                  <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
                    <div style={{ fontSize: 13 }}>{m.tekst}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!leiarVisning && varsler.length > 0 && (
            <div style={cardStyle}>
              <div style={labelStyle}>Varslingssenter</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {varsler.map((v) => <VarselRad key={v.key} v={v} onClick={() => setView(v.view)} />)}
              </div>
            </div>
          )}

          <div style={cardStyle}>
            <div style={labelStyle}>Kommande vakter</div>
            {kommendeVakter.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen planlagte vakter denne veka.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {kommendeVakter.map((g) => {
                const erIDag = g.dato === t;
                return (
                  <div key={g.dato} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <div style={{ flex: 'none', width: 44, textAlign: 'center', padding: '5px 0', borderRadius: 'var(--r)', background: erIDag ? 'var(--brand-soft)' : 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: erIDag ? 'var(--brand-strong)' : 'var(--text-label)' }}>{UKE_KORT[weekdayIdx(g.dato)]}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-sans)', color: erIDag ? 'var(--brand-strong)' : 'var(--text)', lineHeight: 1.1 }}>{parseDate(g.dato).getDate()}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 1, minWidth: 0 }}>
                      {g.vakter.map((s) => {
                        const a = findAnsatt(s.ansatt);
                        return (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.farge, flex: 'none' }} />
                            <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.navn}</span>
                            <span style={{ marginLeft: 'auto', fontFamily: "'Geist Mono Variable'", fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', flex: 'none' }}>{s.start}–{s.slutt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kolonne 2: timar per dag + denne veka */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>Timar per dag</div>
              <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)', fontFamily: "'Geist Mono Variable'" }}>{fmt(sumFort)} t</strong>{sumPlan > 0 && <> av {fmt(sumPlan)} t planlagt</>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {timarPerDag.map(({ d, t: tt, plan }) => {
                const erIdag = d === t;
                const ferdig = d <= t;
                // Grøn = stemmer med vaktplanen, gul = færre, raud = fleire timar enn planlagt.
                const farge = !ferdig || (tt === 0 && plan === 0) ? 'var(--brand-soft)'
                  : Math.abs(tt - plan) < 0.25 ? 'var(--stock-green)'
                  : tt < plan ? '#e0a526' : 'var(--danger)';
                return (
                  <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 5, height: '100%' }} title={`${fmt(tt)} t ført${plan > 0 ? `, ${fmt(plan)} t planlagt` : ''}`}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "'Geist Mono Variable'", color: tt > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{tt > 0 ? `${fmt(tt)} t` : '–'}</span>
                    <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${Math.max(3, (tt / maxDag) * 100)}%`, borderRadius: 'var(--r-sm)', background: farge }} />
                      {plan > 0 && <div title={`${fmt(plan)} t planlagt`} style={{ position: 'absolute', left: -2, right: -2, bottom: `${(plan / maxDag) * 100}%`, borderTop: '2px dashed var(--text-muted)' }} />}
                    </div>
                    <span style={{ fontSize: 11, color: erIdag ? 'var(--brand-strong)' : 'var(--text-muted)', fontWeight: erIdag ? 900 : 700 }}>{UKE_KORT[weekdayIdx(d)]}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--stock-green)' }} /> Som planlagt</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#e0a526' }} /> Under</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--danger)' }} /> Over</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, borderTop: '2px dashed var(--text-muted)' }} /> Plan</span>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Denne veka</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {timarPerAnsatt.map(({ a, t: tt }) => (
                <div key={a.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{a.navn}</span>
                    <span style={{ fontFamily: "'Geist Mono Variable'", color: 'var(--text-muted)' }}>{fmt(tt)} t</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 'var(--r-sm)', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(tt / maxTimar) * 100}%`, background: a.farge, borderRadius: 'var(--r-sm)' }} />
                  </div>
                </div>
              ))}
              {dagDef && (apnTid || stengTid) && (
                <div style={{ display: 'flex', gap: 14, marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>
                  {apnTid && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="open" size={14} /> {apnTid}</span>}
                  {stengTid && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="close" size={14} /> {stengTid}</span>}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Kolonne 3: ansatte + ferie */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Tilsette</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ansatte.map((a) => {
                // «På jobb no» ut frå klokka, ikkje berre om dei har vakt i dag.
                const minNo = now.getHours() * 60 + now.getMinutes();
                const tilMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
                const dagensVakter = shifts.filter((s) => s.date === t && s.ansatt === a.id);
                const paJobb = dagensVakter.some((s) => tilMin(s.start) <= minNo && minNo < tilMin(s.slutt));
                const seinare = dagensVakter.filter((s) => tilMin(s.start) > minNo).sort((x, y) => (x.start < y.start ? -1 : 1))[0];
                const harFerie = ferie.some((f) => f.ansatt === a.id && f.fra && f.fra <= t && (!f.til || f.til >= t));
                const st = paJobb ? { tekst: 'På jobb no', farge: 'var(--stock-green)', fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)', fylt: true }
                  : seinare ? { tekst: `Neste vakt ${seinare.start}`, farge: '#2f7fd8', fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)', fylt: true }
                  : harFerie ? { tekst: 'Ferie / fri', farge: 'var(--accent)', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)', fylt: true }
                  : dagensVakter.length ? { tekst: 'Ferdig for i dag', farge: 'var(--text-faint)', fg: 'var(--text-secondary)', bg: 'var(--surface-alt)', fylt: false }
                  : { tekst: 'Fri', farge: 'var(--text-faint)', fg: 'var(--text-secondary)', bg: 'var(--surface-alt)', fylt: false };
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar init={a.init} farge={a.farge} size={26} fontSize={10} />
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{a.navn}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '3px 10px 3px 8px', borderRadius: 999, color: st.fg, background: st.bg, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: st.fylt ? st.farge : 'transparent', border: st.fylt ? 'none' : `1.5px solid ${st.farge}` }} />
                      {st.tekst}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderRadius: 'var(--r)', padding: '14px 16px', background: 'var(--hero-grad)', color: 'var(--hero-fg)', boxShadow: '0 10px 30px rgba(12,90,105,0.28)' }}>
            <div style={{ ...labelStyle, color: 'var(--hero-sub)' }}>Ferie &amp; fri på trappene</div>
            {dashFerie.length === 0 && <div style={{ fontSize: 13, color: 'var(--hero-sub)' }}>Ingen registrert.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {dashFerie.map((f) => {
                const a = findAnsatt(f.ansatt);
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar init={a.init} farge={a.farge} size={26} fontSize={10} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.navn}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--hero-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fra ? datoIntervall(f.fra, f.til) : (f.tekst || '—')}</div>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0c5a69', background: '#d5eef2', padding: '3px 8px', borderRadius: 'var(--r)', textTransform: 'uppercase' }}>{f.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <HurtigKnapp handlingar={hurtighandlinger} onVel={setQuickAction} isMobile={isMobile} />

      {quickAction === 'timer' && user && (
        <TimeEntryModal target={{ ansatt: user.id, date: t }} onClose={() => setQuickAction(null)} />
      )}
      {quickAction === 'vakt' && <ShiftModal target={{ date: t }} onClose={() => setQuickAction(null)} />}
      {quickAction === 'oppgave' && <TaskModal onClose={() => setQuickAction(null)} />}
      {opneTask && <TaskModal existing={opneTask} onClose={() => setOpneTask(null)} />}
      {quickAction === 'bestilling' && <OrderModal onClose={() => setQuickAction(null)} />}
    </div>
  );
}

type Niva = 'hog' | 'middels' | 'info';
interface Varsel { key: string; tekst: string; view: View; niva: Niva; alder?: string }
const NIVA_RANG: Record<Niva, number> = { hog: 0, middels: 1, info: 2 };
const NIVA_STIL: Record<Niva, { ikon: string; fg: string; bg: string }> = {
  hog: { ikon: 'alert', fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' },
  middels: { ikon: 'bell', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' },
  info: { ikon: 'bell', fg: 'var(--brand)', bg: 'var(--brand-soft)' },
};

/** «Akkurat no», «For 2 timar sidan», «I går», «For 3 dagar sidan». */
function alderTekst(iso: string, no: Date) {
  const min = Math.round((no.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 2) return 'Akkurat no';
  if (min < 60) return `For ${min} min sidan`;
  const timar = Math.round(min / 60);
  if (timar < 24) return `For ${timar} ${timar === 1 ? 'time' : 'timar'} sidan`;
  const dagar = Math.round(timar / 24);
  return dagar === 1 ? 'I går' : `For ${dagar} dagar sidan`;
}

function VarselRad({ v, onClick }: { v: Varsel; onClick: () => void }) {
  const st = NIVA_STIL[v.niva];
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)', width: '100%' }}
    >
      <span style={{ width: 30, height: 30, borderRadius: 'var(--r)', background: st.bg, color: st.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={st.ikon} size={16} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{v.tekst}</span>
        {v.alder && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{v.alder}</span>}
      </span>
      <span style={{ color: 'var(--text-faint)', fontWeight: 900 }}>‹</span>
    </button>
  );
}
