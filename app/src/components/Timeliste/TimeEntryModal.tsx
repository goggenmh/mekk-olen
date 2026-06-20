import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { findAnsatt } from '../../constants';
import { dur, fmt, mins } from '../../lib/dates';
import type { TimeEntry } from '../../types';

export function TimeEntryModal({
  target,
  onClose,
}: {
  target: { ansatt: TimeEntry['ansatt']; date: string; entry?: TimeEntry };
  onClose: () => void;
}) {
  const { saveEntry, deleteEntry } = useAppData();
  const existing = target.entry;
  const a = findAnsatt(target.ansatt);

  const [start, setStart] = useState(existing?.start || '09:00');
  const [slutt, setSlutt] = useState(existing?.slutt || '17:00');
  const [pause, setPause] = useState(existing?.pause ?? 30);
  const [status, setStatus] = useState<TimeEntry['status']>(existing?.status || 'venter');
  const [feil, setFeil] = useState(false);

  const varar = mins(slutt) > mins(start) ? fmt(dur(start, slutt) - pause / 60) : '–';

  const save = async () => {
    if (mins(slutt) <= mins(start)) { setFeil(true); return; }
    await saveEntry({ id: existing?.id, ansatt: target.ansatt, date: target.date, start, slutt, pause, status });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteEntry(existing.id);
    onClose();
  };

  const godkjent = status === 'godkjent';

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre timeregistrering' : 'Ny timeregistrering'}
      subtitle={`${a.navn} · ${target.date}`}
      footer={
        <>
          {existing && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Start">
          <input type="time" value={start} onChange={(e) => { setStart(e.target.value); setFeil(false); }} style={monoInputStyle} />
        </Field>
        <Field label="Slutt">
          <input type="time" value={slutt} onChange={(e) => { setSlutt(e.target.value); setFeil(false); }} style={monoInputStyle} />
        </Field>
      </div>
      <Field label="Pause (minutt)">
        <input type="number" min={0} step={5} value={pause} onChange={(e) => setPause(Number(e.target.value))} style={inputStyle} />
      </Field>
      {feil && <div style={{ fontSize: 13, color: '#c0392b', fontWeight: 600 }}>Slutt må vere etter start.</div>}
      <div style={{ fontSize: 13, color: '#7e93a0' }}>Varer: <strong style={{ color: '#142029' }}>{varar} t</strong></div>

      <button
        onClick={() => setStatus(godkjent ? 'venter' : 'godkjent')}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
          border: `1px solid ${godkjent ? '#bfe3cd' : '#e1e8ec'}`, background: godkjent ? '#e8f5ee' : '#f7f9fb',
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${godkjent ? '#2f9e6f' : '#c3ced5'}`, background: godkjent ? '#2f9e6f' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
          {godkjent ? '✓' : ''}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: godkjent ? '#2f9e6f' : '#566570' }}>{godkjent ? 'Godkjent' : 'Ventar på godkjenning'}</span>
      </button>
    </Modal>
  );
}
