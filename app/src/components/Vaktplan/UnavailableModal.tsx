import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { fullDatoTekst } from '../../lib/dates';
import type { EmployeeId } from '../../constants';
import type { Unavailable } from '../../types';

export function UnavailableModal({
  ansatt, dato, existing, onClose,
}: {
  ansatt: EmployeeId;
  dato: string;
  existing?: Unavailable;
  onClose: () => void;
}) {
  const { saveUnavailable, removeUnavailable } = useAppData();
  const [grunn, setGrunn] = useState(existing?.grunn || '');

  const save = async () => {
    await saveUnavailable(ansatt, dato, grunn);
    onClose();
  };
  const fjern = async () => {
    if (existing) await removeUnavailable(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Raud dag' : 'Kan ikkje jobbe'}
      subtitle={fullDatoTekst(dato)}
      footer={
        <>
          {existing && <DeleteButton onClick={fjern}>Fjern markering</DeleteButton>}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <Field label="Grunn (valfritt)">
        <input
          value={grunn}
          onChange={(e) => setGrunn(e.target.value)}
          placeholder="t.d. ferie, legetime, skule…"
          autoFocus
          style={inputStyle}
        />
      </Field>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Dagen blir merka raud på vaktplanen, så det er synleg at du ikkje kan jobbe.
      </div>
    </Modal>
  );
}
