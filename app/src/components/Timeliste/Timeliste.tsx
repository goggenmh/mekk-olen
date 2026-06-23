import { useMemo, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import {
  weekDates, mondayOf, today, isoWeek, addDays, shiftMonth, MND,
  fmt, fmtKr, timar, UKE_KORT, parseDate, weekdayIdx,
} from '../../lib/dates';
import { TimeEntryModal } from './TimeEntryModal';
import type { TimeEntry } from '../../types';

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

export function Timeliste() {
  const { entries, approveEmployeeEntries, canApprove } = useAppData();
  const { ansatte } = useAnsatte();
  const { user } = useAuth();
  const maaGodkjenne = canApprove(user?.id);
  const [mode, setMode] = useState<'uke' | 'manad'>('uke');
  const [weekStart, setWeekStart] = useState(mondayOf(today()));
  const [monthAnchor, setMonthAnchor] = useState(today().slice(0, 7));
  const [editTarget, setEditTarget] = useState<{ ansatt: TimeEntry['ansatt']; date: string; entry?: TimeEntry } | null>(null);

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

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
      const e = entries.find((x) => x.ansatt === a.id && x.date === dt);
      if (e) rows.push([a.navn, dt, e.start, e.slutt, e.pause, fmt(timar(e)), e.status]);
    }));
    downloadCsv(`mekk-olen-timeliste-veke${isoWeek(weekStart)}.csv`, rows);
  };

  const exportPdf = () => window.print();

  const exportLonn = () => {
    const [my, mm] = monthAnchor.split('-').map(Number);
    const inMonth = (dt: string) => dt.slice(0, 7) === monthAnchor;
    const rows: (string | number)[][] = [['Tilsett', 'Maaned', 'Timar', 'Sats (kr/t)', 'Brutto (kr)', 'Lonstype']];
    ansatte.forEach((a) => {
      const tot = entries.filter((e) => e.ansatt === a.id && inMonth(e.date) && e.status === 'godkjent').reduce((acc, e) => acc + timar(e), 0);
      const brutto = a.lonn === 'time' ? Math.round(tot * a.sats) : '';
      rows.push([a.navn, `${MND[mm - 1]} ${my}`, fmt(tot), a.lonn === 'time' ? a.sats : '', brutto, a.lonn === 'time' ? 'Timeløn' : 'Fastløn']);
    });
    rows.push([]);
    rows.push(['Berre godkjende timar er tatt med.', '', '', '', '', '']);
    downloadCsv(`mekk-olen-lonn-${monthAnchor}.csv`, rows);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 21 }}>Timeliste</div>
        <div className="no-print" style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {(['uke', 'manad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '7px 14px', borderRadius: 11, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === m ? 'var(--brand-strong)' : 'var(--surface)', color: mode === m ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {m === 'uke' ? 'Veke' : 'Månad'}
            </button>
          ))}
        </div>
        <div className="no-print" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={exportLonn} style={btnGhost}>Lønnsfil</button>
          <button onClick={exportCsv} style={btnGhost}>CSV</button>
          <button onClick={exportPdf} style={btnGhost}>PDF</button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={prevPeriod} style={navBtn}>‹</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{periodTittel}</div>
          {periodUnder && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{periodUnder}</div>}
        </div>
        <button onClick={nextPeriod} style={navBtn}>›</button>
        <button onClick={goToday} style={{ ...btnGhost, marginLeft: 4 }}>I dag</button>
      </div>

      {mode === 'uke' ? (
        <WeekTable
          dates={dates}
          entries={entries}
          onCellClick={(ansatt, date, entry) => setEditTarget({ ansatt, date, entry })}
          maaGodkjenne={maaGodkjenne}
          onApprove={(ansatt) => approveEmployeeEntries(ansatt, dates)}
        />
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
        <span>Normaltid 37,5 t/veke</span>
      </div>

      {editTarget && <TimeEntryModal target={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

function WeekTable({
  dates, entries, onCellClick, maaGodkjenne, onApprove,
}: {
  dates: string[];
  entries: TimeEntry[];
  onCellClick: (ansatt: TimeEntry['ansatt'], date: string, entry?: TimeEntry) => void;
  maaGodkjenne: boolean;
  onApprove: (ansatt: TimeEntry['ansatt']) => void;
}) {
  const { ansatte } = useAnsatte();
  return (
    <div className="table-scroll" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 }}>
      <table style={{ width: '100%', minWidth: 120 + dates.length * 110 + 220, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface-alt)' }}>
            <th style={th}>Tilsett</th>
            {dates.map((d) => (
              <th key={d} style={th}>{UKE_KORT[weekdayIdx(d)]} {parseDate(d).getDate()}</th>
            ))}
            <th style={th}>Totalt</th>
            <th style={th}>Lønn</th>
            {maaGodkjenne && <th style={th}></th>}
          </tr>
        </thead>
        <tbody>
          {ansatte.map((a) => {
            const rowEntries = dates.map((d) => entries.find((e) => e.ansatt === a.id && e.date === d));
            const sum = rowEntries.reduce((acc, e) => acc + (e ? timar(e) : 0), 0);
            const overtid = sum > 37.5 ? `+${fmt(sum - 37.5)} t ot` : 'normaltid';
            const lonn = a.lonn === 'time' ? fmtKr(sum * a.sats) : 'Fastløn';
            const ventarN = rowEntries.filter((e) => e?.status === 'venter').length;
            return (
              <tr key={a.id} style={{ borderTop: '1px solid var(--divider)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{a.navn}</td>
                {dates.map((d, i) => {
                  const e = rowEntries[i];
                  return (
                    <td key={d} style={{ ...td, cursor: 'pointer' }} onClick={() => onCellClick(a.id, d, e)}>
                      {e ? (
                        <div style={{ lineHeight: 1.2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Geist Mono'", fontWeight: 600 }}>
                            <span style={dot(e.status === 'godkjent' ? '#2f9e6f' : '#d8920f')} />
                            {fmt(timar(e))} t
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.start}–{e.slutt}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-faint2)', fontWeight: 700 }}>+</span>
                      )}
                    </td>
                  );
                })}
                <td style={{ ...td, fontFamily: "'Geist Mono'", fontWeight: 700 }}>
                  {fmt(sum)} t
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: sum > 37.5 ? 'var(--danger)' : 'var(--text-muted)' }}>{overtid}</div>
                </td>
                <td style={{ ...td, fontWeight: 600 }}>{lonn}</td>
                {maaGodkjenne && (
                  <td style={td}>
                    {ventarN > 0 && (
                      <button
                        onClick={() => onApprove(a.id)}
                        style={{ padding: '7px 12px', background: '#2f9e6f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
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

function MonthView({
  monthAnchor, entries, onDayClick,
}: {
  monthAnchor: string;
  entries: TimeEntry[];
  onDayClick: (date: string) => void;
}) {
  const { ansatte, findAnsatt } = useAnsatte();
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

  const manadKort = ansatte.map((a) => {
    const tot = entries.filter((e) => e.ansatt === a.id && e.date.slice(0, 7) === monthAnchor && e.status === 'godkjent').reduce((acc, e) => acc + timar(e), 0);
    const lonn = a.lonn === 'time' ? fmtKr(tot * a.sats) : 'Fastløn';
    return { a, tot, lonn };
  });

  return (
    <>
      <div className="table-scroll" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 }}>
        <div style={{ minWidth: 700, borderRadius: 18, overflow: 'hidden' }}>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
        {manadKort.map(({ a, tot, lonn }) => (
          <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.navn}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Geist Mono'", color: a.farge, marginTop: 4 }}>{fmt(tot)} t</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{lonn}</div>
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
