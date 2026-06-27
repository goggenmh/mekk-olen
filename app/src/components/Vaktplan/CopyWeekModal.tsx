import { useState } from 'react';
import { Modal, Field, monoInputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { addDays, isoWeek } from '../../lib/dates';
import type { Shift } from '../../types';

export function CopyWeekModal({
  weekStart,
  shifts,
  onClose,
}: {
  weekStart: string;
  shifts: Shift[];
  onClose: () => void;
}) {
  const { addShifts } = useAppData();
  const [antallVeker, setAntallVeker] = useState(1);
  const [lagrar, setLagrar] = useState(false);

  const save = async () => {
    if (shifts.length === 0) return;
    setLagrar(true);
    try {
      const rows = Array.from({ length: antallVeker }, (_, w) =>
        shifts.map((s) => ({
          ansatt: s.ansatt, date: addDays(s.date, (w + 1) * 7), start: s.start, slutt: s.slutt, skift: s.skift,
        }))
      ).flat();
      await addShifts(rows);
      onClose();
    } finally {
      setLagrar(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Kopier vakter"
      subtitle={`Frå veke ${isoWeek(weekStart)}`}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} children={lagrar ? 'Kopierer…' : 'Kopier'} />
        </>
      }
    >
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Kopierer alle {shifts.length} vakter i denne veka til dei neste veka(ne) du vel under. Vakter som allerede finst på samme dato/tid blir ikkje duplisert.
      </div>
      <Field label="Antall veker framover">
        <input
          type="number"
          min={1}
          max={26}
          value={antallVeker}
          onChange={(e) => setAntallVeker(Math.min(26, Math.max(1, Number(e.target.value) || 1)))}
          style={monoInputStyle}
        />
      </Field>
    </Modal>
  );
}
