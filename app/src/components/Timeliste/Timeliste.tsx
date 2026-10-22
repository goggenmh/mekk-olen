import { useMemo, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import {
  weekDates, mondayOf, today, isoWeek, addDays, shiftMonth, MND,
  fmt, fmtKr, timar, UKE_KORT, parseDate, weekdayIdx,
} from '../../lib/dates';
import { TimeEntryModal } from './TimeEntryModal';
import { useIsMobile } from '../../lib/useIsMobile';
import { useFeriepengar, useLonTekst, useLonsTilgang, useLonsTrekk } from '../../lib/lon';
import { erLeiar } from '../../lib/view';
import { lastNedLonsfil } from '../../lib/lonsfil';
import { lastNedTimelistePdf } from '../../lib/timelistePdf';
import { toast } from '../../lib/toast';
import type { TimeEntry } from '../../types';
import { tekstPaFarge } from '../../lib/farge';
import { PeriodeVeljar } from '../ui/PeriodeVeljar';

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = '﻿' + rows.map((r) => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** startDato: opne på veka/månaden til denne datoen (t.d. frå eit push-varsel). */
export function Timeliste({ startDato }: { startDato?: string | null } = {}) {
  const { entries, approveEmployeeEntries, canApprove } = useAppData();
  const { ansatte, finnButikk } = useAnsatte();
  const { user } = useAuth();
  const [lagarLonsfil, setLagarLonsfil] = useState(false);
  const [lagarPdf, setLagarPdf] = useState(false);
  const lonsTilgang = useLonsTilgang();
  const isMobile = useIsMobile();
  const maaGodkjenne = canApprove(user?.id);
  const [mode, setMode] = useState<'uke' | 'manad'>('uke');
  const [weekStart, setWeekStart] = useState(mondayOf(startDato ?? today()));
  const [monthAnchor, setMonthAnchor] = useState((startDato ?? today()).slice(0, 7));
  const [editTarget, setEditTarget] = useState<{ ansatt: TimeEntry['ansatt']; date: string } | null>(null);

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const prevDates = useMemo(() => weekDates(addDays(weekStart, -7)), [weekStart]);

  const prevPeriod = () => (mode === 'uke' ? setWeekStart(addDays(weekStart, -7)) : setMonthAnchor(shiftMonth(monthAnchor, -1)));
  const nextPeriod = () => (mode === 'uke' ? setWeekStart(addDays(weekStart, 7)) : setMonthAnchor(shiftMonth(monthAnchor, 1)));
  const goToday = () => { setWeekStart(mondayOf(today())); setMonthAnchor(today().slice(0, 7)); };

  const periodTittel = mode === 'uke'
    ? `Veke ${isoWeek(weekStart)}`
    : `${MND[Number(monthAnchor.split('-')[1]) - 1].charAt(0).toUpperCase()}${MND[Number(monthAnchor.split('-')[1]) - 1].slice(1)} ${monthAnchor.split('-')[0]}`;
  const periodUnder = mode === 'uke'
    ? (() => {
        const d0 = parseDate(dates[0]);
        const d1 = parseDate(dates[dates.length - 1]);
        return `${d0.getDate()}.–${d1.getDate()}. ${MND[d1.getMonth()]} ${d1.getFullYear()}`;
      })()
    : '';

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Tilsett', 'Dato', 'Start', 'Slutt', 'Pause(min)', 'Timar', 'Status']];
    dates.forEach((dt) => ansatte.forEach((a) => {
      entries
        .filter((x) => x.ansatt === a.id && x.date === dt)
        .sort((x, y) => (x.start < y.start ? -1 : 1))
        .forEach((e) => rows.push([a.navn, dt, e.start, e.slutt, e.pause, fmt(timar(e)), e.status]));
    }));
    downloadCsv(`mekk-olen-timeliste-veke${isoWeek(weekStart)}.csv`, rows);
  };

  const exportPdf = async () => {
    setLagarPdf(true);
    try {
      // Månadsvisning: alle dagar i månaden. Vekevisning: dagane som er viste.
      const [ar, mnd] = monthAnchor.split('-').map(Number);
      const datoar = mode === 'manad'
        ? Array.from({ length: new Date(ar, mnd, 0).getDate() }, (_, i) => `${monthAnchor}-${String(i + 1).padStart(2, '0')}`)
        : dates;
      // Den som kan godkjenne får alle; andre berre si eiga timeliste.
      const utval = maaGodkjenne ? ansatte : ansatte.filter((a) => a.id === user?.id);
      await lastNedTimelistePdf({
        // Med sats/skatt der den innlogga har lov å sjå løna.
        ansatte: utval.map((a) => lonsTilgang(a) ?? a),
        visLon: utval.filter((a) => lonsTilgang(a)).map((a) => a.id),
        entries, datoar,
        tittel: periodTittel, undertittel: periodUnder,
        butikk: finnButikk(user?.butikk_id)?.namn || 'MEKK Ølen',
        medLon: erLeiar(user) && mode === 'manad',
        maaned: mode === 'manad' ? monthAnchor : null,
      });
    } catch {
      toast('Kunne ikkje lage PDF – prøv igjen', 'feil');
    } finally {
      setLagarPdf(false);
    }
  };

  const ventandeVeke = entries.filter((e) => dates.includes(e.date) && e.status === 'venter').length;
  const godkjennAlle = async () => {
    if (!window.confirm(`Godkjenne alle ${ventandeVeke} timeføringane i veke ${isoWeek(weekStart)}? Sjekk avvika først.`)) return;
    for (const a of ansatte) await approveEmployeeEntries(a.id, dates);
  };

  const exportLonn = async () => {
    setLagarLonsfil(true);
    try {
      await lastNedLonsfil({
        ansatte, entries, maaned: monthAnchor,
        butikk: finnButikk(user?.butikk_id)?.namn || 'MEKK Ølen',
      });
    } catch {
      toast('Kunne ikkje lage lønsfila – prøv igjen', 'feil');
    } finally {
      setLagarLonsfil(false);
    }
  };

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div className="sidetittel">Timeliste</div>
        <div className="no-print" style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {(['uke', 'manad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === m ? 'var(--brand-strong)' : 'var(--surface)', color: mode === m ? 'var(--on-brand)' : 'var(--text-secondary)',
              }}
            >
              {m === 'uke' ? 'Veke' : 'Månad'}
            </button>
          ))}
        </div>
        <div className="no-print" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {erLeiar(user) && <button onClick={exportLonn} disabled={lagarLonsfil} title={`Lønsgrunnlag for ${MND[Number(monthAnchor.split('-')[1]) - 1]} som Excel-fil`} style={btnGhost}>{lagarLonsfil ? 'Lagar…' : 'Lønsfil (Excel)'}</button>}
          {maaGodkjenne && ventandeVeke > 0 && mode === 'uke' && (
            <button onClick={godkjennAlle} style={{ ...btnGhost, background: '#2f9e6f', color: '#fff', borderColor: '#2f9e6f' }}>Godkjenn alle ({ventandeVeke})</button>
          )}
          <button onClick={exportCsv} style={btnGhost}>CSV</button>
          <button onClick={exportPdf} disabled={lagarPdf} title="Timeliste som PDF" style={btnGhost}>{lagarPdf ? 'Lagar…' : 'PDF'}</button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={prevPeriod} style={navBtn} aria-label="Førre periode">‹</button>
        <PeriodeVeljar mode={mode} veke={weekStart} manad={monthAnchor} onVeke={setWeekStart} onManad={setMonthAnchor}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{periodTittel}</div>
          {periodUnder && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{periodUnder}</div>}
        </PeriodeVeljar>
        <button onClick={nextPeriod} style={navBtn} aria-label="Neste periode">›</button>
        <button onClick={goToday} style={{ ...btnGhost, marginLeft: 4 }}>I dag</button>
      </div>

      {mode === 'uke' ? (
        <>
          {isMobile ? (
            <WeekCards
              dates={dates}
              entries={entries}
              onCellClick={(ansatt, date) => setEditTarget({ ansatt, date })}
              maaGodkjenne={maaGodkjenne}
              onApprove={(ansatt) => approveEmployeeEntries(ansatt, dates)}
            />
          ) : (
            <>
              <WeekTable
                dates={dates}
                entries={entries}
                onCellClick={(ansatt, date) => setEditTarget({ ansatt, date })}
                maaGodkjenne={maaGodkjenne}
                onApprove={(ansatt) => approveEmployeeEntries(ansatt, dates)}
              />
              <WeekSummary dates={dates} prevDates={prevDates} entries={entries} />
            </>
          )}
        </>
      ) : (
        <MonthView
          monthAnchor={monthAnchor}
          entries={entries}
          onDayClick={(date) => { setWeekStart(mondayOf(date)); setMode('uke'); }}
        />
      )}

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={dot('#2f9e6f')} /> Godkjent</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={dot('#d8920f')} /> Ventar</span>
        <span><b style={{ color: 'var(--danger)' }}>Manglar</b> = vakt utan registrerte timar</span>
        <span>Normaltid 37,5 t/veke</span>
      </div>

      {editTarget && <TimeEntryModal target={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

const NORMALTID = 37.5;

function WeekSummary({ dates, prevDates, entries }: { dates: string[]; prevDates: string[]; entries: TimeEntry[] }) {
  const { ansatte } = useAnsatte();
  const lonTekst = useLonTekst();
  return (
    <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
      {ansatte.map((a) => {
        const sum = entries.filter((e) => e.ansatt === a.id && dates.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
        const prev = entries.filter((e) => e.ansatt === a.id && prevDates.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
        const pct = Math.round((sum / NORMALTID) * 100);
        const diff = Math.round((sum - prev) * 4) / 4;
        return (
          <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '15px 17px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.farge, flex: 'none' }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{a.navn}</span>
              {diff !== 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? '#2f9e6f' : 'var(--danger)' }}>
                  {diff > 0 ? '↑' : '↓'} {fmt(Math.abs(diff))} t
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Geist Mono Variable'", color: a.farge, letterSpacing: '-0.5px' }}>{fmt(sum)} t</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>{lonTekst(a, sum)}</div>
            </div>
            <div style={{ height: 9, borderRadius: 6, background: 'var(--surface-alt)', overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 100 ? '#2f9e6f' : a.farge, borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>{pct}% av normaltid ({fmt(NORMALTID)} t) · {diff === 0 ? 'som førre veke' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))} t frå førre veke`}</div>
          </div>
        );
      })}
    </div>
  );
}

function WeekTable({
  dates, entries, onCellClick, maaGodkjenne, onApprove,
}: {
  dates: string[];
  entries: TimeEntry[];
  onCellClick: (ansatt: TimeEntry['ansatt'], date: string) => void;
  maaGodkjenne: boolean;
  onApprove: (ansatt: TimeEntry['ansatt']) => void;
}) {
  const { ansatte } = useAnsatte();
  const { shifts } = useAppData();
  // Planlagde timar ut frå vaktplanen, så avvik mot registrert tid syner.
  const plan = (ansatt: string, d: string) => shifts
    .filter((s) => s.ansatt === ansatt && s.date === d)
    .reduce((sum, s) => { const [h1, m1] = s.start.split(':').map(Number); const [h2, m2] = s.slutt.split(':').map(Number); return sum + (h2 * 60 + m2 - h1 * 60 - m1) / 60; }, 0);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'auto', boxShadow: 'var(--shadow-card)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface-alt)' }}>
            <th style={{ ...th, textAlign: 'left', paddingLeft: 18 }}>Tilsett</th>
            {dates.map((d) => {
              const erIdag = d === today();
              return (
                <th key={d} style={{ ...th, textAlign: 'center', background: erIdag ? 'var(--brand-soft)' : undefined, color: erIdag ? 'var(--brand-strong)' : 'var(--text-label)' }}>{UKE_KORT[weekdayIdx(d)]} {parseDate(d).getDate()}</th>
              );
            })}
            <th style={{ ...th, textAlign: 'right' }}>Totalt</th>
            <th style={{ ...th, textAlign: 'center' }}>Status</th>
            {maaGodkjenne && <th style={th}></th>}
          </tr>
        </thead>
        <tbody>
          {ansatte.map((a) => {
            const dagBolkar = dates.map((d) => entries.filter((e) => e.ansatt === a.id && e.date === d));
            const sum = dagBolkar.reduce((acc, es) => acc + es.reduce((s2, e) => s2 + timar(e), 0), 0);
            const ventarN = dagBolkar.reduce((acc, es) => acc + es.filter((e) => e.status === 'venter').length, 0);
            const harTimar = dagBolkar.some((es) => es.length > 0);
            const status = !harTimar ? 'tom' : ventarN > 0 ? 'venter' : 'godkjent';
            return (
              <tr key={a.id} style={{ borderTop: '1px solid var(--divider)' }}>
                <td style={{ ...td, paddingLeft: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: a.farge, color: tekstPaFarge(a.farge), fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{a.init}</span>
                    <span style={{ fontWeight: 700 }}>{a.navn}</span>
                  </div>
                </td>
                {dates.map((d, i) => {
                  const es = dagBolkar[i];
                  const dagSum = es.reduce((s2, e) => s2 + timar(e), 0);
                  const dagVentar = es.some((e) => e.status === 'venter');
                  const erIdag = d === today();
                  const p = plan(a.id, d);
                  const manglar = es.length === 0 && p > 0 && d < today();
                  return (
                    <td key={d} title={p > 0 ? `Planlagt ${fmt(p)} t` : undefined} style={{ ...td, textAlign: 'center', cursor: 'pointer', background: erIdag ? 'var(--brand-soft)' : undefined }} onClick={() => onCellClick(a.id, d)}>
                      {es.length > 0 ? (
                        <div style={{ lineHeight: 1.15 }}>
                          <span style={{ fontFamily: "'Geist Mono Variable'", fontWeight: 600, color: dagVentar ? '#b7830b' : 'var(--text)' }}>{fmt(dagSum)}</span>
                          {es.length > 1 && <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--brand)' }}>{es.length} bolkar</div>}
                        </div>
                      ) : manglar ? (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--danger)' }}>Manglar</span>
                      ) : (
                        <span style={{ color: 'var(--text-faint2)' }}>–</span>
                      )}
                    </td>
                  );
                })}
                <td style={{ ...td, textAlign: 'right', fontFamily: "'Geist Mono Variable'", fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {fmt(sum)} t
                  {sum > 37.5 && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--danger)', marginLeft: 5 }}>+{fmt(sum - 37.5)}</span>}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {status === 'godkjent' && <span title="Alle timar godkjende" style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'rgba(47,158,111,0.15)', color: '#2f9e6f' }}>Godkjend</span>}
                  {status === 'venter' && <span title={`${ventarN} ventar godkjenning`} style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent)' }}>Ventar</span>}
                  {status === 'tom' && <span style={{ color: 'var(--text-faint2)' }}>–</span>}
                </td>
                {maaGodkjenne && (
                  <td style={{ ...td, textAlign: 'right' }}>
                    {ventarN > 0 && (
                      <button
                        onClick={() => onApprove(a.id)}
                        style={{ padding: '6px 11px', background: '#2f9e6f', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Godkjenn ({ventarN})
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WeekCards({
  dates, entries, onCellClick, maaGodkjenne, onApprove,
}: {
  dates: string[];
  entries: TimeEntry[];
  onCellClick: (ansatt: TimeEntry['ansatt'], date: string) => void;
  maaGodkjenne: boolean;
  onApprove: (ansatt: TimeEntry['ansatt']) => void;
}) {
  const { ansatte } = useAnsatte();
  const lonTekst = useLonTekst();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ansatte.map((a) => {
        const dagBolkar = dates.map((d) => entries.filter((e) => e.ansatt === a.id && e.date === d));
        const sum = dagBolkar.reduce((acc, es) => acc + es.reduce((s2, e) => s2 + timar(e), 0), 0);
        const ventarN = dagBolkar.reduce((acc, es) => acc + es.filter((e) => e.status === 'venter').length, 0);
        const harTimar = dagBolkar.some((es) => es.length > 0);
        const lonn = lonTekst(a, sum);
        return (
          <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 15px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.farge, flex: 'none' }} />
              <span style={{ fontSize: 14.5, fontWeight: 700, flex: 1 }}>{a.navn}</span>
              <span style={{ fontFamily: "'Geist Mono Variable'", fontWeight: 700, fontSize: 15 }}>{fmt(sum)} t</span>
              {harTimar && (
                <span style={{ fontSize: 15, fontWeight: 800, color: ventarN > 0 ? '#d8920f' : '#2f9e6f', width: 16, textAlign: 'center' }}>{ventarN > 0 ? '!' : '✓'}</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginTop: 12 }}>
              {dates.map((d, i) => {
                const es = dagBolkar[i];
                const dagSum = es.reduce((s2, e) => s2 + timar(e), 0);
                const dagVentar = es.some((e) => e.status === 'venter');
                return (
                  <button
                    key={d}
                    onClick={() => onCellClick(a.id, d)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 2px', cursor: 'pointer',
                      border: '1px solid var(--border)', borderRadius: 10,
                      background: es.length > 0 ? (dagVentar ? 'rgba(216,146,15,0.12)' : 'rgba(47,158,111,0.10)') : 'var(--surface-alt)',
                    }}
                  >
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>{UKE_KORT[weekdayIdx(d)]}</span>
                    <span style={{ fontFamily: "'Geist Mono Variable'", fontSize: 12.5, fontWeight: 600, color: es.length > 0 ? 'var(--text)' : 'var(--text-faint2)' }}>{es.length > 0 ? fmt(dagSum) : '–'}</span>
                    {es.length > 1 && <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--brand)' }}>×{es.length}</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{[lonn, sum > 37.5 ? `+${fmt(sum - 37.5)} t overtid` : ''].filter(Boolean).join(' · ')}</span>
              {maaGodkjenne && ventarN > 0 && (
                <button
                  onClick={() => onApprove(a.id)}
                  style={{ marginLeft: 'auto', padding: '7px 13px', background: '#2f9e6f', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  Godkjenn ({ventarN})
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  monthAnchor, entries, onDayClick,
}: {
  monthAnchor: string;
  entries: TimeEntry[];
  onDayClick: (date: string) => void;
}) {
  const { ansatte, findAnsatt } = useAnsatte();
  const lonTekst = useLonTekst();
  const mm = Number(monthAnchor.split('-')[1]);
  const firstOfMonth = `${monthAnchor}-01`;
  const gridStart = mondayOf(firstOfMonth);
  const weeks: string[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) { row.push(cursor); cursor = addDays(cursor, 1); }
    weeks.push(row);
  }

  const inMonth = (d: string) => Number(d.split('-')[1]) === mm;

  const lonsTrekk = useLonsTrekk();
  const feriepengarFor = useFeriepengar();
  const manadFra = `${monthAnchor}-01`;
  const manadTil = `${shiftMonth(monthAnchor, 1)}-01`;
  const manadKort = ansatte.map((a) => {
    const tot = entries.filter((e) => e.ansatt === a.id && e.date.slice(0, 7) === monthAnchor && e.status === 'godkjent').reduce((acc, e) => acc + timar(e), 0);
    const lonn = lonTekst(a, tot);
    const trekk = lonsTrekk(a, entries, manadFra, manadTil);
    const ferie = feriepengarFor(a, entries, manadFra, manadTil);
    return { a, tot, lonn, trekk, ferie };
  });

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--surface-alt)' }}>
          {UKE_KORT.map((d) => <div key={d} style={{ ...th, textAlign: 'center' }}>{d}</div>)}
        </div>
        {weeks.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: '1px solid var(--divider)' }}>
            {row.map((d, ci) => {
              const sunday = ci === 6;
              const dayEntries = entries.filter((e) => e.date === d);
              const bits = dayEntries.slice().sort((a, b) => (a.start < b.start ? -1 : 1)).map((e) => {
                const a = findAnsatt(e.ansatt);
                return { key: e.id, txt: `${a.init} ${fmt(timar(e))}`, farge: a.farge };
              });
              return (
                <div
                  key={d}
                  onClick={() => !sunday && onDayClick(d)}
                  style={{
                    minHeight: 78, padding: 7, borderRight: ci < 6 ? '1px solid var(--divider)' : 'none',
                    background: sunday ? 'var(--surface-soft)' : !inMonth(d) ? 'var(--surface-soft)' : 'var(--surface)',
                    cursor: sunday ? 'default' : 'pointer', opacity: inMonth(d) ? 1 : 0.45,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{parseDate(d).getDate()}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {bits.map((b) => (
                      <div key={b.key} style={{ fontSize: 10.5, fontWeight: 700, color: b.farge }}>{b.txt}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
        {manadKort.map(({ a, tot, lonn, trekk, ferie }) => (
          <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.navn}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Geist Mono Variable'", color: a.farge, marginTop: 4 }}>{fmt(tot)} t</div>
            {trekk && trekk !== 'fast' ? (
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 2, fontSize: 12.5 }}>
                <span style={{ color: 'var(--text-muted)' }}>Brutto</span>
                <span style={{ textAlign: 'right', fontFamily: "'Geist Mono Variable'" }}>{fmtKr(trekk.brutto)}</span>
                <span style={{ color: 'var(--text-muted)' }}>Forskotstrekk</span>
                <span style={{ textAlign: 'right', fontFamily: "'Geist Mono Variable'", color: trekk.trekk ? 'var(--danger)' : 'var(--text-muted)' }}>{trekk.trekk ? `−${fmtKr(trekk.trekk)}` : '–'}</span>
                <span style={{ fontWeight: 700 }}>Netto</span>
                <span style={{ textAlign: 'right', fontWeight: 700, fontFamily: "'Geist Mono Variable'" }}>{fmtKr(trekk.netto)}</span>
                <span style={{ gridColumn: '1 / -1', marginTop: 4, fontSize: 11.5, color: trekk.manglarKort ? 'var(--danger)' : 'var(--text-faint)', fontWeight: trekk.manglarKort ? 700 : 400 }}>{trekk.forklaring}</span>
                {ferie && (
                  <span style={{ gridColumn: '1 / -1', fontSize: 11.5, color: 'var(--text-faint)' }}>
                    Feriepengar {String(ferie.sats).replace('.', ',')} %: {fmtKr(ferie.periode)} · i år {fmtKr(ferie.iAar)}
                  </span>
                )}
              </div>
            ) : (
              lonn && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{lonn}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

const btnGhost: CSSProperties = { padding: '9px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' };
const navBtn: CSSProperties = { width: 32, height: 32, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 11, cursor: 'pointer', fontSize: 15, color: 'var(--text-secondary)' };
const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.3px' };
const td: CSSProperties = { padding: '10px 12px' };
const dot = (color: string): CSSProperties => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color });
