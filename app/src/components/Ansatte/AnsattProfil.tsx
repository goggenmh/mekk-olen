import { useAppData } from '../../context/AppDataContext';
import { weekDates, mondayOf, today, timar, fmt, fmtKr, UKE_FULL, weekdayIdx, datoKort } from '../../lib/dates';
import { FERIE_TYPE } from '../../constants';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Pill';
import type { Employee } from '../../constants';

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', boxShadow: 'var(--shadow-card)' } as const;
const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 } as const;

export function AnsattProfil({ ansatt, onBack, onEdit, onResetPin }: {
  ansatt: Employee;
  onBack: () => void;
  onEdit: () => void;
  onResetPin: () => void;
}) {
  const { entries, tasks, shifts, ferie } = useAppData();
  const t = today();
  const weekDays = weekDates(mondayOf(t));
  const manad = t.slice(0, 7);

  const timarUke = entries.filter((e) => e.ansatt === ansatt.id && weekDays.includes(e.date)).reduce((a, e) => a + timar(e), 0);
  const timarManad = entries.filter((e) => e.ansatt === ansatt.id && e.date.slice(0, 7) === manad).reduce((a, e) => a + timar(e), 0);
  const godkjentManad = entries.filter((e) => e.ansatt === ansatt.id && e.date.slice(0, 7) === manad && e.status === 'godkjent').reduce((a, e) => a + timar(e), 0);
  const opneOppg = tasks.filter((x) => x.ansatt === ansatt.id && !x.ferdig);
  const kommendeVakter = shifts.filter((s) => s.ansatt === ansatt.id && s.date >= t).slice().sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 6);
  const fravaer = ferie.filter((f) => f.ansatt === ansatt.id);

  const nokkeltal = [
    { verdi: `${fmt(timarUke)} t`, lab: 'Timar denne veka' },
    { verdi: `${fmt(timarManad)} t`, lab: 'Timar denne månaden' },
    { verdi: ansatt.lonn === 'time' ? fmtKr(godkjentManad * ansatt.sats) : 'Fastløn', lab: ansatt.lonn === 'time' ? 'Lønn (godkjent, mnd)' : 'Lønstype' },
    { verdi: String(opneOppg.length), lab: 'Opne oppgåver' },
  ];

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920 }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: "'Geist'", fontSize: 13, fontWeight: 600 }}>
        ‹ Tilbake til ansatte
      </button>

      {/* profil-topp */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Avatar init={ansatt.init} farge={ansatt.farge} size={56} fontSize={18} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.2px' }}>{ansatt.navn}</span>
            {ansatt.leder && <Pill label="Leiar" fg="#11788a" bg="var(--brand-soft)" />}
            {!ansatt.aktiv && <Pill label="Inaktiv" fg="#6e7d88" bg="var(--surface-alt)" />}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>{ansatt.rolle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onEdit} style={btn}>Endre</button>
          <button onClick={onResetPin} style={btn}>Nullstill PIN</button>
        </div>
      </div>

      {/* nøkkeltal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {nokkeltal.map((k) => (
          <div key={k.lab} style={cardStyle}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Geist Mono'", color: 'var(--brand-strong)', letterSpacing: '-0.3px' }}>{k.verdi}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{k.lab}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, alignItems: 'start' }}>
        {/* kontakt */}
        <div style={cardStyle}>
          <div style={labelStyle}>Kontakt</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ display: 'flex', color: 'var(--brand)' }}><Icon name="phone" size={15} /></span>{ansatt.telefon || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ display: 'flex', color: 'var(--brand)' }}><Icon name="mail" size={15} /></span>{ansatt.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ display: 'flex', color: 'var(--brand)' }}><Icon name="timeliste" size={15} /></span>{ansatt.lonn === 'time' ? `Timeløn · ${fmtKr(ansatt.sats)}/t` : 'Fastløn'}</div>
          </div>
        </div>

        {/* kommande vakter */}
        <div style={cardStyle}>
          <div style={labelStyle}>Kommande vakter</div>
          {kommendeVakter.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen planlagte vakter.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {kommendeVakter.map((s) => {
              const dag = UKE_FULL[weekdayIdx(s.date)];
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{dag} {datoKort(s.date)}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: "'Geist Mono'", color: 'var(--text-muted)' }}>{s.start}–{s.slutt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* opne oppgåver */}
        <div style={cardStyle}>
          <div style={labelStyle}>Opne oppgåver</div>
          {opneOppg.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen opne oppgåver.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {opneOppg.slice(0, 6).map((o) => {
              const forfalle = !!o.frist && o.frist < t;
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                  <span style={{ display: 'flex', color: forfalle ? 'var(--danger)' : 'var(--text-faint)', flex: 'none' }}><Icon name={forfalle ? 'alert' : 'oppgaver'} size={15} /></span>
                  <span style={{ flex: 1 }}>{o.tittel}</span>
                  {o.frist && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 9, color: forfalle ? '#fff' : 'var(--text-muted)', background: forfalle ? 'var(--danger)' : 'var(--surface-alt)' }}>{forfalle ? 'Forfalt' : datoKort(o.frist)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* fravær */}
        <div style={cardStyle}>
          <div style={labelStyle}>Fravær &amp; fri</div>
          {fravaer.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen registrert.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fravaer.map((f) => {
              const tc = FERIE_TYPE[f.type] || { fg: 'var(--text-muted)', bg: 'var(--surface-alt)' };
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{f.tekst}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: tc.fg, background: tc.bg, padding: '2px 8px', borderRadius: 9, textTransform: 'uppercase' }}>{f.type}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const btn = {
  padding: '9px 14px', background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 10, fontFamily: "'Geist'", fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
} as const;
