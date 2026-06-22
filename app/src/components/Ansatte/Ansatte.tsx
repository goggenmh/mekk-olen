import { useState } from 'react';
import { useAnsatte } from '../../context/AnsatteContext';
import { Avatar } from '../ui/Avatar';
import { Pill } from '../ui/Pill';
import { AnsattModal } from './AnsattModal';
import { ResetPinModal } from './ResetPinModal';
import type { Employee } from '../../constants';

const cardStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
  padding: 16, display: 'flex', alignItems: 'center', gap: 14,
} as const;

function AnsattCard({ ansatt, onEdit, onResetPin, onToggleAktiv }: {
  ansatt: Employee;
  onEdit: () => void;
  onResetPin: () => void;
  onToggleAktiv: () => void;
}) {
  return (
    <div style={{ ...cardStyle, opacity: ansatt.aktiv ? 1 : 0.55 }}>
      <Avatar init={ansatt.init} farge={ansatt.farge} size={44} fontSize={14} />
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{ansatt.navn}</span>
          {ansatt.leder && <Pill label="Leiar" fg="#11788a" bg="var(--brand-soft)" />}
          {!ansatt.aktiv && <Pill label="Inaktiv" fg="#6e7d88" bg="var(--surface-alt)" />}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ansatt.rolle}</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', gap: 12, marginTop: 2 }}>
          {ansatt.telefon && <span>📞 {ansatt.telefon}</span>}
          <span>✉️ {ansatt.email}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
        {ansatt.aktiv ? (
          <>
            <button onClick={onEdit} style={btnStyle}>Endre</button>
            <button onClick={onResetPin} style={btnStyle}>Nullstill PIN</button>
            <button onClick={onToggleAktiv} style={{ ...btnStyle, color: 'var(--danger)' }}>Deaktiver</button>
          </>
        ) : (
          <button onClick={onToggleAktiv} style={btnStyle}>Reaktiver</button>
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
  const [modalAnsatt, setModalAnsatt] = useState<Employee | undefined | 'new'>(undefined);
  const [pinAnsatt, setPinAnsatt] = useState<Employee | null>(null);
  const [visInaktive, setVisInaktive] = useState(false);

  const inaktive = alleAnsatte.filter((a) => !a.aktiv);

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
            onEdit={() => setModalAnsatt(a)}
            onResetPin={() => setPinAnsatt(a)}
            onToggleAktiv={() => setAktiv(a.id, false)}
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
