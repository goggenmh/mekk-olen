import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { weekDates, mondayOf, today, timar, fmt, fmtKr, addDays, talDagar, MND, parseDate } from '../../lib/dates';
import { alder } from '../../lib/bestilling';
import { Avatar } from '../ui/Avatar';

type Periode = 'uke' | 'manad';

const NORMALTID = 37.5;
const vaktTimar = (s: { start: string; slutt: string }) => {
  const [h1, m1] = s.start.split(':').map(Number);
  const [h2, m2] = s.slutt.split(':').map(Number);
  return (h2 * 60 + m2 - h1 * 60 - m1) / 60;
};

function lastNedCsv(namn: string, rader: (string | number)[][]) {
  const tekst = rader.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + tekst], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = namn;
  a.click();
  URL.revokeObjectURL(url);
}

export function Rapporter() {
  const { entries, shifts, ferie, tasks, orders } = useAppData();
  const { ansatte } = useAnsatte();
  const [periode, setPeriode] = useState<Periode>('uke');

  const t = today();
  const vekeDatoar = weekDates(mondayOf(t));
  const innenPeriode = (dato: string) => (periode === 'uke' ? vekeDatoar.includes(dato) : dato.slice(0, 7) === t.slice(0, 7));
  const periodeTekst = periode === 'uke' ? 'denne veka' : `${MND[Number(t.slice(5, 7)) - 1]} ${t.slice(0, 4)}`;

  // Overtid: timar over normaltida per veke (summert over vekene i perioden).
  const overtid = (ansatt: string) => {
    const mine = entries.filter((e) => e.ansatt === ansatt && innenPeriode(e.date));
    const perVeke = new Map<string, number>();
    for (const e of mine) perVeke.set(mondayOf(e.date), (perVeke.get(mondayOf(e.date)) || 0) + timar(e));
    return [...perVeke.values()].reduce((s, v) => s + Math.max(0, v - NORMALTID), 0);
  };
  // Fråvær: dagar med ferie/fri/kurs/sjukmelding i perioden (måndag–laurdag).
  const fravaerDagar = (ansatt: string) => {
    let n = 0;
    for (const f of ferie.filter((x) => x.ansatt === ansatt && x.fra && x.til)) {
      for (let d = f.fra!; d <= f.til!; d = addDays(d, 1)) {
        if (innenPeriode(d) && parseDate(d).getDay() !== 0) n++;
        if (talDagar(f.fra!, d) > 400) break;
      }
    }
    return n;
  };

  const rader = ansatte.map((a) => {
    const mine = entries.filter((e) => e.ansatt === a.id && innenPeriode(e.date));
    const registrert = mine.reduce((acc, e) => acc + timar(e), 0);
    const godkjent = mine.filter((e) => e.status === 'godkjent').reduce((acc, e) => acc + timar(e), 0);
    const planlagt = shifts.filter((s) => s.ansatt === a.id && innenPeriode(s.date)).reduce((acc, s) => acc + vaktTimar(s), 0);
    const ventar = mine.filter((e) => e.status === 'venter').length;
    const kr = a.lonn === 'time' ? godkjent * a.sats : null;
    // Avvik: berre dagar som er passerte, og tid frå start til slutt (vaktplanen har ikkje pause).
    const planHittil = shifts.filter((s) => s.ansatt === a.id && innenPeriode(s.date) && s.date <= t).reduce((acc, s) => acc + vaktTimar(s), 0);
    const bruttoHittil = mine.filter((e) => e.date <= t).reduce((acc, e) => acc + timar(e) + (e.pause || 0) / 60, 0);
    const avvik = planHittil > 0 && Math.abs(bruttoHittil - planHittil) >= 1;
    return { a, planlagt, registrert, godkjent, ventar, overtid: overtid(a.id), fravaer: fravaerDagar(a.id), kr, avvik };
  });

  const sum = (k: 'planlagt' | 'registrert' | 'godkjent' | 'overtid') => rader.reduce((acc, r) => acc + r[k], 0);
  const totalKrAlle = rader.reduce((acc, r) => acc + (r.kr || 0), 0);
  const totalVentar = rader.reduce((acc, r) => acc + r.ventar, 0);
  const fullforteOppgaver = tasks.filter((x) => x.ferdig).length;
  const aktiveBestillingar = orders.filter((o) => o.status !== 'henta').length;
  const gamleBestillingar = orders.filter((o) => alder(o).gammal).length;

  const kort = [
    { label: 'Planlagde timar', verdi: fmt(sum('planlagt')), farge: 'var(--pill-teal-fg)' },
    { label: 'Registrerte timar', verdi: fmt(sum('registrert')), farge: 'var(--brand-strong)' },
    { label: 'Godkjende timar', verdi: fmt(sum('godkjent')), farge: 'var(--pill-gronn-fg)' },
    { label: 'Overtid', verdi: fmt(sum('overtid')), farge: 'var(--pill-raud-fg)' },
    { label: 'Løn (godkjent, timeløna)', verdi: fmtKr(totalKrAlle), farge: 'var(--pill-gronn-fg)' },
    { label: 'Ventar godkjenning', verdi: String(totalVentar), farge: 'var(--pill-amber-fg)' },
    { label: 'Fullførte oppgåver', verdi: String(fullforteOppgaver), farge: 'var(--pill-lilla-fg)' },
    { label: 'Aktive bestillingar', verdi: `${aktiveBestillingar}${gamleBestillingar ? ` (${gamleBestillingar} lenge)` : ''}`, farge: 'var(--accent)' },
  ];

  const eksporter = () => {
    const generert = new Date().toLocaleString('nb-NO');
    lastNedCsv(`mekk-olen-rapport-${periode === 'uke' ? `veke-${vekeDatoar[0]}` : t.slice(0, 7)}.csv`, [
      [`Rapport for ${periodeTekst}`, `Generert ${generert}`],
      [],
      ['Tilsett', 'Planlagt (t)', 'Registrert (t)', 'Godkjent (t)', 'Overtid (t)', 'Fråværsdagar', 'Ventar godkjenning', 'Løn godkjent (kr)'],
      ...rader.map((r) => [r.a.navn, fmt(r.planlagt), fmt(r.registrert), fmt(r.godkjent), fmt(r.overtid), r.fravaer, r.ventar, r.kr !== null ? Math.round(r.kr) : 'Fastløn']),
      [],
      ['Løn er rekna av godkjende timar. Overtid = timar over 37,5 per veke.'],
    ]);
  };

  const kol = '1.6fr repeat(6, 1fr)';

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Geist Variable'", fontWeight: 800, fontSize: 25, letterSpacing: '-0.3px' }}>Rapportar</h1>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Nøkkeltal for {periodeTekst}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['uke', 'manad'] as Periode[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              aria-pressed={periode === p}
              style={{
                padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: periode === p ? 'var(--brand-strong)' : 'var(--surface)', color: periode === p ? 'var(--on-brand)' : 'var(--text-secondary)',
              }}
            >
              {p === 'uke' ? 'Denne veka' : 'Denne månaden'}
            </button>
          ))}
          <button onClick={eksporter} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--surface)', color: 'var(--text)' }}>
            Last ned CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
        {kort.map((k) => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '17px 19px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.farge, fontFamily: "'Geist Mono Variable'", letterSpacing: '-0.5px' }}>{k.verdi}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'auto', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ minWidth: 720 }}>
          <div style={{ display: 'grid', gridTemplateColumns: kol, padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--divider)', background: 'var(--surface-alt)' }}>
            <span>Tilsett</span>
            <span>Planlagt</span>
            <span>Registrert</span>
            <span>Godkjent</span>
            <span>Overtid</span>
            <span>Fråvær</span>
            <span>Løn</span>
          </div>
          {rader.map((r) => {
            const avvik = r.avvik;
            return (
              <div key={r.a.id} style={{ display: 'grid', gridTemplateColumns: kol, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--divider)', fontFamily: "'Geist Mono Variable'", fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Geist Variable'" }}>
                  <Avatar init={r.a.init} farge={r.a.farge} size={28} fontSize={10.5} />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.a.navn}</span>
                </div>
                <span>{fmt(r.planlagt)} t</span>
                <span style={{ color: avvik ? 'var(--pill-amber-fg)' : undefined }} title={avvik ? 'Avvik frå vaktplanen' : undefined}>{fmt(r.registrert)} t{avvik ? ' ⚠' : ''}</span>
                <span>{fmt(r.godkjent)} t{r.ventar > 0 && <span style={{ color: 'var(--danger)', fontSize: 11 }}> ({r.ventar} ventar)</span>}</span>
                <span style={{ color: r.overtid > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.overtid > 0 ? `${fmt(r.overtid)} t` : '–'}</span>
                <span style={{ color: r.fravaer > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{r.fravaer > 0 ? `${r.fravaer} d` : '–'}</span>
                <span>{r.kr !== null ? fmtKr(r.kr) : 'Fastløn'}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Løn er rekna av godkjende timar. Overtid er timar over 37,5 per veke. ⚠ = registrerte timar avvik minst éin time frå vaktplanen.
      </div>
    </div>
  );
}
