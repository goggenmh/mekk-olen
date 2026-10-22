import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import type { Task } from '../../types';

/** «Treng hjelp»: merk oppgåva som blokkert og skriv kvifor. Leiar får varsel. */
export function BlokkerModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { blockTask } = useAppData();
  const [grunn, setGrunn] = useState(task.blokkertGrunn);
  const [feil, setFeil] = useState(false);

  const lagre = async () => {
    if (!grunn.trim()) { setFeil(true); return; }
    await blockTask(task, grunn);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Treng hjelp"
      subtitle={task.tittel}
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={lagre}>Merk som blokkert</SaveButton></>}
    >
      <Field label="Kvifor kan ikkje oppgåva fullførast?">
        <textarea
          autoFocus
          value={grunn}
          onChange={(e) => { setGrunn(e.target.value); setFeil(false); }}
          placeholder="T.d. «Varene har ikkje kome» eller «Manglar nøkkel til lageret»"
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv kort kvifor, så leiaren veit korleis hen kan hjelpe.</div>}
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dagleg leiar får eit varsel. Oppgåva står på deg til ho er løyst.</div>
    </Modal>
  );
}
