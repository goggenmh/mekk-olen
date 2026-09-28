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

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-card)' } as const;
const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 } as const;
const DAG_KEYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lau'];
const PRI_RANG: Record<string, number> = { høg: 0, medium: 1, låg: 2 };

export function Dashboard({ setView }: { setView: (v: View) => void }) {
  const { entries, shifts, swaps, tasks, orders, ferie, meldinger, canApprove } = useAppData();
  const { user } = useAuth();
  const kanLageVakt = canApprove(user?.id);
  const { ansatte, findAnsatt } = useAnsatte();
  const isMobile = useIsMobile();
  const [quickAction, setQuickAction] = useState<'timer' | 'vakt' | 'oppgave' | 'bestilling' | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
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
  const ufordelteOppgaver = tasks.filter((x) => x.ansatt === 'ufordelt').length;
  const ankomneBestillingar = orders.filter((o) => o.status === 'komen' && !o.varsla);

  const varsler: { key: string; tekst: string; view: View }[] = [
    ...pendingSwaps.map((s) => ({ key: `swap-${s.id}`, tekst: `${findAnsatt(s.fra).navn} ønsker å bytte vakt ${s.dag}`, view: 'vaktplan' as View })),
    ...(ventandeTimar > 0 ? [{ key: 'timar', tekst: `${ventandeTimar} timelister manglar godkjenning`, view: 'timeliste' as View }] : []),
    ...ankomneBestillingar.map((o) => ({ key: `order-${o.id}`, tekst: `Bestilling til ${o.kunde} har kome`, view: 'bestilling' as View })),
    ...(ufordelteOppgaver > 0 ? [{ key: 'oppgaver', tekst: `${ufordelteOppgaver} ufordelte oppgåver`, view: 'oppgaver' as View }] : []),
  ].slice(0, 6);

  // ---- nøkkeltal (topp) ----
  const totalTimarUke = entries.filter((e) => weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
  const timarForrigeUke = entries.filter((e) => forrigeVeke.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
  const timarTrend = timarForrigeUke > 0 ? Math.round(((totalTimarUke - timarForrigeUke) / timarForrigeUke) * 100) : null;
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
    .filter((s) => s.ansatt === user?.id && s.date >= t)
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
  const timarPerDag = weekDays.map((d) => ({ d, t: entries.filter((e) => e.date === d).reduce((acc, e) => acc + timar(e), 0) }));
  const maxDag = Math.max(1, ...timarPerDag.map((x) => x.t));

  // ---- opne oppgåver (liste) ----
  const opneListe = tasks
    .filter((x) => !x.ferdig)
    .slice()
    .sort((a, b) => {
      const ao = a.frist && a.frist < t ? 0 : 1;
      const bo = b.frist && b.frist < t ? 0 : 1;
      if (ao !== bo) return ao - bo;
      if (a.frist && b.frist && a.frist !== b.frist) return a.frist < b.frist ? -1 : 1;
      if (!!a.frist !== !!b.frist) return a.frist ? -1 : 1;
      return (PRI_RANG[a.prioritet] ?? 1) - (PRI_RANG[b.prioritet] ?? 1);
    })
    .slice(0, 6);

  // ---- i dag: opne/steng ----
  const wi = weekdayIdx(t);
  const dagDef = DAGER_VAKTPLAN.find((d) => d.key === DAG_KEYS[wi]);
  const [apnTid, stengTid] = (dagDef?.open || '').split('–');

  // ---- ansattstatus ----
  const jobbarIdagIds = shifts.filter((s) => s.date === t).map((s) => s.ansatt);
  // Pågåande og kommande ferie/fri først, avslutta blir droppa.
  const dashFerie = ferie
    .filter((f) => !f.til || f.til >= t)
    .slice()
    .sort((a, b) => (a.fra || '9999').localeCompare(b.fra || '9999'))
    .slice(0, 4);

  type Hurtig = { key: 'timer' | 'vakt' | 'oppgave' | 'bestilling'; ikon: string; tekst: string; primary: boolean };
  const hurtighandlinger: Hurtig[] = [
    { key: 'timer', ikon: 'ny-timer', tekst: 'Registrer timar', primary: true },
    // Berre leiar/delegert kan opprette vakter.
    ...(kanLageVakt ? [{ key: 'vakt' as const, ikon: 'ny-vakt', tekst: 'Ny vakt', primary: false }] : []),
    { key: 'oppgave', ikon: 'ny-oppgave', tekst: 'Ny oppgåve', primary: false },
    { key: 'bestilling', ikon: 'ny-bestilling', tekst: 'Ny bestilling', primary: false },
  ];

  return (
    <div style={{ padding: isMobile ? '16px 16px 28px' : '24px 28px 34px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: isMobile ? 24 : 30, letterSpacing: '-0.6px' }}>
            {helsing}, <span style={{ background: 'linear-gradient(120deg, var(--brand), var(--brand-strong))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fornamn}</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>{fullDatoTekst(t)}</div>
        </div>
        {!isMobile && (
          <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
            <div style={{ fontFamily: "'Geist Mono'", fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>{klokke}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>Veke {isoWeek(t)}</div>
          </div>
        )}
      </div>

      {/* hurtighandlingar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {hurtighandlinger.map((h) => (
          <button
            key={h.key}
            className="hoverable"
            onClick={() => setQuickAction(h.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ width: 42, height: 42, borderRadius: 13, background: h.primary ? 'var(--accent-soft)' : 'var(--brand-soft)', color: h.primary ? 'var(--accent)' : 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={h.ikon} size={21} /></span>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{h.tekst}</span>
          </button>
        ))}
      </div>

      {/* nøkkeltal – samla i eitt panel */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)' }}>
          {nokkeltal.map((k, i) => {
            const nyRad = isMobile ? i >= 2 : false;
            const forsteIKol = isMobile ? i % 2 === 0 : i === 0;
            return (
              <div key={k.lab} style={{ padding: '16px 20px', borderLeft: forsteIKol ? 'none' : '1px solid var(--divider)', borderTop: nyRad ? '1px solid var(--divider)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Geist Mono'", color: 'var(--brand-strong)', letterSpacing: '-0.5px' }}>{k.verdi}</div>
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

      {/* Neste vakt + timar per dag */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 18 }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: isMobile ? '18px 20px' : '22px 24px', background: 'var(--hero-grad)', color: 'var(--hero-fg)', boxShadow: '0 12px 32px rgba(12, 90, 105, 0.28)' }}>
          <span style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 68%)', pointerEvents: 'none' }} />
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.16)', padding: '5px 11px', borderRadius: 20 }}>
            Neste vakt {nesteVakt ? (nesteVakt.date === t ? '· I dag' : `· ${datoKort(nesteVakt.date)}`) : ''}
          </span>
          {nesteVakt ? (
            <>
              <div style={{ fontFamily: "'Geist Mono'", fontSize: isMobile ? 32 : 40, fontWeight: 600, letterSpacing: '-1px', margin: '12px 0 2px' }}>{nesteVakt.start} – {nesteVakt.slutt}</div>
              <div style={{ fontSize: 14, color: 'var(--hero-sub)', fontWeight: 500, textTransform: 'capitalize' }}>{nesteVakt.skift || 'Vakt'}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                {nesteKollegaer.length > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.14)', padding: '8px 12px', borderRadius: 11, fontSize: 13, fontWeight: 600 }}><Icon name="user" size={14} /> Saman med {nesteKollegaer.join(' & ')}</span>
                )}
                {startOm && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.14)', padding: '8px 12px', borderRadius: 11, fontSize: 13, fontWeight: 600 }}><Icon name="timeliste" size={14} /> {startOm}</span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 15, color: 'var(--hero-sub)', marginTop: 16, fontWeight: 500 }}>Ingen komande vakt planlagt denne veka.</div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Timar per dag</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 94 }}>
            {timarPerDag.map(({ d, t: tt }) => {
              const erIdag = d === t;
              return (
                <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 7, height: '100%' }} title={`${fmt(tt)} t`}>
                  <div style={{ width: '100%', height: `${Math.max(4, (tt / maxDag) * 100)}%`, borderRadius: '7px 7px 3px 3px', background: erIdag ? 'linear-gradient(var(--brand), var(--brand-strong))' : 'var(--brand-soft)', boxShadow: erIdag ? 'var(--glow-brand)' : 'none' }} />
                  <span style={{ fontSize: 11, color: erIdag ? 'var(--brand-strong)' : 'var(--text-muted)', fontWeight: 700 }}>{UKE_KORT[weekdayIdx(d)]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.7fr 1fr', gap: 15, alignItems: 'start' }}>
        {/* hovudkolonne */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, minWidth: 0 }}>
          {varsler.length > 0 && (
            <div style={cardStyle}>
              <div style={labelStyle}>Varslingssenter</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {varsler.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setView(v.view)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-alt)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    <span style={{ display: 'flex', color: 'var(--brand-strong)', flex: 'none' }}><Icon name="bell" size={16} /></span>
                    {v.tekst}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mineMeldinger.length > 0 && (
            <div style={cardStyle}>
              <div style={labelStyle}>Meldingar frå leiinga</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mineMeldinger.map((m) => (
                  <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 13, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13 }}>{m.tekst}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15, alignItems: 'start' }}>
            {/* Denne uka */}
            <div style={cardStyle}>
              <div style={labelStyle}>Denne uka</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {timarPerAnsatt.map(({ a, t: tt }) => (
                  <div key={a.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{a.navn}</span>
                      <span style={{ fontFamily: "'Geist Mono'", color: 'var(--text-muted)' }}>{fmt(tt)} t</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(tt / maxTimar) * 100}%`, background: a.farge, borderRadius: 6 }} />
                    </div>
                  </div>
                ))}
                {dagDef && (apnTid || stengTid) && (
                  <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    {apnTid && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="open" size={14} /> {apnTid}</span>}
                    {stengTid && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="close" size={14} /> {stengTid}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Kommande vakter */}
            <div style={cardStyle}>
              <div style={labelStyle}>Kommande vakter</div>
              {kommendeVakter.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen planlagte vakter denne veka.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {kommendeVakter.map((g) => {
                  const erIDag = g.dato === t;
                  return (
                    <div key={g.dato} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 'none', width: 46, textAlign: 'center', padding: '6px 0', borderRadius: 10, background: erIDag ? 'var(--brand-soft)' : 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: erIDag ? 'var(--brand-strong)' : 'var(--text-label)' }}>{UKE_KORT[weekdayIdx(g.dato)]}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Geist'", color: erIDag ? 'var(--brand-strong)' : 'var(--text)', lineHeight: 1.1 }}>{parseDate(g.dato).getDate()}</div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 1 }}>
                        {g.vakter.map((s) => {
                          const a = findAnsatt(s.ansatt);
                          return (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.farge, flex: 'none' }} />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.navn}</span>
                              <span style={{ marginLeft: 'auto', fontFamily: "'Geist Mono'", fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>{s.start}–{s.slutt}</span>
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

          {/* Oppgåver */}
          <div style={cardStyle}>
            <div style={labelStyle}>Oppgåver</div>
            {opneListe.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen opne oppgåver.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {opneListe.map((o) => {
                const forfalle = !!o.frist && o.frist < t;
                return (
                  <button
                    key={o.id}
                    onClick={() => setView('oppgaver')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0 }}
                  >
                    <span style={{ display: 'flex', color: forfalle ? 'var(--danger)' : 'var(--text-faint)', flex: 'none' }}>
                      <Icon name={forfalle ? 'alert' : 'oppgaver'} size={16} />
                    </span>
                    <span style={{ flex: 1, fontSize: 13 }}>{o.tittel}</span>
                    {o.frist && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 9, color: forfalle ? '#fff' : 'var(--text-muted)', background: forfalle ? 'var(--danger)' : 'var(--surface-alt)' }}>
                        {forfalle ? 'Forfalt' : datoKort(o.frist)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, minWidth: 0 }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Ansatte</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ansatte.map((a) => {
                const paJobb = jobbarIdagIds.includes(a.id);
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: paJobb ? 'var(--brand)' : 'var(--border)' }} />
                    <Avatar init={a.init} farge={a.farge} size={28} fontSize={10.5} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{a.navn}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{paJobb ? 'På jobb' : 'Fri'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderRadius: 16, padding: '16px 18px', background: 'var(--hero-grad)', color: 'var(--hero-fg)', boxShadow: '0 10px 30px rgba(12,90,105,0.28)' }}>
            <div style={{ ...labelStyle, color: 'var(--hero-sub)' }}>Ferie &amp; fri på trappene</div>
            {dashFerie.length === 0 && <div style={{ fontSize: 13, color: 'var(--hero-sub)' }}>Ingen registrert.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dashFerie.map((f) => {
                const a = findAnsatt(f.ansatt);
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar init={a.init} farge={a.farge} size={28} fontSize={10.5} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.navn}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--hero-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fra ? datoIntervall(f.fra, f.til) : (f.tekst || '—')}</div>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0c5a69', background: '#d5eef2', padding: '3px 8px', borderRadius: 9, textTransform: 'uppercase' }}>{f.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {quickAction === 'timer' && user && (
        <TimeEntryModal target={{ ansatt: user.id, date: t }} onClose={() => setQuickAction(null)} />
      )}
      {quickAction === 'vakt' && <ShiftModal target={{ date: t }} onClose={() => setQuickAction(null)} />}
      {quickAction === 'oppgave' && <TaskModal onClose={() => setQuickAction(null)} />}
      {quickAction === 'bestilling' && <OrderModal onClose={() => setQuickAction(null)} />}
    </div>
  );
}
