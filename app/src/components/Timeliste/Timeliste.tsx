import { useMemo, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { ANSATTE, findAnsatt } from '../../constants';
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
  const { entries, approveAllEntries } = useAppData();
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

  const ventarThisWeek = entries.filter((e) => dates.includes(e.date) && e.status === 'venter');

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Tilsett', 'Dato', 'Start', 'Slutt', 'Pause(min)', 'Timar', 'Status']];
    dates.forEach((dt) => ANSATTE.forEach((a) => {
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
    ANSATTE.forEach((a) => {
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
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 21 }}>Timeliste</div>
        <div className="no-print" style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {(['uke', 'manad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: '1px solid #e1e8ec', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === m ? '#11788a' : '#fff', color: mode === m ? '#fff' : '#566570',
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
          {periodUnder && <div style={{ fontSize: 12, color: '#7e93a0' }}>{periodUnder}</div>}
        </div>
        <button onClick={nextPeriod} style={navBtn}>›</button>
        <button onClick={goToday} style={{ ...btnGhost, marginLeft: 4 }}>I dag</button>

        {mode === 'uke' && ventarThisWeek.length > 0 && (
          <button
            onClick={() => approveAllEntries(dates)}
            style={{ marginLeft: 'auto', padding: '9px 16px', background: '#2f9e6f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Godkjenn heile veka ({ventarThisWeek.length})
          </button>
        )}
      </div>

      {mode === 'uke' ? (
        <WeekTable dates={dates} entries={entries} onCellClick={(ansatt, date, entry) => setEditTarget({ ansatt, date, entry })} />
      ) : (
        <MonthView
          monthAnchor={monthAnchor}
          entries={entries}
          onDayClick={(date) => { setWeekStart(mondayOf(date)); setMode('uke'); }}
        />
      )}

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: 12, color: '#7e93a0' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={dot('#2f9e6f')} /> Godkjent</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={dot('#d8920f')} /> Ventar</span>
        <span>Normaltid 37,5 t/veke</span>
      </div>

      {editTarget && <TimeEntryModal target={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

function WeekTable({
  dates, entries, onCellClick,
}: {
  dates: string[];
  entries: TimeEntry[];
  onCellClick: (ansatt: TimeEntry['ansatt'], date: string, entry?: TimeEntry) => void;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 14, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f7f9fb' }}>
            <th style={th}>Tilsett</th>
            {dates.map((d) => (
              <th key={d} style={th}>{UKE_KORT[weekdayIdx(d)]} {parseDate(d).getDate()}</th>
            ))}
            <th style={th}>Totalt</th>
            <th style={th}>Lønn</th>
          </tr>
        </thead>
        <tbody>
          {ANSATTE.map((a) => {
            const rowEntries = dates.map((d) => entries.find((e) => e.ansatt === a.id && e.date === d));
            const sum = rowEntries.reduce((acc, e) => acc + (e ? timar(e) : 0), 0);
            const overtid = sum > 37.5 ? `+${fmt(sum - 37.5)} t ot` : 'normaltid';
            const lonn = a.lonn === 'time' ? fmtKr(sum * a.sats) : 'Fastløn';
            return (
              <tr key={a.id} style={{ borderTop: '1px solid #eef2f4' }}>
                <td style={{ ...td, fontWeight: 600 }}>{a.navn}</td>
                {dates.map((d, i) => {
                  const e = rowEntries[i];
                  return (
                    <td key={d} style={{ ...td, cursor: 'pointer' }} onClick={() => onCellClick(a.id, d, e)}>
                      {e ? (
                        <div style={{ lineHeight: 1.2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>
                            <span style={dot(e.status === 'godkjent' ? '#2f9e6f' : '#d8920f')} />
                            {fmt(timar(e))} t
                          </div>
                          <div style={{ fontSize: 11, color: '#7e93a0' }}>{e.start}–{e.slutt}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#c3ced5', fontWeight: 700 }}>+</span>
                      )}
                    </td>
                  );
                })}
                <td style={{ ...td, fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>
                  {fmt(sum)} t
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: sum > 37.5 ? '#c0392b' : '#7e93a0' }}>{overtid}</div>
                </td>
                <td style={{ ...td, fontWeight: 600 }}>{lonn}</td>
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

  const manadKort = ANSATTE.map((a) => {
    const tot = entries.filter((e) => e.ansatt === a.id && e.date.slice(0, 7) === monthAnchor && e.status === 'godkjent').reduce((acc, e) => acc + timar(e), 0);
    const lonn = a.lonn === 'time' ? fmtKr(tot * a.sats) : 'Fastløn';
    return { a, tot, lonn };
  });

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#f7f9fb' }}>
          {UKE_KORT.map((d) => <div key={d} style={{ ...th, textAlign: 'center' }}>{d}</div>)}
        </div>
        {weeks.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: '1px solid #eef2f4' }}>
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
                    minHeight: 78, padding: 7, borderRight: ci < 6 ? '1px solid #eef2f4' : 'none',
                    background: sunday ? '#f3f7f8' : !inMonth(d) ? '#fbfcfd' : '#fff',
                    cursor: sunday ? 'default' : 'pointer', opacity: inMonth(d) ? 1 : 0.45,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#7e93a0', marginBottom: 4 }}>{parseDate(d).getDate()}</div>
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
        {manadKort.map(({ a, tot, lonn }) => (
          <div key={a.id} style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.navn}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: a.farge, marginTop: 4 }}>{fmt(tot)} t</div>
            <div style={{ fontSize: 12.5, color: '#7e93a0', marginTop: 2 }}>{lonn}</div>
          </div>
        ))}
      </div>
    </>
  );
}

const btnGhost: CSSProperties = { padding: '9px 14px', border: '1px solid #e1e8ec', background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#566570', cursor: 'pointer' };
const navBtn: CSSProperties = { width: 32, height: 32, border: '1px solid #e1e8ec', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 15, color: '#566570' };
const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#6e7d88', textTransform: 'uppercase', letterSpacing: '0.3px' };
const td: CSSProperties = { padding: '10px 12px' };
const dot = (color: string): CSSProperties => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color });
