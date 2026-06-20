import { useRef, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { DAGER_VAKTPLAN, SKIFT_FARGE, SHIFT_TEMPLATE, findAnsatt } from '../../constants';
import { addDays, mondayOf, today, isoWeek, parseDate, DAG_IDX } from '../../lib/dates';
import { ShiftModal } from './ShiftModal';
import { SwapModal } from './SwapModal';
import { FerieModal } from './FerieModal';
import { Avatar } from '../ui/Avatar';
import type { Shift, Ferie } from '../../types';

export function Vaktplan() {
  const { shifts, swaps, ferie, moveShiftDate, fillWeek, approveSwap, declineSwap } = useAppData();
  const [vpWeek, setVpWeek] = useState(mondayOf(today()));
  const [shiftTarget, setShiftTarget] = useState<{ date: string; shift?: Shift } | null>(null);
  const [swapTarget, setSwapTarget] = useState<Shift | null>(null);
  const [ferieTarget, setFerieTarget] = useState<Ferie | 'new' | null>(null);
  const dragShiftId = useRef<string | null>(null);

  const days = DAGER_VAKTPLAN.map((d, i) => ({ ...d, date: addDays(vpWeek, i) }));

  const fyllVeke = () => {
    fillWeek(SHIFT_TEMPLATE.map((t) => ({ ansatt: t.ansatt, date: addDays(vpWeek, DAG_IDX[t.dag]), start: t.start, slutt: t.slutt, skift: t.skift })));
  };

  const pendingSwaps = swaps.filter((s) => s.status === 'pending');

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 21 }}>Vaktplan</div>
        <button onClick={() => setVpWeek(addDays(vpWeek, -7))} style={navBtn}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Veke {isoWeek(vpWeek)}</div>
        <button onClick={() => setVpWeek(addDays(vpWeek, 7))} style={navBtn}>›</button>
        <button onClick={() => setVpWeek(mondayOf(today()))} style={btnGhost}>I dag</button>
        <button onClick={fyllVeke} style={{ ...btnGhost, marginLeft: 'auto' }}>↻ Fyll frå standardveke</button>
      </div>

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
              style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 12, padding: 10, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6e7d88', textTransform: 'uppercase' }}>{d.kort} {parseDate(d.date).getDate()}</div>
                <div style={{ fontSize: 10.5, color: '#a4b1ba' }}>Ope {d.open}</div>
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
                style={{ marginTop: 'auto', border: '1px dashed #d6dfe4', background: 'none', borderRadius: 8, padding: '7px 0', fontSize: 12, color: '#7e93a0', cursor: 'pointer' }}
              >
                + vakt
              </button>
            </div>
          );
        })}
      </div>

      {pendingSwaps.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Bytteønske</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingSwaps.map((s) => {
              const fra = findAnsatt(s.fra);
              const til = findAnsatt(s.til);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar init={fra.init} farge={fra.farge} size={28} fontSize={10.5} />
                  <span style={{ fontSize: 13 }}>{fra.navn} → {til.navn}</span>
                  <span style={{ fontSize: 12, color: '#7e93a0' }}>{s.dag} · {s.tid}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => declineSwap(s.id)} style={{ ...btnGhost, color: '#c0392b' }}>Avslå</button>
                    <button onClick={() => approveSwap(s.id)} style={{ padding: '7px 14px', background: '#2f9e6f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Godkjenn</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 14, padding: '16px 18px' }}>
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
          {ferie.length === 0 && <div style={{ fontSize: 13, color: '#7e93a0' }}>Ingen registrert.</div>}
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

const btnGhost: CSSProperties = { padding: '9px 14px', border: '1px solid #e1e8ec', background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#566570', cursor: 'pointer' };
const navBtn: CSSProperties = { width: 32, height: 32, border: '1px solid #e1e8ec', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 15, color: '#566570' };
