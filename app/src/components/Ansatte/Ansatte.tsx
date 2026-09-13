import { useState } from 'react';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAppData } from '../../context/AppDataContext';
import { weekDates, mondayOf, today, timar, fmt, UKE_KORT, weekdayIdx } from '../../lib/dates';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Pill';
import { AnsattModal } from './AnsattModal';
import { ResetPinModal } from './ResetPinModal';
import { AnsattProfil } from './AnsattProfil';
import type { Employee } from '../../constants';

interface AnsattStats { timarUke: number; ventarOppg: number; nesteVakt: string | null; }

const cardStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
  padding: 16, display: 'flex', alignItems: 'center', gap: 14,
} as const;

function StatBit({ ikon, tekst }: { ikon: string; tekst: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 9, padding: '3px 9px' }}>
      <span style={{ display: 'flex', color: 'var(--brand)' }}><Icon name={ikon} size={13} /></span>{tekst}
    </span>
  );
}

function AnsattCard({ ansatt, stats, onProfil, onEdit, onResetPin, onToggleAktiv }: {
  ansatt: Employee;
  stats: AnsattStats;
  onProfil: () => void;
  onEdit: () => void;
  onResetPin: () => void;
  onToggleAktiv: () => void;
}) {
  return (
    <div className="hoverable" style={{ ...cardStyle, opacity: ansatt.aktiv ? 1 : 0.55, flexWrap: 'wrap' }}>
      <Avatar init={ansatt.init} farge={ansatt.farge} size={44} fontSize={14} />
      <div style={{ flex: 1, minWidth: 180, lineHeight: 1.3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{ansatt.navn}</span>
          {ansatt.leder && <Pill label="Leiar" fg="#11788a" bg="var(--brand-soft)" />}
          {!ansatt.aktiv && <Pill label="Inaktiv" fg="#6e7d88" bg="var(--surface-alt)" />}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ansatt.rolle}</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
          {ansatt.telefon && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="phone" size={13} /> {ansatt.telefon}</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="mail" size={13} /> {ansatt.email}</span>
        </div>
        {ansatt.aktiv && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            <StatBit ikon="timeliste" tekst={`${fmt(stats.timarUke)} t denne veka`} />
            {stats.ventarOppg > 0 && <StatBit ikon="oppgaver" tekst={`${stats.ventarOppg} oppgåve${stats.ventarOppg > 1 ? 'r' : ''}`} />}
            <StatBit ikon="vaktplan" tekst={stats.nesteVakt ? `Neste: ${stats.nesteVakt}` : 'Inga vakt planlagt'} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flex: 'none', flexWrap: 'wrap' }}>
        {ansatt.aktiv ? (
          <>
            <button onClick={onProfil} style={{ ...btnStyle, background: 'var(--brand-soft)', color: 'var(--brand-strong)', borderColor: 'var(--brand-soft)' }}>Profil</button>
            <button onClick={onEdit} style={btnStyle}>Endre</button>
            <button onClick={onResetPin} style={btnStyle}>Nullstill PIN</button>
            <button onClick={onToggleAktiv} style={{ ...btnStyle, color: 'var(--danger)' }}>Deaktiver</button>
          </>
        ) : (
          <>
            <button onClick={onProfil} style={btnStyle}>Profil</button>
            <button onClick={onToggleAktiv} style={btnStyle}>Reaktiver</button>
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '8px 12px', background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 10, fontFamily: "'Geist'", fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
} as const;

export function Ansatte() {
  const { ansatte, alleAnsatte, setAktiv } = useAnsatte();
  const { entries, tasks, shifts } = useAppData();
  const [modalAnsatt, setModalAnsatt] = useState<Employee | undefined | 'new'>(undefined);
  const [pinAnsatt, setPinAnsatt] = useState<Employee | null>(null);
  const [profilAnsatt, setProfilAnsatt] = useState<Employee | null>(null);
  const [visInaktive, setVisInaktive] = useState(false);

  const inaktive = alleAnsatte.filter((a) => !a.aktiv);

  const t = today();
  const weekDays = weekDates(mondayOf(t));
  const statsFor = (id: string): AnsattStats => {
    const timarUke = entries.filter((e) => e.ansatt === id && weekDays.includes(e.date)).reduce((acc, e) => acc + timar(e), 0);
    const ventarOppg = tasks.filter((x) => x.ansatt === id && !x.ferdig).length;
    const neste = shifts.filter((s) => s.ansatt === id && s.date >= t).slice().sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    const nesteVakt = neste ? `${UKE_KORT[weekdayIdx(neste.date)]} ${neste.start}–${neste.slutt}` : null;
    return { timarUke, ventarOppg, nesteVakt };
  };

  const deaktiver = (a: Employee) => {
    if (window.confirm(`Deaktivere ${a.navn}? Dei mistar tilgang til appen, men historikk blir teken vare på. Du kan reaktivere seinare.`)) {
      setAktiv(a.id, false);
    }
  };

  if (profilAnsatt) {
    return (
      <>
        <AnsattProfil
          ansatt={profilAnsatt}
          onBack={() => setProfilAnsatt(null)}
          onEdit={() => setModalAnsatt(profilAnsatt)}
          onResetPin={() => setPinAnsatt(profilAnsatt)}
        />
        {modalAnsatt !== undefined && (
          <AnsattModal existing={modalAnsatt === 'new' ? undefined : modalAnsatt} onClose={() => setModalAnsatt(undefined)} />
        )}
        {pinAnsatt && <ResetPinModal ansatt={pinAnsatt} onClose={() => setPinAnsatt(null)} />}
      </>
    );
  }

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 22 }}>Ansatte</h1>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Administrer ansatte, roller og tilgangsnivå</div>
        </div>
        <button
          onClick={() => setModalAnsatt('new')}
          style={{
            padding: '11px 18px', background: 'var(--brand)', color: '#fff', border: 'none',
            borderRadius: 12, fontFamily: "'Geist'", fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Ny ansatt
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ansatte.map((a) => (
          <AnsattCard
            key={a.id}
            ansatt={a}
            stats={statsFor(a.id)}
            onProfil={() => setProfilAnsatt(a)}
            onEdit={() => setModalAnsatt(a)}
            onResetPin={() => setPinAnsatt(a)}
            onToggleAktiv={() => deaktiver(a)}
          />
        ))}
      </div>

      {inaktive.length > 0 && (
        <div>
          <button
            onClick={() => setVisInaktive((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', padding: '6px 0' }}
          >
            {visInaktive ? '▾' : '▸'} Inaktive ansatte ({inaktive.length})
          </button>
          {visInaktive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {inaktive.map((a) => (
                <AnsattCard
                  key={a.id}
                  ansatt={a}
                  stats={statsFor(a.id)}
                  onProfil={() => setProfilAnsatt(a)}
                  onEdit={() => setModalAnsatt(a)}
                  onResetPin={() => setPinAnsatt(a)}
                  onToggleAktiv={() => setAktiv(a.id, true)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {modalAnsatt !== undefined && (
        <AnsattModal existing={modalAnsatt === 'new' ? undefined : modalAnsatt} onClose={() => setModalAnsatt(undefined)} />
      )}
      {pinAnsatt && <ResetPinModal ansatt={pinAnsatt} onClose={() => setPinAnsatt(null)} />}
    </div>
  );
}
