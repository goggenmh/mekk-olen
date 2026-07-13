import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { SKIFT_VALG } from '../../constants';
import { dur, fmt, mins, addDays } from '../../lib/dates';
import type { Shift } from '../../types';

export function ShiftModal({
  target,
  onClose,
}: {
  target: { date: string; shift?: Shift };
  onClose: () => void;
}) {
  const { saveShift, deleteShift, addShifts } = useAppData();
  const { ansatte } = useAnsatte();
  const existing = target.shift;

  const [ansatt, setAnsatt] = useState<Shift['ansatt']>(existing?.ansatt || ansatte[0]?.id || '');
  const [start, setStart] = useState(existing?.start || '09:00');
  const [slutt, setSlutt] = useState(existing?.slutt || '17:00');
  const [skift, setSkift] = useState(existing?.skift || SKIFT_VALG[0]);
  const [feil, setFeil] = useState(false);
  const [gjenta, setGjenta] = useState(false);
  const [antallVeker, setAntallVeker] = useState(4);

  const varar = mins(slutt) > mins(start) ? `${fmt(dur(start, slutt))} t` : '–';

  const save = async () => {
    if (mins(slutt) <= mins(start)) { setFeil(true); return; }
    if (!existing && gjenta && antallVeker > 1) {
      const rows = Array.from({ length: antallVeker }, (_, i) => ({
        ansatt, date: addDays(target.date, i * 7), start, slutt, skift,
      }));
      await addShifts(rows);
    } else {
      await saveShift({ id: existing?.id, ansatt, date: target.date, start, slutt, skift });
    }
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
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Slutt må vere etter start.</div>}
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Varer: <strong style={{ color: 'var(--text)' }}>{varar}</strong></div>

      {!existing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={gjenta} onChange={(e) => setGjenta(e.target.checked)} />
            Gjenta same vakt vekentlig (fast vakt)
          </label>
          {gjenta && (
            <Field label="Antall veker (inkl. denne)">
              <input
                type="number"
                min={2}
                max={52}
                value={antallVeker}
                onChange={(e) => setAntallVeker(Math.min(52, Math.max(2, Number(e.target.value) || 2)))}
                style={monoInputStyle}
              />
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}
