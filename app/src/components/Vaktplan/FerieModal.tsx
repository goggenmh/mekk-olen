import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { ANSATTE, FERIE_TYPER } from '../../constants';
import type { Ferie } from '../../types';

export function FerieModal({ existing, onClose }: { existing?: Ferie; onClose: () => void }) {
  const { saveFerie, deleteFerie } = useAppData();

  const [ansatt, setAnsatt] = useState<Ferie['ansatt']>(existing?.ansatt || ANSATTE[0].id);
  const [type, setType] = useState(existing?.type || FERIE_TYPER[0]);
  const [tekst, setTekst] = useState(existing?.tekst || '');
  const [feil, setFeil] = useState(false);

  const save = async () => {
    if (!tekst.trim()) { setFeil(true); return; }
    await saveFerie({ id: existing?.id, ansatt, type, tekst });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteFerie(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre ferie/fri' : 'Ny ferie/fri'}
      footer={
        <>
          {existing && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <Field label="Tilsett">
        <select value={ansatt} onChange={(e) => setAnsatt(e.target.value as Ferie['ansatt'])} style={inputStyle}>
          {ANSATTE.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
        </select>
      </Field>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          {FERIE_TYPER.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Beskrivelse">
        <input value={tekst} onChange={(e) => { setTekst(e.target.value); setFeil(false); }} style={inputStyle} placeholder="t.d. 14.–18. juli" />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn ein beskrivelse.</div>}
    </Modal>
  );
}
