import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { weekDates, mondayOf, today } from '../../lib/dates';
import { VIEWS, NAV_GROUPS, type View } from '../../lib/view';
import { Icon } from '../ui/Icon';

const META = Object.fromEntries(VIEWS.map((v) => [v.key, v])) as Record<View, typeof VIEWS[number]>;

function readCollapsed(): boolean {
  try { return localStorage.getItem('mekk-rail-collapsed') === '1'; } catch { return false; }
}

export function Sidebar({ view, setView, isMobile = false, open = false, onClose }: {
  view: View;
  setView: (v: View) => void;
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}) {
  const { entries, swaps, tasks, orders } = useAppData();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('mekk-rail-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const weekDays = weekDates(mondayOf(today()));
  const timelisteBadge = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
  const vaktplanBadge = swaps.filter((s) => s.status === 'pending').length;
  const oppgaverBadge = tasks.filter((t) => t.ansatt === 'ufordelt').length;
  const bestillingBadge = orders.filter((o) => o.status === 'komen' && !o.varsla).length;

  const badges: Partial<Record<View, { n: number }>> = {
    timeliste: timelisteBadge > 0 ? { n: timelisteBadge } : undefined,
    vaktplan: vaktplanBadge > 0 ? { n: vaktplanBadge } : undefined,
    oppgaver: oppgaverBadge > 0 ? { n: oppgaverBadge } : undefined,
    bestilling: bestillingBadge > 0 ? { n: bestillingBadge } : undefined,
  };

  // Kollaps gjeld berre desktop-visning.
  const smal = collapsed && !isMobile;

  const innhald = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: smal ? '2px 0 14px' : '2px 8px 14px', justifyContent: smal ? 'center' : 'flex-start' }}>
        <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 28, height: 28, borderRadius: 9, flex: 'none' }} />
        {!smal && (
          <div style={{ lineHeight: 1.15 }} className="rail-label">
            <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 14, letterSpacing: '0.3px', color: 'var(--rail-brand)' }}>MEKK ØLEN</div>
            <div style={{ fontSize: 9.5, color: 'var(--rail-brand-sub)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Vakt &amp; timestyring</div>
          </div>
        )}
      </div>

      {NAV_GROUPS.map((grp, gi) => (
        <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {grp.seksjon && !smal && (
            <div className="rail-label" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--rail-section)', padding: '11px 12px 4px' }}>
              {grp.seksjon}
            </div>
          )}
          {grp.seksjon && smal && gi > 0 && (
            <div style={{ height: 1, background: 'var(--rail-border)', margin: '7px 8px' }} />
          )}
          {grp.punkt.map((key) => {
            const v = META[key];
            const active = view === key;
            const badge = badges[key];
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                title={smal ? v.label : undefined}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: smal ? 0 : 11,
                  padding: smal ? '9px 0' : '7px 11px', border: 'none', cursor: 'pointer',
                  fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, textAlign: 'left', borderRadius: 9,
                  justifyContent: smal ? 'center' : 'flex-start',
                  background: active ? 'var(--rail-active-bg)' : 'transparent', color: active ? 'var(--rail-active-fg)' : 'var(--rail-fg)',
                }}
              >
                {active && (
                  <span style={{ position: 'absolute', left: smal ? 4 : 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: 3, background: 'var(--rail-active-fg)' }} />
                )}
                <span style={{ width: 20, display: 'flex', justifyContent: 'center', flex: 'none', position: 'relative' }}>
                  <Icon name={v.ikon} size={18} />
                  {smal && badge && (
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--rail-bg-solid)' }} />
                  )}
                </span>
                {!smal && <span className="rail-label" style={{ flex: 1 }}>{v.label}</span>}
                {!smal && badge && (
                  <span className="rail-label" style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--accent)', borderRadius: 999, padding: '1px 7px', minWidth: 16, textAlign: 'center' }}>
                    {badge.n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {!isMobile && (
        <button
          onClick={toggleCollapsed}
          title={smal ? 'Utvid meny' : 'Kollaps meny'}
          style={{
            marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--rail-border)', background: 'transparent', cursor: 'pointer',
            color: 'var(--rail-section)', borderRadius: 9, padding: smal ? '8px 0' : '8px 11px',
            fontFamily: "'Geist'", fontSize: 12, fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>{smal ? '»' : '«'}</span>
          {!smal && <span className="rail-label">Kollaps</span>}
        </button>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {open && (
          <div className="no-print" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,36,54,0.45)', zIndex: 60 }} />
        )}
        <div
          className="no-print"
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, zIndex: 61,
            display: 'flex', flexDirection: 'column', gap: 1, padding: '16px 11px',
            background: 'var(--rail-bg)', borderRight: '1px solid var(--rail-border)', overflowY: 'auto',
            transform: open ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.2s ease',
            boxShadow: open ? '0 0 40px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {innhald}
        </div>
      </>
    );
  }

  return (
    <div
      className={`no-print${smal ? ' rail-collapsed' : ''}`}
      style={{
        width: smal ? 66 : 236, flex: 'none', display: 'flex', flexDirection: 'column', gap: 1,
        padding: smal ? '16px 9px' : '16px 11px', transition: 'width 0.16s ease',
        background: 'var(--rail-bg)', borderRight: '1px solid var(--rail-border)', height: '100vh', overflowY: 'auto',
      }}
    >
      {innhald}
    </div>
  );
}
