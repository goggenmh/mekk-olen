import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { FERIE_TYPE, DAGER_VAKTPLAN } from '../../constants';
import { weekDates, mondayOf, today, fullDatoTekst, fmt, timar, UKE_FULL, weekdayIdx } from '../../lib/dates';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { TimeEntryModal } from '../Timeliste/TimeEntryModal';
import { ShiftModal } from '../Vaktplan/ShiftModal';
import { TaskModal } from '../Oppgaver/TaskModal';
import { OrderModal } from '../Bestillinger/OrderModal';
import type { View } from '../../lib/view';

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px' } as const;
const DAG_KEYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lau'];

export function Dashboard({ setView }: { setView: (v: View) => void }) {
  const { entries, shifts, swaps, tasks, orders, ferie, meldinger } = useAppData();
  const { user } = useAuth();
  const { ansatte, findAnsatt, isLeder } = useAnsatte();
  const [quickAction, setQuickAction] = useState<'timer' | 'vakt' | 'oppgave' | 'bestilling' | null>(null);

  const mineMeldinger = meldinger.filter((m) => m.til === null || m.til === user?.id).slice(0, 5);

  const t = today();
  const weekDays = weekDates(mondayOf(t));
  const leder = isLeder(user?.id);

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

  // ---- dagens oppgåver ----
  const wi = weekdayIdx(t);
  const dagDef = DAGER_VAKTPLAN.find((d) => d.key === DAG_KEYS[wi]);
  const [apnTid, stengTid] = (dagDef?.open || '').split('–');
  const mineOppgaver = tasks.filter((x) => !x.ferdig && (x.ansatt === user?.id || (leder && x.ansatt === 'ufordelt'))).slice(0, 4);

  // ---- neste vakter ----
  const kommendeVakter = weekDays
    .filter((d) => d >= t)
    .map((d) => ({ dato: d, vakter: shifts.filter((s) => s.date === d).slice().sort((a, b) => (a.start < b.start ? -1 : 1)) }))
    .filter((g) => g.vakter.length > 0);

  // ---- ansattstatus ----
  const jobbarIdagIds = shifts.filter((s) => s.date === t).map((s) => s.ansatt);

  // ---- nøkkeltall for leder ----
  const totalTimarUke = entries.filter((e) => weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
  const totalTimarManad = entries.filter((e) => e.date.slice(0, 7) === t.slice(0, 7)).reduce((acc, e) => acc + timar(e), 0);
  const antallTimeansatte = ansatte.filter((a) => a.lonn === 'time').length;
  const overtidManad = Math.max(0, totalTimarManad - antallTimeansatte * 37.5 * 4.33);
  const fravarN = ferie.filter((f) => f.type === 'Sjukmeld' || f.type === 'Ferie').length;
  const fullforteOppgaver = tasks.filter((x) => x.ferdig).length;

  const dashFerie = ferie.slice(0, 4);

  const hurtighandlinger = [
    { key: 'timer', ikon: 'ny-timer', tekst: 'Registrer timer', farge: '#11788a' },
    { key: 'vakt', ikon: 'ny-vakt', tekst: 'Ny vakt', farge: '#6a5acd' },
    { key: 'oppgave', ikon: 'ny-oppgave', tekst: 'Ny oppgave', farge: '#2f9e6f' },
    { key: 'bestilling', ikon: 'ny-bestilling', tekst: 'Ny bestilling', farge: '#e08a1e' },
  ] as const;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 21 }}>Oversikt</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fullDatoTekst(t)}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {hurtighandlinger.map((h) => (
          <button
            key={h.key}
            onClick={() => setQuickAction(h.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px', cursor: 'pointer',
            }}
          >
            <span style={{ width: 42, height: 42, borderRadius: 13, background: `${h.farge}1a`, color: h.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={h.ikon} size={21} /></span>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{h.tekst}</span>
          </button>
        ))}
      </div>

      {varsler.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Varslingssenter</div>
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
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Meldingar frå leiinga</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mineMeldinger.map((m) => (
              <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 13, padding: '10px 12px' }}>
                <div style={{ fontSize: 13 }}>{m.tekst}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>I dag</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {dagDef && apnTid && <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'flex', color: 'var(--text-muted)', flex: 'none' }}><Icon name="open" size={16} /></span><span>Åpne butikk {apnTid}</span></div>}
            {mineOppgaver.length === 0 && !dagDef && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen oppgåver i dag.</div>}
            {mineOppgaver.map((o) => (
              <button key={o.id} onClick={() => setView('oppgaver')} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
                <span style={{ display: 'flex', color: 'var(--text-muted)', flex: 'none' }}><Icon name="oppgaver" size={16} /></span><span>{o.tittel}</span>
              </button>
            ))}
            {dagDef && stengTid && <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'flex', color: 'var(--text-muted)', flex: 'none' }}><Icon name="close" size={16} /></span><span>Stenge butikk {stengTid}</span></div>}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Neste vakter</div>
          {kommendeVakter.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen planlagte vakter denne veka.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kommendeVakter.map((g) => {
              const dagNamn = UKE_FULL[weekdayIdx(g.dato)];
              const linje = g.vakter.map((s) => `${findAnsatt(s.ansatt).navn} ${s.start}–${s.slutt}`).join(', ');
              return (
                <div key={g.dato} style={{ fontSize: 13 }}>
                  <strong>{dagNamn.charAt(0).toUpperCase()}{dagNamn.slice(1)}:</strong> {linje}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: leder ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ansatte</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ansatte.map((a) => {
              const paJobb = jobbarIdagIds.includes(a.id);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: paJobb ? '#2f9e6f' : 'var(--border)' }} />
                  <Avatar init={a.init} farge={a.farge} size={28} fontSize={10.5} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{a.navn}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{paJobb ? 'På jobb' : 'Fri'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {leder && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nøkkeltall for leiar</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Timar denne veka', verdi: `${fmt(totalTimarUke)} t` },
                { label: 'Overtid denne månaden', verdi: `${fmt(overtidManad)} t` },
                { label: 'Fravær', verdi: String(fravarN) },
                { label: 'Fullførte oppgåver', verdi: String(fullforteOppgaver) },
              ].map((k) => (
                <div key={k.label}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Geist Mono'", color: 'var(--brand-strong)' }}>{k.verdi}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#0c2436', color: '#fff', borderRadius: 18, padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ferie &amp; fri på trappene</div>
        {dashFerie.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>Ingen registrert.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {dashFerie.map((f) => {
            const a = findAnsatt(f.ansatt);
            const tc = FERIE_TYPE[f.type] || { fg: '#fff', bg: 'rgba(255,255,255,0.12)' };
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar init={a.init} farge={a.farge} size={28} fontSize={10.5} />
                <div style={{ flex: 1, fontSize: 13 }}>{a.navn} — {f.tekst}</div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: tc.fg, background: tc.bg, padding: '2px 8px', borderRadius: 9, textTransform: 'uppercase' }}>{f.type}</span>
              </div>
            );
          })}
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
