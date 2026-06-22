import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { findAnsatt } from '../../constants';
import { FERIE_TYPE } from '../../constants';
import { weekDates, mondayOf, today, fullDatoTekst, fmt, timar } from '../../lib/dates';
import { Avatar } from '../ui/Avatar';
import type { View } from '../../lib/view';

export function Dashboard({ setView }: { setView: (v: View) => void }) {
  const { entries, shifts, swaps, tasks, orders, ferie, meldinger } = useAppData();
  const { user } = useAuth();
  const mineMeldinger = meldinger.filter((m) => m.til === null || m.til === user?.id).slice(0, 5);

  const t = today();
  const weekDays = weekDates(mondayOf(t));

  const aktiveBestill = orders.filter((o) => o.status !== 'henta').length;
  const komenIkkjeVarsla = orders.filter((o) => o.status === 'komen' && !o.varsla).length;
  const dashVentar = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
  const ufordelteN = tasks.filter((x) => x.ansatt === 'ufordelt').length;
  const pendingSwaps = swaps.filter((s) => s.status === 'pending').length;

  const dashKort = [
    { label: 'Aktive bestillingar', verdi: aktiveBestill, sub: komenIkkjeVarsla > 0 ? `${komenIkkjeVarsla} klar – ikkje varsla` : 'alle varsla', farge: '#e08a1e', view: 'bestilling' as View },
    { label: 'Ventande timar', verdi: dashVentar, sub: dashVentar > 0 ? 'treng godkjenning' : 'alt godkjent', farge: '#d8920f', view: 'timeliste' as View },
    { label: 'Ufordelte oppgåver', verdi: ufordelteN, sub: 'i kø', farge: '#7e93a0', view: 'oppgaver' as View },
    { label: 'Bytteønske', verdi: pendingSwaps, sub: pendingSwaps > 0 ? 'ventar svar' : 'ingen', farge: '#6a5acd', view: 'vaktplan' as View },
  ];

  const jobbarIdag = shifts
    .filter((s) => s.date === t)
    .slice()
    .sort((a, b) => (a.start < b.start ? -1 : 1));

  const dashTimar = ['sander', 'georg', 'christian'].map((id) => {
    const a = findAnsatt(id);
    const tot = entries.filter((e) => e.ansatt === id && weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
    const pct = Math.min(100, Math.round((tot / 37.5) * 100));
    return { a, tot, pct };
  });

  const dashFerie = ferie.slice(0, 4);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 21 }}>Dashbord</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fullDatoTekst(t)}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
        {dashKort.map((k) => (
          <button
            key={k.label}
            onClick={() => setView(k.view)}
            style={{ textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: k.farge, fontFamily: "'JetBrains Mono'" }}>{k.verdi}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{k.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Kven jobbar i dag</div>
          {jobbarIdag.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen vakter i dag.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobbarIdag.map((s) => {
              const a = findAnsatt(s.ansatt);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar init={a.init} farge={a.farge} size={32} fontSize={11.5} />
                  <div style={{ flex: 1, lineHeight: 1.2 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.navn}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.skift}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: 'var(--text-secondary)' }}>{s.start}–{s.slutt}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Timar denne veka</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {dashTimar.map(({ a, tot, pct }) => (
              <div key={a.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{a.navn}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono'" }}>{fmt(tot)} / 37,5 t</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: a.farge, borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mineMeldinger.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Meldingar frå leiinga</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mineMeldinger.map((m) => (
              <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 13 }}>{m.tekst}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#0c2436', color: '#fff', borderRadius: 14, padding: '16px 18px' }}>
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
                <span style={{ fontSize: 10.5, fontWeight: 700, color: tc.fg, background: tc.bg, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>{f.type}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
