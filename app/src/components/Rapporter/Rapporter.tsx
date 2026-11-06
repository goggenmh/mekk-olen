import { useState } from 'react';
import { useAppData } from '../../context/appData';
import { useAnsatte } from '../../context/ansatte';
import { weekDates, mondayOf, today, timar, fmt, fmtKr, addDays, talDagar, MND, parseDate } from '../../lib/dates';
import { alder } from '../../lib/bestilling';
import { feriepengar, trekkForPeriode, type Trekk } from '../../lib/skatt';
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
  const { entries, shifts, ferie: alleFerie, tasks, orders } = useAppData();
  const godkjendFerie = alleFerie.filter((f) => f.status === 'godkjend');
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
    for (const f of godkjendFerie.filter((x) => x.ansatt === ansatt && x.fra && x.til)) {
      for (let d = f.fra!; d <= f.til!; d = addDays(d, 1)) {
        if (innenPeriode(d) && parseDate(d).getDay() !== 0) n++;
        if (talDagar(f.fra!, d) > 400) break;
      }
    }
    return n;
  };

  // Periodegrenser for skatteutrekninga [fra, til).
  const periodeFra = periode === 'uke' ? vekeDatoar[0] : `${t.slice(0, 7)}-01`;
  const periodeTil = periode === 'uke' ? addDays(vekeDatoar[0], 7) : (() => { const [y, m] = t.slice(0, 7).split('-').map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`; })();

  const rader = ansatte.map((a) => {
    const mine = entries.filter((e) => e.ansatt === a.id && innenPeriode(e.date));
    const registrert = mine.reduce((acc, e) => acc + timar(e), 0);
    const godkjent = mine.filter((e) => e.status === 'godkjent').reduce((acc, e) => acc + timar(e), 0);
    const planlagt = shifts.filter((s) => s.ansatt === a.id && innenPeriode(s.date)).reduce((acc, s) => acc + vaktTimar(s), 0);
    const ventar = mine.filter((e) => e.status === 'venter').length;
    const kr = a.lonn === 'time' ? godkjent * a.sats : null;
    // Framoverskodande lønskost for perioden. Timelønte: planlagde timar ×
    // timesats. Fastløn: månadslønna (sats) fordelt på perioden – same kostnad
    // uansett vaktplan. Veke = månadslønn × 12/52.
    const planlagtKr = a.lonn === 'time' ? planlagt * a.sats : (periode === 'manad' ? a.sats : (a.sats * 12) / 52);
    // Avvik: berre dagar som er passerte, og tid frå start til slutt (vaktplanen har ikkje pause).
    const planHittil = shifts.filter((s) => s.ansatt === a.id && innenPeriode(s.date) && s.date <= t).reduce((acc, s) => acc + vaktTimar(s), 0);
    const bruttoHittil = mine.filter((e) => e.date <= t).reduce((acc, e) => acc + timar(e) + (e.pause || 0) / 60, 0);
    const avvik = planHittil > 0 && Math.abs(bruttoHittil - planHittil) >= 1;
    const skatt: Trekk | null = a.lonn === 'time' ? trekkForPeriode(a, entries, periodeFra, periodeTil) : null;
    const ferie = feriepengar(a, entries, periodeFra, periodeTil);
    return { a, planlagt, registrert, godkjent, ventar, overtid: overtid(a.id), fravaer: fravaerDagar(a.id), kr, planlagtKr, avvik, skatt, ferie };
  });

  const sum = (k: 'planlagt' | 'registrert' | 'godkjent' | 'overtid') => rader.reduce((acc, r) => acc + r[k], 0);
  const totalKrAlle = rader.reduce((acc, r) => acc + (r.kr || 0), 0);
  const planlagtKrTime = rader.filter((r) => r.a.lonn === 'time').reduce((acc, r) => acc + (r.planlagtKr || 0), 0);
  const planlagtKrFast = rader.filter((r) => r.a.lonn === 'fast').reduce((acc, r) => acc + (r.planlagtKr || 0), 0);
  const totalPlanlagtKr = planlagtKrTime + planlagtKrFast;

  // Omsetning for perioden skriv leiaren inn sjølv (appen har ikkje kasse-/
  // salstal). Blir lagra lokalt på eininga, per periode – ingen endring i
  // databasen. Lønskost-% = planlagd lønskost / omsetning.
  const omsKey = periode === 'uke' ? `veke-${vekeDatoar[0]}` : t.slice(0, 7);
  const [omsetningar, setOmsetningar] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('mekk-omsetning') || '{}'); } catch { return {}; }
  });
  const omsetning = omsetningar[omsKey] ?? '';
  const settOmsetning = (v: string) => {
    setOmsetningar((prev) => {
      const neste = { ...prev, [omsKey]: v };
      try { localStorage.setItem('mekk-omsetning', JSON.stringify(neste)); } catch { /* privat modus */ }
      return neste;
    });
  };
  const omsTal = Number(omsetning.replace(/[\s.]/g, '').replace(',', '.')) || 0;
  const lonsProsent = omsTal > 0 ? (totalPlanlagtKr / omsTal) * 100 : null;
  // Rettleiande fargar – ikkje ein fasit, berre eit peik. Butikkar ligg typisk
  // rundt 10–20 % lønskost; over det er verdt eit blikk.
  const lonsFarge = lonsProsent === null ? 'var(--text)'
    : lonsProsent <= 20 ? 'var(--pill-gronn-fg)'
    : lonsProsent <= 30 ? 'var(--pill-amber-fg)'
    : 'var(--pill-raud-fg)';
  const totalTrekk = rader.reduce((acc, r) => acc + (r.skatt?.trekk || 0), 0);
  const totalFerie = rader.reduce((acc, r) => acc + (r.ferie?.periode || 0), 0);
  const manglarKort = rader.filter((r) => r.skatt?.manglarKort && r.skatt.brutto > 0).map((r) => r.a.navn);
  const totalVentar = rader.reduce((acc, r) => acc + r.ventar, 0);
  const fullforteOppgaver = tasks.filter((x) => x.ferdig).length;
  const aktiveBestillingar = orders.filter((o) => o.status !== 'henta').length;
  const gamleBestillingar = orders.filter((o) => alder(o).gammal).length;

  // Nøkkeltala er nøytrale (svart tal) som standard – farge ber meining, ikkje
  // pynt. Raudt/amber dukkar berre opp når verdien faktisk treng merksemd
  // (overtid, timar som ventar godkjenning, bestillingar som har stått lenge).
  const kort: { label: string; verdi: string; farge?: string }[] = [
    { label: 'Planlagde timar', verdi: fmt(sum('planlagt')) },
    { label: 'Registrerte timar', verdi: fmt(sum('registrert')) },
    { label: 'Godkjende timar', verdi: fmt(sum('godkjent')) },
    { label: 'Overtid', verdi: fmt(sum('overtid')), farge: sum('overtid') > 0 ? 'var(--pill-raud-fg)' : undefined },
    { label: 'Planlagd lønskost', verdi: fmtKr(totalPlanlagtKr) },
    { label: 'Brutto løn (godkjent)', verdi: fmtKr(totalKrAlle) },
    { label: 'Forskotstrekk (anslag)', verdi: fmtKr(totalTrekk) },
    { label: 'Netto utbetalt (anslag)', verdi: fmtKr(totalKrAlle - totalTrekk) },
    { label: 'Feriepengar opptent', verdi: fmtKr(totalFerie) },
    { label: 'Ventar godkjenning', verdi: String(totalVentar), farge: totalVentar > 0 ? 'var(--pill-amber-fg)' : undefined },
    { label: 'Fullførte oppgåver', verdi: String(fullforteOppgaver) },
    { label: 'Aktive bestillingar', verdi: `${aktiveBestillingar}${gamleBestillingar ? ` (${gamleBestillingar} lenge)` : ''}`, farge: gamleBestillingar > 0 ? 'var(--accent)' : undefined },
  ];

  const eksporter = () => {
    const generert = new Date().toLocaleString('nb-NO');
    lastNedCsv(`mekk-olen-rapport-${periode === 'uke' ? `veke-${vekeDatoar[0]}` : t.slice(0, 7)}.csv`, [
      [`Rapport for ${periodeTekst}`, `Generert ${generert}`],
      [],
      ['Tilsett', 'Planlagt (t)', 'Planlagd lønskost (kr)', 'Registrert (t)', 'Godkjent (t)', 'Overtid (t)', 'Fråværsdagar', 'Ventar godkjenning', 'Brutto (kr)', 'Forskotstrekk (kr)', 'Netto (kr)', 'Feriepengar opptent (kr)', 'Skatt'],
      ...rader.map((r) => [r.a.navn, fmt(r.planlagt), Math.round(r.planlagtKr || 0), fmt(r.registrert), fmt(r.godkjent), fmt(r.overtid), r.fravaer, r.ventar, r.kr !== null ? Math.round(r.kr) : 'Fastløn', r.skatt ? r.skatt.trekk : '', r.skatt ? Math.round(r.skatt.netto) : '', r.ferie ? Math.round(r.ferie.periode) : '', r.skatt ? r.skatt.forklaring : '']),
      [],
      ['Planlagd lønskost – timelønte (sum)', Math.round(planlagtKrTime)],
      ['Planlagd lønskost – fastløn (sum)', Math.round(planlagtKrFast)],
      ['Planlagd lønskost – totalt', Math.round(totalPlanlagtKr)],
      ['Omsetning (innskriven)', omsTal || ''],
      ['Lønskost-%', lonsProsent !== null ? `${lonsProsent.toFixed(1).replace('.', ',')} %` : ''],
      [],
      ['Planlagd lønskost = planlagde timar × timesats (timelønte) + månadslønn fordelt på perioden (fastløn). Løn er rekna av godkjende timar. Overtid = timar over 37,5 per veke. Forskotstrekket er eit anslag – lønssystemet/a-meldinga er fasit. Feriepengar er opptent i perioden og blir utbetalt neste år.'],
    ]);
  };

  const kol = '1.6fr repeat(5, 0.85fr) 1.1fr 1.1fr';

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sidetittel">Rapportar</h1>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Nøkkeltal for {periodeTekst}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['uke', 'manad'] as Periode[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              aria-pressed={periode === p}
              style={{
                padding: '8px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: periode === p ? 'var(--brand-strong)' : 'var(--surface)', color: periode === p ? 'var(--on-brand)' : 'var(--text-secondary)',
              }}
            >
              {p === 'uke' ? 'Denne veka' : 'Denne månaden'}
            </button>
          ))}
          <button onClick={eksporter} style={{ padding: '8px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--surface)', color: 'var(--text)' }}>
            Last ned CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
        {kort.map((k) => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '17px 19px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.farge || 'var(--text)', fontFamily: "'Geist Mono Variable'", letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>{k.verdi}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Lønskost mot omsetning – kva vaktplanen kjem til å koste, sett opp mot
          kva butikken omset for. Omsetninga skriv leiaren inn sjølv. */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>Lønskost mot omsetning</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Kva vaktplanen for {periodeTekst} kjem til å koste, sett opp mot omsetninga. Skriv inn forventa eller faktisk omsetning.</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Planlagd lønskost</div>
            <div style={{ fontFamily: "'Geist Mono Variable'", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{fmtKr(totalPlanlagtKr)}</div>
            {planlagtKrFast > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>Timelønte {fmtKr(planlagtKrTime)} · fastløn {fmtKr(planlagtKrFast)}</div>
            )}
          </div>
          <div>
            <label htmlFor="oms-inn" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Omsetning {periodeTekst}</label>
            <div style={{ position: 'relative', width: 170 }}>
              <input
                id="oms-inn"
                inputMode="numeric"
                value={omsetning}
                onChange={(e) => settOmsetning(e.target.value)}
                placeholder="0"
                aria-label={`Omsetning ${periodeTekst} i kroner`}
                style={{ width: '100%', padding: '10px 32px 10px 13px', border: '1px solid var(--border)', background: 'var(--surface-alt)', borderRadius: 'var(--r)', fontFamily: "'Geist Mono Variable'", fontSize: 18, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>kr</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>Lønskost-%</div>
            <div style={{ fontFamily: "'Geist Mono Variable'", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: lonsFarge }}>
              {lonsProsent === null ? '–' : `${lonsProsent.toFixed(1).replace('.', ',')} %`}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Planlagd lønskost = timelønte (planlagde timar × timesats) + fastløn (månadslønn fordelt på perioden). Fastløn er same kostnad uansett vaktplan. Omsetninga blir lagra lokalt på denne eininga, ikkje i systemet. Butikkar ligg typisk rundt 10–20 % lønskost; prosenten er berre rettleiande.
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'auto', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: kol, padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--divider)', background: 'var(--surface-alt)' }}>
            <span>Tilsett</span>
            <span>Planlagt</span>
            <span>Registrert</span>
            <span>Godkjent</span>
            <span>Overtid</span>
            <span>Fråvær</span>
            <span>Brutto</span>
            <span>Netto</span>
          </div>
          {rader.map((r) => {
            const avvik = r.avvik;
            return (
              <div key={r.a.id} style={{ display: 'grid', gridTemplateColumns: kol, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--divider)', fontFamily: "'Geist Mono Variable'", fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)' }}>
                  <Avatar init={r.a.init} farge={r.a.farge} size={28} fontSize={10.5} />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.a.navn}</span>
                </div>
                <span>{fmt(r.planlagt)} t</span>
                <span style={{ color: avvik ? 'var(--pill-amber-fg)' : undefined }} title={avvik ? 'Avvik frå vaktplanen' : undefined}>{fmt(r.registrert)} t{avvik ? ' (avvik)' : ''}</span>
                <span>{fmt(r.godkjent)} t{r.ventar > 0 && <span style={{ color: 'var(--danger)', fontSize: 11 }}> ({r.ventar} ventar)</span>}</span>
                <span style={{ color: r.overtid > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.overtid > 0 ? `${fmt(r.overtid)} t` : '–'}</span>
                <span style={{ color: r.fravaer > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{r.fravaer > 0 ? `${r.fravaer} d` : '–'}</span>
                <span>{r.kr !== null ? fmtKr(r.kr) : 'Fastløn'}</span>
                <span title={r.skatt?.forklaring} style={{ color: r.skatt?.manglarKort ? 'var(--danger)' : undefined }}>
                  {r.skatt ? fmtKr(r.skatt.netto) : '–'}
                  {r.skatt && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, color: r.skatt.manglarKort ? 'var(--danger)' : 'var(--text-muted)' }}>{r.skatt.forklaring}</div>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {manglarKort.length > 0 && <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>Manglar skattekort: {manglarKort.join(', ')}. Registrer det under Tilsette, elles skal det trekkjast 50 %.</div>}
        Forskotstrekk er eit anslag ut frå skatteopplysningane under Tilsette – lønssystemet/a-meldinga er fasit. Løn er rekna av godkjende timar. Overtid er timar over 37,5 per veke. = registrerte timar avvik minst éin time frå vaktplanen.
      </div>
    </div>
  );
}
