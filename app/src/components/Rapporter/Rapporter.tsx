import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { weekDates, mondayOf, today, timar, fmt, fmtKr } from '../../lib/dates';
import { Avatar } from '../ui/Avatar';

type Periode = 'uke' | 'manad';

export function Rapporter() {
  const { entries, tasks, orders } = useAppData();
  const { ansatte } = useAnsatte();
  const [periode, setPeriode] = useState<Periode>('uke');

  const t = today();

  const innenPeriode = (dato: string) => {
    if (periode === 'uke') return weekDates(mondayOf(t)).includes(dato);
    return dato.slice(0, 7) === t.slice(0, 7);
  };

  const rader = ansatte.map((a) => {
    const mine = entries.filter((e) => e.ansatt === a.id && innenPeriode(e.date));
    const totalTimar = mine.reduce((acc, e) => acc + timar(e), 0);
    const ventar = mine.filter((e) => e.status === 'venter').length;
    const kr = a.lonn === 'time' ? totalTimar * a.sats : null;
    return { a, totalTimar, ventar, kr };
  });

  const totalTimarAlle = rader.reduce((acc, r) => acc + r.totalTimar, 0);
  const totalKrAlle = rader.reduce((acc, r) => acc + (r.kr || 0), 0);
  const totalVentar = rader.reduce((acc, r) => acc + r.ventar, 0);
  const fullforteOppgaver = tasks.filter((x) => x.ferdig).length;
  const aktiveBestillingar = orders.filter((o) => o.status !== 'henta').length;

  const kort = [
    { label: 'Timar', verdi: fmt(totalTimarAlle), farge: '#11788a' },
    { label: 'Lønn (timeansatte)', verdi: fmtKr(totalKrAlle), farge: '#2f9e6f' },
    { label: 'Ventar godkjenning', verdi: String(totalVentar), farge: '#d8920f' },
    { label: 'Fullførte oppgåver', verdi: String(fullforteOppgaver), farge: '#6a5acd' },
    { label: 'Aktive bestillingar', verdi: String(aktiveBestillingar), farge: '#e08a1e' },
  ];

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 22 }}>Rapporter</h1>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Nøkkeltall for {periode === 'uke' ? 'denne veka' : 'denne månaden'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['uke', 'manad'] as Periode[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              style={{
                padding: '8px 14px', borderRadius: 11, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: periode === p ? 'var(--brand-strong)' : 'var(--surface)', color: periode === p ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {p === 'uke' ? 'Denne veka' : 'Denne månaden'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
        {kort.map((k) => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.farge, fontFamily: "'Geist Mono'" }}>{k.verdi}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--divider)' }}>
          <span>Ansatt</span>
          <span>Timar</span>
          <span>Ventar</span>
          <span>Lønn</span>
        </div>
        {rader.map(({ a, totalTimar, ventar, kr }) => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar init={a.init} farge={a.farge} size={28} fontSize={10.5} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.navn}</span>
            </div>
            <span style={{ fontFamily: "'Geist Mono'", fontSize: 13 }}>{fmt(totalTimar)} t</span>
            <span style={{ fontFamily: "'Geist Mono'", fontSize: 13, color: ventar > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{ventar}</span>
            <span style={{ fontFamily: "'Geist Mono'", fontSize: 13 }}>{kr !== null ? fmtKr(kr) : 'Fastløn'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
