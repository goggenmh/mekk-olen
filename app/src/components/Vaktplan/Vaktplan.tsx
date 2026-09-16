import { useRef, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { DAGER_VAKTPLAN, FERIE_STYL } from '../../constants';
import { addDays, mondayOf, today, isoWeek, parseDate, weekdayIdx, shiftMonth, MND, UKE_KORT, datoIntervall, talDagar, skiftFraTid } from '../../lib/dates';
import { helligdagFor, halvdagFor } from '../../lib/helligdagar';
import { ShiftModal } from './ShiftModal';
import { SwapModal } from './SwapModal';
import { FerieModal } from './FerieModal';
import { UnavailableModal } from './UnavailableModal';
import { StandardvekeModal } from './StandardvekeModal';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { useIsMobile } from '../../lib/useIsMobile';
import type { Shift, Ferie, Unavailable } from '../../types';

const DAG_KEYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lau'];
const ferieStyl = (type: string) => FERIE_STYL[type] || FERIE_STYL.Fri;
const ferieForDag = (ferie: Ferie[], dato: string) => ferie.filter((f) => f.fra && f.til && f.fra <= dato && dato <= f.til);

export function Vaktplan() {
  const { shifts, swaps, ferie, moveShiftDate, approveSwap, declineSwap, canApprove, unavailable, standardveke, saveStandardveke, applyStandardveke, saveShift, deleteShift } = useAppData();
  const { user } = useAuth();
  const { findAnsatt } = useAnsatte();
  const isMobile = useIsMobile();
  const maaGodkjenne = canApprove(user?.id);
  // Kan berre redigere eigen ferie / standardveka / vakter – med mindre ein har delegeringsansvar.
  const kanStyreFerie = canApprove(user?.id);
  const kanStyreStandard = canApprove(user?.id);
  const kanLageVakt = canApprove(user?.id);
  const opneFerie = (f: Ferie) => { if (kanStyreFerie || f.ansatt === user?.id) setFerieTarget(f); };
  const [mode, setMode] = useState<'uke' | 'manad'>('uke');
  const [vpWeek, setVpWeek] = useState(mondayOf(today()));
  const [monthAnchor, setMonthAnchor] = useState(today().slice(0, 7));
  const [shiftTarget, setShiftTarget] = useState<{ date: string; shift?: Shift } | null>(null);
  const [swapTarget, setSwapTarget] = useState<Shift | null>(null);
  const [meny, setMeny] = useState<{ x: number; y: number; shift: Shift; date: string } | null>(null);
  const [ferieTarget, setFerieTarget] = useState<Ferie | 'new' | null>(null);
  const [utilTarget, setUtilTarget] = useState<{ dato: string; existing?: Unavailable } | null>(null);
  const [standardOpen, setStandardOpen] = useState(false);
  const dragShiftId = useRef<string | null>(null);

  const days = DAGER_VAKTPLAN.map((d, i) => ({ ...d, date: addDays(vpWeek, i) }));
  const iDag = today();

  const fyllVeke = () => {
    if (standardveke.length === 0) { window.alert('Standardveka er tom. Trykk «Lagre som standardveke» eller «Rediger standardveke» først.'); return; }
    if (window.confirm('Dette slettar alle vaktene denne veka og fyller inn standardveka på nytt. Halde fram?')) {
      applyStandardveke(vpWeek);
    }
  };

  const lagreSomStandard = () => {
    const vekeSkift = shifts.filter((s) => days.some((d) => d.date === s.date));
    if (vekeSkift.length === 0) { window.alert('Det er ingen vakter denne veka å lagre som standard.'); return; }
    if (!window.confirm('Lagre vaktene i denne veka som ny standardveke? Dette erstattar den førre standardveka.')) return;
    const entries = vekeSkift.map((s) => ({ ansatt: s.ansatt, dag: DAG_KEYS[weekdayIdx(s.date)], start: s.start, slutt: s.slutt }));
    saveStandardveke(entries);
  };

  const prevPeriod = () => (mode === 'uke' ? setVpWeek(addDays(vpWeek, -7)) : setMonthAnchor(shiftMonth(monthAnchor, -1)));
  const nextPeriod = () => (mode === 'uke' ? setVpWeek(addDays(vpWeek, 7)) : setMonthAnchor(shiftMonth(monthAnchor, 1)));
  const goToday = () => { setVpWeek(mondayOf(today())); setMonthAnchor(today().slice(0, 7)); };

  const periodTittel = mode === 'uke'
    ? `Veke ${isoWeek(vpWeek)}`
    : `${MND[Number(monthAnchor.split('-')[1]) - 1].charAt(0).toUpperCase()}${MND[Number(monthAnchor.split('-')[1]) - 1].slice(1)} ${monthAnchor.split('-')[0]}`;

  const pendingSwaps = swaps.filter((s) => s.status === 'pending');

  // Pågåande/kommande først, avslutta sist; elles etter frå-dato.
  const ferieSortert = [...ferie].sort((a, b) => {
    const aEnd = a.til && a.til < iDag ? 1 : 0;
    const bEnd = b.til && b.til < iDag ? 1 : 0;
    if (aEnd !== bEnd) return aEnd - bEnd;
    return (a.fra || '9999-99-99').localeCompare(b.fra || '9999-99-99');
  });

  return (
    <div style={{ padding: isMobile ? 16 : 30, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 25, letterSpacing: '-0.3px' }}>Vaktplan</div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {(['uke', 'manad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
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
        {mode === 'uke' && kanStyreStandard && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button onClick={() => setStandardOpen(true)} style={btnGhost} title="Rediger malen for standardveka">Rediger standardveke</button>
            <button onClick={lagreSomStandard} style={btnGhost} title="Lagre vaktene i denne veka som standardveke">Lagre denne veka</button>
            <button onClick={fyllVeke} style={{ ...btnGhost, color: 'var(--brand-strong)', borderColor: 'var(--brand)' }}>↻ Fyll frå standardveke</button>
          </div>
        )}
      </div>

      {mode === 'manad' ? (
        <MonthView
          monthAnchor={monthAnchor}
          shifts={shifts}
          unavailable={unavailable}
          ferie={ferie}
          onDayClick={(date) => { setVpWeek(mondayOf(date)); setMode('uke'); }}
        />
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${days.length},1fr)`, gap: 10 }}>
        {days.map((d) => {
          const dayShifts = shifts.filter((s) => s.date === d.date).slice().sort((a, b) => (a.start < b.start ? -1 : 1));
          const erIDag = d.date === iDag;
          const dagUtil = unavailable.filter((u) => u.dato === d.date);
          const egUtil = !!user && dagUtil.some((u) => u.ansatt === user.id);
          const heilagdag = helligdagFor(d.date);
          const halvdag = halvdagFor(d.date);
          const raudTint = egUtil || !!heilagdag;
          return (
            <div
              key={d.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragShiftId.current) { moveShiftDate(dragShiftId.current, d.date); dragShiftId.current = null; }
              }}
              style={{
                background: erIDag ? 'var(--brand-soft)' : raudTint ? 'var(--dag-raud-bg)' : halvdag ? 'var(--dag-amber-bg)' : 'var(--surface)',
                border: erIDag ? '2px solid var(--brand)' : raudTint ? '1px solid var(--dag-raud-border)' : halvdag ? '1px solid var(--dag-amber-border)' : '1px solid var(--border)',
                borderRadius: 12, padding: erIDag ? 9 : 10, minHeight: isMobile ? 'auto' : 220, display: 'flex', flexDirection: 'column', gap: 7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, paddingBottom: 7, borderBottom: '1px solid var(--divider)' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Geist'", color: erIDag ? 'var(--brand-strong)' : heilagdag ? 'var(--dag-raud-tekst)' : halvdag ? 'var(--dag-amber-tekst)' : 'var(--text)', lineHeight: 1, letterSpacing: '-0.6px' }}>{parseDate(d.date).getDate()}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: erIDag ? 'var(--brand-strong)' : 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 3 }}>{d.kort}</div>
                  {heilagdag ? (
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dag-raud-tekst)', marginTop: 1 }}>{heilagdag}</div>
                  ) : halvdag ? (
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dag-amber-tekst)', marginTop: 1 }}>{halvdag}</div>
                  ) : (
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>Ope {d.open}</div>
                  )}
                </div>
                {erIDag && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#fff', background: 'var(--brand)', borderRadius: 999, padding: '2px 8px' }}>I dag</span>}
              </div>
              {dayShifts.map((s) => {
                const a = findAnsatt(s.ansatt);
                const farge = a.farge;
                const kanOpne = kanLageVakt || s.ansatt === user?.id;
                return (
                  <div
                    key={s.id}
                    draggable={kanLageVakt}
                    onDragStart={kanLageVakt ? () => { dragShiftId.current = s.id; } : undefined}
                    onClick={kanOpne ? () => setShiftTarget({ date: d.date, shift: s }) : undefined}
                    onContextMenu={(e) => { e.preventDefault(); setMeny({ x: e.clientX, y: e.clientY, shift: s, date: d.date }); }}
                    title="Høgreklikk for val"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${farge}`, borderRadius: 10, padding: '8px 10px', cursor: kanLageVakt ? 'grab' : kanOpne ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: farge, flex: 'none' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.navn}</span>
                    </div>
                    <div style={{ fontFamily: "'Geist Mono'", fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 4, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{s.start}–{s.slutt}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {s.skift && <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-faint)' }}>{s.skift}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSwapTarget(s); }}
                        style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 600, background: 'none', color: 'var(--brand)', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        Bytt vakt
                      </button>
                    </div>
                  </div>
                );
              })}
              {(dagUtil.length > 0 || user) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: dayShifts.length ? 2 : 0 }}>
                  {dagUtil.map((u) => {
                    const a = findAnsatt(u.ansatt);
                    const eg = user?.id === u.ansatt;
                    return (
                      <span
                        key={u.id}
                        onClick={eg ? () => setUtilTarget({ dato: d.date, existing: u }) : undefined}
                        title={`${a.navn}${u.grunn ? ` – ${u.grunn}` : ' kan ikkje jobbe'}${eg ? ' (trykk for å endre)' : ''}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%', fontSize: 10.5, fontWeight: 700, color: 'var(--dag-raud-tekst)', background: 'var(--dag-raud-sterk)', border: '1px solid var(--dag-raud-border)', borderRadius: 8, padding: '2px 7px', cursor: eg ? 'pointer' : 'default' }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.init}{u.grunn ? `: ${u.grunn}` : ''}</span>
                      </span>
                    );
                  })}
                  {user && !egUtil && (
                    <button
                      onClick={() => setUtilTarget({ dato: d.date })}
                      title="Merk at du ikkje kan jobbe denne dagen"
                      style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '2px 7px', cursor: 'pointer' }}
                    >
                      Kan ikkje jobbe
                    </button>
                  )}
                </div>
              )}
              {ferieForDag(ferie, d.date).map((f) => {
                const a = findAnsatt(f.ansatt);
                const st = ferieStyl(f.type);
                return (
                  <span
                    key={f.id}
                    onClick={() => opneFerie(f)}
                    title={`${a.navn} – ${f.type}${f.tekst ? ` (${f.tekst})` : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: st.fg, background: st.bg, border: `1px solid ${st.kant}`, borderRadius: 8, padding: '3px 8px', cursor: (kanStyreFerie || f.ansatt === user?.id) ? 'pointer' : 'default' }}
                  >
                    <Icon name={st.ikon} size={12} />
                    {a.init} · {f.type}
                  </span>
                );
              })}
              {kanLageVakt && (
                <button
                  onClick={() => setShiftTarget({ date: d.date })}
                  style={{ marginTop: 'auto', border: '1px dashed var(--border)', background: 'none', borderRadius: 9, padding: '7px 0', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  + vakt
                </button>
              )}
            </div>
          );
        })}
      </div>
      )}

      {pendingSwaps.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
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

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Ferie &amp; fri</div>
          <button onClick={() => setFerieTarget('new')} style={{ ...btnGhost, marginLeft: 'auto' }}>+ Legg til</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          {ferieSortert.map((f) => {
            const a = findAnsatt(f.ansatt);
            const st = ferieStyl(f.type);
            const dagar = f.fra && f.til ? talDagar(f.fra, f.til) : 0;
            const paagaar = !!f.fra && !!f.til && f.fra <= iDag && iDag <= f.til;
            const kommande = !!f.fra && f.fra > iDag;
            return (
              <div
                key={f.id}
                onClick={() => opneFerie(f)}
                className="hoverable"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', border: `1px solid ${st.kant}`, background: 'var(--surface-alt)', borderRadius: 12, cursor: (kanStyreFerie || f.ansatt === user?.id) ? 'pointer' : 'default' }}
              >
                <span style={{ width: 38, height: 38, borderRadius: 11, background: st.bg, color: st.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name={st.ikon} size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.farge, flex: 'none' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{a.navn}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: st.fg, background: st.bg, border: `1px solid ${st.kant}`, borderRadius: 8, padding: '1px 8px' }}>{f.type}</span>
                    {paagaar && <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#fff', background: st.fg, borderRadius: 999, padding: '2px 7px' }}>Pågår</span>}
                    {kommande && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>om {talDagar(iDag, f.fra!) - 1} d</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.fra ? `${datoIntervall(f.fra, f.til)}${dagar ? ` · ${dagar} ${dagar === 1 ? 'dag' : 'dagar'}` : ''}` : 'Utan dato'}
                    {f.tekst ? ` — ${f.tekst}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
          {ferie.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen registrert.</div>}
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#0d5f6e,#0c5a69)', color: '#eaf6f8', borderRadius: 12, padding: '16px 18px', boxShadow: '0 8px 24px rgba(12,90,105,0.22)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8fd2dd', marginBottom: 10 }}>Bemanningsregel</div>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: '#cfe6ec', lineHeight: 1.6 }}>
          <li>Minst éin tilsett på vakt i alle opningstider.</li>
          <li>Sander dekkjer hovudsakleg formiddagar man–fre.</li>
          <li>Laurdagsvakt går på rundgang mellom Georg og Christian.</li>
          <li>Bytteønske må godkjennast før vakta blir flytta.</li>
        </ul>
      </div>

      {shiftTarget && <ShiftModal target={shiftTarget} onClose={() => setShiftTarget(null)} />}
      {swapTarget && <SwapModal shift={swapTarget} onClose={() => setSwapTarget(null)} />}
      {ferieTarget && <FerieModal existing={ferieTarget === 'new' ? undefined : ferieTarget} onClose={() => setFerieTarget(null)} />}
      {utilTarget && user && <UnavailableModal ansatt={user.id} dato={utilTarget.dato} existing={utilTarget.existing} onClose={() => setUtilTarget(null)} />}
      {standardOpen && <StandardvekeModal onClose={() => setStandardOpen(false)} />}
      {meny && (() => {
        const s = meny.shift;
        const a = findAnsatt(s.ansatt);
        const eigen = s.ansatt === user?.id;
        const kanEndre = kanLageVakt || eigen;
        const items: { tekst: string; ikon: string; farge?: string; handling: () => void }[] = [];
        if (kanEndre) items.push({ tekst: kanLageVakt ? 'Endre vakt' : 'Endre tidspunkt', ikon: 'blyant', handling: () => setShiftTarget({ date: meny.date, shift: s }) });
        items.push({ tekst: 'Be om bytte', ikon: 'bytte', handling: () => setSwapTarget(s) });
        if (kanLageVakt) {
          items.push({ tekst: 'Dupliser til neste dag', ikon: 'kopi', handling: () => {
            const nd = addDays(meny.date, 1);
            saveShift({ ansatt: s.ansatt, date: nd, start: s.start, slutt: s.slutt, skift: skiftFraTid(s.start, s.slutt, nd) });
          } });
          items.push({ tekst: 'Slett vakt', ikon: 'soppel', farge: 'var(--danger)', handling: () => {
            if (window.confirm(`Slette vakta til ${a.navn} ${s.start}–${s.slutt}?`)) deleteShift(s.id);
          } });
        }
        const MENY_BREIDD = 210;
        const left = Math.min(meny.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - MENY_BREIDD - 8);
        const top = Math.min(meny.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - (items.length * 42 + 46));
        return (
          <>
            <div onClick={() => setMeny(null)} onContextMenu={(e) => { e.preventDefault(); setMeny(null); }} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
            <div style={{ position: 'fixed', left, top, width: MENY_BREIDD, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 34px rgba(0,0,0,0.22)', overflow: 'hidden', zIndex: 71, padding: 5 }}>
              <div style={{ padding: '7px 11px 8px', borderBottom: '1px solid var(--divider)', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.farge, flex: 'none' }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{a.navn}</span>
                </div>
                <div style={{ fontFamily: "'Geist Mono'", fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.start}–{s.slutt}</div>
              </div>
              {items.map((it) => (
                <button
                  key={it.tekst}
                  onClick={() => { it.handling(); setMeny(null); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 13, fontWeight: 600, color: it.farge || 'var(--text)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-alt)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ display: 'flex', color: it.farge || 'var(--text-muted)', flex: 'none' }}><Icon name={it.ikon} size={15} /></span>
                  {it.tekst}
                </button>
              ))}
            </div>
          </>
        );
      })()}
    </div>
  );
}

function MonthView({
  monthAnchor, shifts, unavailable, ferie, onDayClick,
}: {
  monthAnchor: string;
  shifts: Shift[];
  unavailable: Unavailable[];
  ferie: Ferie[];
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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--surface-alt)' }}>
        {UKE_KORT.map((d) => <div key={d} style={{ ...th, textAlign: 'center' }}>{d}</div>)}
      </div>
      {weeks.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: '1px solid var(--divider)' }}>
          {row.map((d, ci) => {
            const dayShifts = shifts.filter((s) => s.date === d).slice().sort((a, b) => (a.start < b.start ? -1 : 1));
            const dagUtil = unavailable.filter((u) => u.dato === d);
            const heilagdag = helligdagFor(d);
            const halvdag = halvdagFor(d);
            const bg = !inMonth(d) ? 'var(--surface-soft)'
              : (dagUtil.length || heilagdag) ? 'var(--dag-raud-bg)'
              : halvdag ? 'var(--dag-amber-bg)' : 'var(--surface)';
            return (
              <div
                key={d}
                onClick={() => onDayClick(d)}
                style={{
                  minHeight: 78, padding: 7, borderRight: ci < 6 ? '1px solid var(--divider)' : 'none',
                  background: bg,
                  cursor: 'pointer', opacity: inMonth(d) ? 1 : 0.45,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 600, color: heilagdag ? 'var(--dag-raud-tekst)' : halvdag ? 'var(--dag-amber-tekst)' : 'var(--text-muted)', marginBottom: 4 }}>{parseDate(d).getDate()}</div>
                {heilagdag && <div title={heilagdag} style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--dag-raud-tekst)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{heilagdag}</div>}
                {!heilagdag && halvdag && <div title={halvdag} style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--dag-amber-tekst)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{halvdag}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayShifts.map((s) => {
                    const a = findAnsatt(s.ansatt);
                    return <div key={s.id} style={{ fontSize: 10.5, fontWeight: 700, color: a.farge }}>{a.init} {s.start}–{s.slutt}</div>;
                  })}
                  {ferieForDag(ferie, d).map((f) => {
                    const a = findAnsatt(f.ansatt);
                    const st = ferieStyl(f.type);
                    return (
                      <span key={f.id} title={`${a.navn} – ${f.type}${f.tekst ? ` (${f.tekst})` : ''}`} style={{ fontSize: 9.5, fontWeight: 700, color: st.fg, background: st.bg, border: `1px solid ${st.kant}`, borderRadius: 6, padding: '1px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.init} {f.type}
                      </span>
                    );
                  })}
                  {dagUtil.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: dayShifts.length ? 2 : 0 }}>
                      {dagUtil.map((u) => {
                        const a = findAnsatt(u.ansatt);
                        return (
                          <span
                            key={u.id}
                            title={`${a.navn}${u.grunn ? ` – ${u.grunn}` : ' kan ikkje jobbe'}`}
                            style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--dag-raud-tekst)', background: 'var(--dag-raud-sterk)', border: '1px solid var(--dag-raud-border)', borderRadius: 6, padding: '1px 5px' }}
                          >
                            {a.init}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const btnGhost: CSSProperties = { padding: '9px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' };
const navBtn: CSSProperties = { width: 32, height: 32, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 11, cursor: 'pointer', fontSize: 15, color: 'var(--text-secondary)' };
const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.3px' };
