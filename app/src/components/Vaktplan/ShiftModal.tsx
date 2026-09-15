import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { SKIFT_FARGE } from '../../constants';
import { dur, fmt, mins, skiftFraTid } from '../../lib/dates';
import type { Shift } from '../../types';

export function ShiftModal({
  target,
  onClose,
}: {
  target: { date: string; shift?: Shift };
  onClose: () => void;
}) {
  const { saveShift, deleteShift } = useAppData();
  const { ansatte } = useAnsatte();
  const existing = target.shift;

  const [ansatt, setAnsatt] = useState<Shift['ansatt']>(existing?.ansatt || ansatte[0]?.id || '');
  const [start, setStart] = useState(existing?.start || '09:00');
  const [slutt, setSlutt] = useState(existing?.slutt || '17:00');
  const [feil, setFeil] = useState(false);

  const gyldig = mins(slutt) > mins(start);
  const varar = gyldig ? `${fmt(dur(start, slutt))} t` : '–';
  // Skifttype blir sett automatisk ut frå tida (og dagen).
  const skift = gyldig ? skiftFraTid(start, slutt, target.date) : (existing?.skift || 'Formiddag');
  const skiftFarge = SKIFT_FARGE[skift] || 'var(--brand)';

  const save = async () => {
    if (!gyldig) { setFeil(true); return; }
    await saveShift({ id: existing?.id, ansatt, date: target.date, start, slutt, skift });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteShift(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre vakt' : 'Ny vakt'}
      subtitle={target.date}
      footer={
        <>
          {existing && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <Field label="Tilsett">
        <select value={ansatt} onChange={(e) => setAnsatt(e.target.value as Shift['ansatt'])} style={inputStyle}>
          {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Start">
          <input type="time" value={start} onChange={(e) => { setStart(e.target.value); setFeil(false); }} style={monoInputStyle} />
        </Field>
        <Field label="Slutt">
          <input type="time" value={slutt} onChange={(e) => { setSlutt(e.target.value); setFeil(false); }} style={monoInputStyle} />
        </Field>
      </div>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Slutt må vere etter start.</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--text-label)' }}>Skift</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: skiftFarge }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: skiftFarge }} />
          {skift}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>Varer <strong style={{ color: 'var(--text)' }}>{varar}</strong></span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Skifttypen blir sett automatisk ut frå klokkeslettet.</div>
    </Modal>
  );
}
