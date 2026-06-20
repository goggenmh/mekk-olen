import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { ANSATTE, PRIORITET, type Prioritet } from '../../constants';
import type { Task } from '../../types';

export function TaskModal({ existing, defaultAnsatt, onClose }: { existing?: Task; defaultAnsatt?: Task['ansatt']; onClose: () => void }) {
  const { saveTask, deleteTask } = useAppData();

  const [tittel, setTittel] = useState(existing?.tittel || '');
  const [detalj, setDetalj] = useState(existing?.detalj || '');
  const [prioritet, setPrioritet] = useState<Prioritet>((existing?.prioritet as Prioritet) || 'medium');
  const [ansatt, setAnsatt] = useState<Task['ansatt']>(existing?.ansatt || defaultAnsatt || 'ufordelt');
  const [feil, setFeil] = useState(false);

  const save = async () => {
    if (!tittel.trim()) { setFeil(true); return; }
    await saveTask({ id: existing?.id, tittel, detalj, prioritet, ansatt });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteTask(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre oppgåve' : 'Ny oppgåve'}
      footer={
        <>
          {existing && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <Field label="Tittel">
        <input value={tittel} onChange={(e) => { setTittel(e.target.value); setFeil(false); }} style={inputStyle} />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn ein tittel.</div>}
      <Field label="Detaljer">
        <textarea value={detalj} onChange={(e) => setDetalj(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Prioritet">
          <select value={prioritet} onChange={(e) => setPrioritet(e.target.value as Prioritet)} style={inputStyle}>
            {Object.entries(PRIORITET).map(([k, v]) => <option key={k} value={k}>{v.tekst}</option>)}
          </select>
        </Field>
        <Field label="Tildelt">
          <select value={ansatt} onChange={(e) => setAnsatt(e.target.value as Task['ansatt'])} style={inputStyle}>
            <option value="ufordelt">Ufordelt</option>
            {ANSATTE.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
