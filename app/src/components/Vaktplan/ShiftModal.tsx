import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { ANSATTE, SKIFT_VALG } from '../../constants';
import { dur, fmt, mins } from '../../lib/dates';
import type { Shift } from '../../types';

export function ShiftModal({
  target,
  onClose,
}: {
  target: { date: string; shift?: Shift };
  onClose: () => void;
}) {
  const { saveShift, deleteShift } = useAppData();
  const existing = target.shift;

  const [ansatt, setAnsatt] = useState<Shift['ansatt']>(existing?.ansatt || ANSATTE[0].id);
  const [start, setStart] = useState(existing?.start || '09:00');
  const [slutt, setSlutt] = useState(existing?.slutt || '17:00');
  const [skift, setSkift] = useState(existing?.skift || SKIFT_VALG[0]);
  const [feil, setFeil] = useState(false);

  const varar = mins(slutt) > mins(start) ? `${fmt(dur(start, slutt))} t` : '–';

  const save = async () => {
    if (mins(slutt) <= mins(start)) { setFeil(true); return; }
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
          {ANSATTE.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
        </select>
      </Field>
      <Field label="Skifttype">
        <select value={skift} onChange={(e) => setSkift(e.target.value)} style={inputStyle}>
          {SKIFT_VALG.map((s) => <option key={s} value={s}>{s}</option>)}
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
      {feil && <div style={{ fontSize: 13, color: '#c0392b', fontWeight: 600 }}>Slutt må vere etter start.</div>}
      <div style={{ fontSize: 13, color: '#7e93a0' }}>Varer: <strong style={{ color: '#142029' }}>{varar}</strong></div>
    </Modal>
  );
}
