import { useRef, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { DAGER_VAKTPLAN, SKIFT_FARGE, SHIFT_TEMPLATE } from '../../constants';
import { addDays, mondayOf, today, isoWeek, parseDate, DAG_IDX, shiftMonth, MND, UKE_KORT } from '../../lib/dates';
import { ShiftModal } from './ShiftModal';
import { SwapModal } from './SwapModal';
import { FerieModal } from './FerieModal';
import { CopyWeekModal } from './CopyWeekModal';
import { Avatar } from '../ui/Avatar';
import type { Shift, Ferie } from '../../types';

export function Vaktplan() {
  const { shifts, swaps, ferie, moveShiftDate, fillWeek, addShifts, approveSwap, declineSwap, canApprove } = useAppData();
  const { user } = useAuth();
  const { findAnsatt } = useAnsatte();
  const maaGodkjenne = canApprove(user?.id);
  const [mode, setMode] = useState<'uke' | 'manad'>('uke');
  const [vpWeek, setVpWeek] = useState(mondayOf(today()));
  const [monthAnchor, setMonthAnchor] = useState(today().slice(0, 7));
  const [shiftTarget, setShiftTarget] = useState<{ date: string; shift?: Shift } | null>(null);
  const [swapTarget, setSwapTarget] = useState<Shift | null>(null);
  const [ferieTarget, setFerieTarget] = useState<Ferie | 'new' | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [clipboard, setClipboard] = useState<{ ansatt: Shift['ansatt']; start: string; slutt: string; skift: string } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; date: string; shift?: Shift } | null>(null);
  const dragShiftId = useRef<string | null>(null);

  const copyShift = (s: Shift) => { setClipboard({ ansatt: s.ansatt, start: s.start, slutt: s.slutt, skift: s.skift }); setMenu(null); };
  const pasteShift = async (date: string) => {
    if (!clipboard) return;
    await addShifts([{ ...clipboard, date }]);
    setMenu(null);
  };

  const days = DAGER_VAKTPLAN.map((d, i) => ({ ...d, date: addDays(vpWeek, i) }));
  const ukasVakter = shifts.filter((s) => days.some((d) => d.date === s.date));

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
        <div style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 21 }}>Vaktplan</div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
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
        <button onClick={prevPeriod} style={navBtn}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{periodTittel}</div>
        <button onClick={nextPeriod} style={navBtn}>›</button>
        <button onClick={goToday} style={btnGhost}>I dag</button>
        {mode === 'uke' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => setCopyOpen(true)} disabled={ukasVakter.length === 0} style={{ ...btnGhost, opacity: ukasVakter.length === 0 ? 0.5 : 1 }}>⧉ Kopier veka</button>
            <button onClick={fyllVeke} style={btnGhost}>↻ Fyll frå standardveke</button>
          </div>
        )}
      </div>

      {mode === 'manad' ? (
        <MonthView
          monthAnchor={monthAnchor}
          shifts={shifts}
          onDayClick={(date) => { setVpWeek(mondayOf(date)); setMode('uke'); }}
        />
      ) : (
      <div className="table-scroll">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length},1fr)`, gap: 12, minWidth: 760 }}>
        {days.map((d) => {
          const dayShifts = shifts.filter((s) => s.date === d.date).slice().sort((a, b) => (a.start < b.start ? -1 : 1));
          return (
            <div
              key={d.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragShiftId.current) { moveShiftDate(dragShiftId.current, d.date); dragShiftId.current = null; }
              }}
              onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, date: d.date }); }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 10, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 8 }}
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
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, date: d.date, shift: s }); }}
                    style={{ background: farge, color: '#fff', borderRadius: 12, padding: '8px 9px', cursor: 'grab', fontSize: 12 }}
                  >
                    <div style={{ fontWeight: 700 }}>{a.navn}</div>
                    <div style={{ opacity: 0.9, fontSize: 11 }}>{s.start}–{s.slutt}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSwapTarget(s); }}
                      style={{ marginTop: 4, fontSize: 10.5, background: 'rgba(255,255,255,0.22)', color: '#fff', border: 'none', borderRadius: 9, padding: '3px 7px', cursor: 'pointer' }}
                    >
                      Bytt vakt
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => setShiftTarget({ date: d.date })}
                style={{ marginTop: 'auto', border: '1px dashed var(--border)', background: 'none', borderRadius: 11, padding: '7px 0', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                + vakt
              </button>
            </div>
          );
        })}
      </div>
      </div>
      )}

      {pendingSwaps.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px' }}>
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
                      <button onClick={() => approveSwap(s.id)} style={{ padding: '7px 14px', background: '#2f9e6f', color: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Godkjenn</button>
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

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px' }}>
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

      <div style={{ background: '#0c2436', color: '#fff', borderRadius: 18, padding: '16px 18px' }}>
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
      {copyOpen && <CopyWeekModal weekStart={vpWeek} shifts={ukasVakter} onClose={() => setCopyOpen(false)} />}

      {menu && (
        <>
          <div onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div
            style={{
              position: 'fixed', left: menu.x, top: menu.y, zIndex: 61, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 11, boxShadow: '0 12px 30px rgba(0,0,0,0.2)', padding: 6, display: 'flex', flexDirection: 'column', minWidth: 160,
            }}
          >
            {menu.shift && (
              <button onClick={() => copyShift(menu.shift!)} style={ctxBtn}>⧉ Kopier vakt</button>
            )}
            <button onClick={() => pasteShift(menu.date)} disabled={!clipboard} style={{ ...ctxBtn, opacity: clipboard ? 1 : 0.5, cursor: clipboard ? 'pointer' : 'default' }}>📋 Lim inn her</button>
          </div>
        </>
      )}
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
  const { findAnsatt } = useAnsatte();
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
    <div className="table-scroll" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 }}>
      <div style={{ minWidth: 700, borderRadius: 18, overflow: 'hidden' }}>
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
    </div>
  );
}

const btnGhost: CSSProperties = { padding: '9px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' };
const ctxBtn: CSSProperties = { padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' };
const navBtn: CSSProperties = { width: 32, height: 32, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 11, cursor: 'pointer', fontSize: 15, color: 'var(--text-secondary)' };
const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.3px' };
