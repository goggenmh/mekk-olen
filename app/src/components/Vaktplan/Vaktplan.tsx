import { useRef, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { DAGER_VAKTPLAN, SKIFT_FARGE, SHIFT_TEMPLATE, findAnsatt, canApprove } from '../../constants';
import { addDays, mondayOf, today, isoWeek, parseDate, DAG_IDX, shiftMonth, MND, UKE_KORT } from '../../lib/dates';
import { ShiftModal } from './ShiftModal';
import { SwapModal } from './SwapModal';
import { FerieModal } from './FerieModal';
import { Avatar } from '../ui/Avatar';
import type { Shift, Ferie } from '../../types';

export function Vaktplan() {
  const { shifts, swaps, ferie, moveShiftDate, fillWeek, approveSwap, declineSwap } = useAppData();
  const { user } = useAuth();
  const maaGodkjenne = canApprove(user?.id);
  const [mode, setMode] = useState<'uke' | 'manad'>('uke');
  const [vpWeek, setVpWeek] = useState(mondayOf(today()));
  const [monthAnchor, setMonthAnchor] = useState(today().slice(0, 7));
  const [shiftTarget, setShiftTarget] = useState<{ date: string; shift?: Shift } | null>(null);
  const [swapTarget, setSwapTarget] = useState<Shift | null>(null);
  const [ferieTarget, setFerieTarget] = useState<Ferie | 'new' | null>(null);
  const dragShiftId = useRef<string | null>(null);

  const days = DAGER_VAKTPLAN.map((d, i) => ({ ...d, date: addDays(vpWeek, i) }));

  const fyllVeke = () => {
    fillWeek(SHIFT_TEMPLATE.map((t) => ({ ansatt: t.ansatt, date: addDays(vpWeek, DAG_IDX[t.dag]), start: t.start, slutt: t.slutt, skift: t.skift })));
  };

  const prevPeriod = () => (mode === 'uke' ? setVpWeek(addDays(vpWeek, -7)) : setMonthAnchor(shiftMonth(monthAnchor, -1)));
  const nextPeriod = () => (mode === 'uke' ? setVpWeek(addDays(vpWeek, 7)) : setMonthAnchor(shiftMonth(monthAnchor, 1)));
  const goToday = () => { setVpWeek(mondayOf(today())); setMonthAnchor(today().slice(0, 7)); };

  const periodTittel = mode === 'uke'
    ? `Veke ${isoWeek(vpWeek)}`
    : `${MND[Number(monthAnchor.split('-')[1]) - 1].charAt(0).toUpperCase()}${MND[Number(monthAnchor.split('-')[1]) - 1].slice(1)} ${monthAnchor.split('-')[0]}`;

  const pendingSwaps = swaps.filter((s) => s.status === 'pending');

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 21 }}>Vaktplan</div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {(['uke', 'manad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === m ? '#11788a' : 'var(--surface)', color: mode === m ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {m === 'uke' ? 'Veke' : 'Månad'}
            </button>
          ))}
        </div>
        <button onClick={prevPeriod} style={navBtn}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{periodTittel}</div>
        <button onClick={nextPeriod} style={navBtn}>›</button>
        <button onClick={goToday} style={btnGhost}>I dag</button>
        {mode === 'uke' && <button onClick={fyllVeke} style={{ ...btnGhost, marginLeft: 'auto' }}>↻ Fyll frå standardveke</button>}
      </div>

      {mode === 'manad' ? (
        <MonthView
          monthAnchor={monthAnchor}
          shifts={shifts}
          onDayClick={(date) => { setVpWeek(mondayOf(date)); setMode('uke'); }}
        />
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length},1fr)`, gap: 12 }}>
        {days.map((d) => {
          const dayShifts = shifts.filter((s) => s.date === d.date).slice().sort((a, b) => (a.start < b.start ? -1 : 1));
          return (
            <div
              key={d.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragShiftId.current) { moveShiftDate(dragShiftId.current, d.date); dragShiftId.current = null; }
              }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase' }}>{d.kort} {parseDate(d.date).getDate()}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>Ope {d.open}</div>
              </div>
              {dayShifts.map((s) => {
                const a = findAnsatt(s.ansatt);
                const farge = SKIFT_FARGE[s.skift] || a.farge;
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => { dragShiftId.current = s.id; }}
                    onClick={() => setShiftTarget({ date: d.date, shift: s })}
                    style={{ background: farge, color: '#fff', borderRadius: 9, padding: '8px 9px', cursor: 'grab', fontSize: 12 }}
                  >
                    <div style={{ fontWeight: 700 }}>{a.navn}</div>
                    <div style={{ opacity: 0.9, fontSize: 11 }}>{s.start}–{s.slutt}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSwapTarget(s); }}
                      style={{ marginTop: 4, fontSize: 10.5, background: 'rgba(255,255,255,0.22)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 7px', cursor: 'pointer' }}
                    >
                      Bytt vakt
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => setShiftTarget({ date: d.date })}
                style={{ marginTop: 'auto', border: '1px dashed var(--border)', background: 'none', borderRadius: 8, padding: '7px 0', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                + vakt
              </button>
            </div>
          );
        })}
      </div>
      )}

      {pendingSwaps.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Bytteønske</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingSwaps.map((s) => {
              const fra = findAnsatt(s.fra);
              const til = findAnsatt(s.til);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar init={fra.init} farge={fra.farge} size={28} fontSize={10.5} />
                  <span style={{ fontSize: 13 }}>{fra.navn} → {til.navn}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.dag} · {s.tid}</span>
                  {maaGodkjenne ? (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button onClick={() => declineSwap(s.id)} style={{ ...btnGhost, color: 'var(--danger)' }}>Avslå</button>
                      <button onClick={() => approveSwap(s.id)} style={{ padding: '7px 14px', background: '#2f9e6f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Godkjenn</button>
                    </div>
                  ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>Ventar på godkjenning</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Ferie &amp; fri</div>
          <button onClick={() => setFerieTarget('new')} style={{ ...btnGhost, marginLeft: 'auto' }}>+ Legg til</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ferie.map((f) => {
            const a = findAnsatt(f.ansatt);
            return (
              <div key={f.id} onClick={() => setFerieTarget(f)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <Avatar init={a.init} farge={a.farge} size={28} fontSize={10.5} />
                <span style={{ fontSize: 13 }}>{a.navn} — {f.tekst} ({f.type})</span>
              </div>
            );
          })}
          {ferie.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen registrert.</div>}
        </div>
      </div>

      <div style={{ background: '#0c2436', color: '#fff', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Bemanningsregel</div>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: '#cfe0e6', lineHeight: 1.6 }}>
          <li>Minst éin tilsett på vakt i alle opningstider.</li>
          <li>Sander dekkjer hovudsakleg formiddagar man–fre.</li>
          <li>Laurdagsvakt går på rundgang mellom Georg og Christian.</li>
          <li>Bytteønske må godkjennast før vakta blir flytta.</li>
        </ul>
      </div>

      {shiftTarget && <ShiftModal target={shiftTarget} onClose={() => setShiftTarget(null)} />}
      {swapTarget && <SwapModal shift={swapTarget} onClose={() => setSwapTarget(null)} />}
      {ferieTarget && <FerieModal existing={ferieTarget === 'new' ? undefined : ferieTarget} onClose={() => setFerieTarget(null)} />}
    </div>
  );
}

function MonthView({
  monthAnchor, shifts, onDayClick,
}: {
  monthAnchor: string;
  shifts: Shift[];
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

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--surface-alt)' }}>
        {UKE_KORT.map((d) => <div key={d} style={{ ...th, textAlign: 'center' }}>{d}</div>)}
      </div>
      {weeks.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: '1px solid var(--divider)' }}>
          {row.map((d, ci) => {
            const dayShifts = shifts.filter((s) => s.date === d).slice().sort((a, b) => (a.start < b.start ? -1 : 1));
            return (
              <div
                key={d}
                onClick={() => onDayClick(d)}
                style={{
                  minHeight: 78, padding: 7, borderRight: ci < 6 ? '1px solid var(--divider)' : 'none',
                  background: !inMonth(d) ? 'var(--surface-soft)' : 'var(--surface)',
                  cursor: 'pointer', opacity: inMonth(d) ? 1 : 0.45,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{parseDate(d).getDate()}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayShifts.map((s) => {
                    const a = findAnsatt(s.ansatt);
                    return <div key={s.id} style={{ fontSize: 10.5, fontWeight: 700, color: a.farge }}>{a.init} {s.start}–{s.slutt}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const btnGhost: CSSProperties = { padding: '9px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' };
const navBtn: CSSProperties = { width: 32, height: 32, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', fontSize: 15, color: 'var(--text-secondary)' };
const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.3px' };
