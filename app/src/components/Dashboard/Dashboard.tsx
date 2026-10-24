import { useEffect, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { weekDates, mondayOf, today, fullDatoTekst, fmt, timar, datoKort, isoWeek } from '../../lib/dates';
import { useIsMobile } from '../../lib/useIsMobile';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { TaskModal } from '../Oppgaver/TaskModal';
import type { View } from '../../lib/view';
import { alder } from '../../lib/bestilling';
import { tal } from '../../lib/tekst';
import { ustadfesta } from '../../lib/dokument';
import { ventandeFerie } from '../../lib/ferie';
import { erForseinka, fristTekst, ledigeOppgaver, mineIDag } from '../../lib/oppgave';
import type { Task } from '../../types';

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' } as const;
const labelStyle = { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 10 } as const;

export function Dashboard({ setView }: { setView: (v: View) => void }) {
  const { entries, shifts, swaps, tasks, orders, ferie: alleFerie, docs, stadfestingar, canApprove, completeTask, moveTask, utleige } = useAppData();
  const [opneTask, setOpneTask] = useState<Task | null>(null);
  const ferie = alleFerie.filter((f) => f.status === 'godkjend');
  const { user } = useAuth();
  const kanLageVakt = canApprove(user?.id);
  const { ansatte, findAnsatt } = useAnsatte();
  const isMobile = useIsMobile();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow((prev) => {
      const d = new Date();
      return d.getMinutes() === prev.getMinutes() && d.getHours() === prev.getHours() ? prev : d;
    }), 1000);
    return () => clearInterval(id);
  }, []);
  const klokke = now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });

  const t = today();
  const weekDays = weekDates(mondayOf(t));

  // ---- varslingssenter ----
  const pendingSwaps = swaps.filter((s) => s.status === 'pending');
  const ventandeTimar = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
  const ufordelteOppgaver = ledigeOppgaver(tasks).length;
  const utleigeNye = utleige.filter((r) => r.status === 'ny').length;
  const utleigeSeine = utleige.filter((r) => r.status === 'forseinka' || (r.status === 'utleigd' && new Date(r.slutt).getTime() < now.getTime())).length;
  const blokkerteOppgaver = kanLageVakt ? tasks.filter((x) => !x.ferdig && x.blokkert).length : 0;
  const ankomneBestillingar = orders.filter((o) => o.status === 'komen' && !o.varsla);
  const gamleBestillingar = orders.filter((o) => alder(o, t).gammal).length;
  const forseinka = tasks.filter((x) => !x.ferdig && x.frist && x.frist < t && (kanLageVakt || x.ansatt === user?.id)).length;
  const ulesneHms = ustadfesta(docs, stadfestingar, user?.id);
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
    ...(utleigeSeine > 0 ? [{ key: 'utleige-seine', tekst: `${tal(utleigeSeine, 'utleigd maskin', 'utleigde maskiner')} skulle vore levert`, view: 'utleige' as View, niva: 'hog' as const }] : []),
    ...(utleigeNye > 0 ? [{ key: 'utleige-nye', tekst: tal(utleigeNye, 'ny utleigeførespurnad', 'nye utleigeførespurnader'), view: 'utleige' as View, niva: 'middels' as const }] : []),
    ...(ufordelteOppgaver > 0 ? [{ key: 'oppgaver', tekst: tal(ufordelteOppgaver, 'ufordelt oppgåve', 'ufordelte oppgåver'), view: 'oppgaver' as View, niva: 'info' as const }] : []),
  ];
  const varsler = varslerUsortert.slice().sort((a, b) => NIVA_RANG[a.niva] - NIVA_RANG[b.niva]).slice(0, 8);

  // ---- timar denne veka ----
  const totalTimarUke = entries.filter((e) => weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
  const timarPerAnsatt = ansatte.map((a) => ({
    a,
    t: entries.filter((e) => e.ansatt === a.id && weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0),
  })).sort((x, y) => y.t - x.t);
  const maxTimar = Math.max(1, ...timarPerAnsatt.map((x) => x.t));

  // ---- neste vakt for innlogga brukar ----
  const mineFramtidige = shifts
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
    if (diff > 0) startOm = diff >= 60 ? `startar om ${Math.floor(diff / 60)} t ${diff % 60} min` : `startar om ${diff} min`;
    else startOm = 'på jobb no';
  }

  // ---- dagens oppgåver for den innlogga ----
  const dagensOppgaver = mineIDag(tasks, user?.id, t);
  const ledigeIDag = ledigeOppgaver(tasks).filter((x) => !x.frist || x.frist <= t);

  return (
    <div style={{ padding: isMobile ? '16px 16px 28px' : '22px 28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 17, fontWeight: 700, textTransform: 'capitalize' }}>{fullDatoTekst(t)}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span style={{ fontFamily: "'Geist Mono Variable'" }}>{klokke}</span> · veke {isoWeek(t)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(330px, 1fr))', gap: 14, alignItems: 'start' }}>
        {/* Neste vakt */}
        <div style={cardStyle}>
          <div style={labelStyle}>Neste vakt</div>
          {nesteVakt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Geist Mono Variable'", fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>{nesteVakt.start}–{nesteVakt.slutt}</span>
                <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 600 }}>{nesteVakt.date === t ? 'i dag' : datoKort(nesteVakt.date)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {nesteVakt.skift ? `${nesteVakt.skift}` : 'Vakt'}
                {startOm && ` · ${startOm}`}
                {nesteKollegaer.length > 0 && ` · saman med ${nesteKollegaer.join(', ')}`}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Ingen komande vakt denne veka.</div>
          )}
        </div>

        {/* Varslingssenter */}
        <div style={cardStyle}>
          <div style={labelStyle}>Varslingssenter</div>
          {varsler.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Ingenting treng handling akkurat no.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {varsler.map((v) => <VarselRad key={v.key} v={v} onClick={() => setView(v.view)} />)}
            </div>
          )}
        </div>

        {/* Oppgåver */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>Dine oppgåver i dag</div>
            <button onClick={() => setView('oppgaver')} style={lenkeKnapp}>Alle ‹</button>
          </div>
          {dagensOppgaver.length === 0 && ledigeIDag.length === 0 && (
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Ingen oppgåver med frist i dag.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {dagensOppgaver.slice(0, 6).map((o) => {
              const forfalle = erForseinka(o, t);
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                  <button onClick={() => setOpneTask(o)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text)' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.tittel}</div>
                    <div style={{ fontSize: 11.5, color: o.blokkert || forfalle ? 'var(--danger)' : 'var(--text-muted)', marginTop: 1 }}>
                      {o.blokkert ? 'Står fast – ventar på hjelp' : forfalle ? `Forseinka · frist ${fristTekst(o.frist, t).toLowerCase()}` : 'Frist i dag'}
                      {o.sjekkliste.length > 0 && ` · sjekkliste ${o.sjekkliste.filter((s) => s.ferdig).length}/${o.sjekkliste.length}`}
                    </div>
                  </button>
                  {!o.blokkert && (
                    <button onClick={() => completeTask(o)} style={{ padding: '6px 11px', background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>Fullfør</button>
                  )}
                </div>
              );
            })}
            {dagensOppgaver.length > 6 && (
              <button onClick={() => setView('oppgaver')} style={{ ...lenkeKnapp, color: 'var(--text-muted)', textAlign: 'left' }}>+ {dagensOppgaver.length - 6} til</button>
            )}
            {ledigeIDag.slice(0, 2).map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r)', border: '1px dashed var(--border)' }}>
                <button onClick={() => setOpneTask(o)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.tittel}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>Ledig · {fristTekst(o.frist, t).toLowerCase()}</div>
                </button>
                {user && (
                  <button onClick={() => moveTask(o.id, user.id)} style={{ padding: '6px 11px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>Ta ansvar</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timer denne veka */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>Timar denne veka</div>
            <span style={{ marginLeft: 'auto', fontFamily: "'Geist Mono Variable'", fontSize: 13.5, fontWeight: 700 }}>{fmt(totalTimarUke)} t</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {timarPerAnsatt.map(({ a, t: tt }) => (
              <div key={a.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{a.navn}</span>
                  <span style={{ fontFamily: "'Geist Mono Variable'", color: 'var(--text-muted)' }}>{fmt(tt)} t</span>
                </div>
                <div style={{ height: 6, borderRadius: 'var(--r-sm)', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(tt / maxTimar) * 100}%`, background: a.farge, borderRadius: 'var(--r-sm)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tilsette */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>Tilsette</div>
            {kanLageVakt && <button onClick={() => setView('ansatte')} style={lenkeKnapp}>Alle ‹</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {ansatte.map((a) => {
              const minNo = now.getHours() * 60 + now.getMinutes();
              const tilMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
              const dagensVakter = shifts.filter((s) => s.date === t && s.ansatt === a.id);
              const paJobb = dagensVakter.some((s) => tilMin(s.start) <= minNo && minNo < tilMin(s.slutt));
              const seinare = dagensVakter.filter((s) => tilMin(s.start) > minNo).sort((x, y) => (x.start < y.start ? -1 : 1))[0];
              const harFerie = ferie.some((f) => f.ansatt === a.id && f.fra && f.fra <= t && (!f.til || f.til >= t));
              const st = paJobb ? { tekst: 'På jobb no', fg: 'var(--pill-gronn-fg)', bg: 'var(--pill-gronn-bg)' }
                : seinare ? { tekst: `Vakt ${seinare.start}`, fg: 'var(--pill-teal-fg)', bg: 'var(--pill-teal-bg)' }
                : harFerie ? { tekst: 'Ferie / fri', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' }
                : dagensVakter.length ? { tekst: 'Ferdig for i dag', fg: 'var(--text-secondary)', bg: 'var(--surface-alt)' }
                : { tekst: 'Fri', fg: 'var(--text-secondary)', bg: 'var(--surface-alt)' };
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar init={a.init} farge={a.farge} size={26} fontSize={10} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{a.navn}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r)', color: st.fg, background: st.bg, whiteSpace: 'nowrap' }}>{st.tekst}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {opneTask && <TaskModal existing={opneTask} onClose={() => setOpneTask(null)} />}
    </div>
  );
}

const lenkeKnapp = { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--brand)', padding: 0 } as const;

type Niva = 'hog' | 'middels' | 'info';
interface Varsel { key: string; tekst: string; view: View; niva: Niva; alder?: string }
const NIVA_RANG: Record<Niva, number> = { hog: 0, middels: 1, info: 2 };
const NIVA_STIL: Record<Niva, { ikon: string; fg: string; bg: string }> = {
  hog: { ikon: 'alert', fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' },
  middels: { ikon: 'bell', fg: 'var(--pill-amber-fg)', bg: 'var(--pill-amber-bg)' },
  info: { ikon: 'bell', fg: 'var(--brand)', bg: 'var(--brand-soft)' },
};

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
      style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)', width: '100%' }}
    >
      <span style={{ width: 26, height: 26, borderRadius: 'var(--r)', background: st.bg, color: st.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={st.ikon} size={15} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{v.tekst}</span>
        {v.alder && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{v.alder}</span>}
      </span>
      <span style={{ color: 'var(--text-faint)', fontWeight: 800 }}>‹</span>
    </button>
  );
}
