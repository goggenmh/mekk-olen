import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { ANSATTE, findAnsatt } from '../../constants';
import { UKE_FULL, weekdayIdx, parseDate, pad } from '../../lib/dates';
import type { Shift } from '../../types';

export function SwapModal({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const { createSwap } = useAppData();
  const valg = ANSATTE.filter((a) => a.id !== shift.ansatt);
  const [til, setTil] = useState(valg[0]?.id || shift.ansatt);

  const d = parseDate(shift.date);
  const wi = weekdayIdx(shift.date);
  const dag = `${UKE_FULL[wi]} ${d.getDate()}.${pad(d.getMonth() + 1)}`;
  const tid = `${shift.start}–${shift.slutt}`;
  const fra = findAnsatt(shift.ansatt);

  const save = async () => {
    await createSwap({ shiftId: shift.id, fra: shift.ansatt, til, dag, tid });
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Bytt vakt"
      subtitle={`${dag} · ${tid}`}
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={save}>Send bytteønske</SaveButton></>}
    >
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Frå: <strong style={{ color: 'var(--text)' }}>{fra.navn}</strong></div>
      <Field label="Bytt til">
        <select value={til} onChange={(e) => setTil(e.target.value as Shift['ansatt'])} style={inputStyle}>
          {valg.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
        </select>
      </Field>
    </Modal>
  );
}
