import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { DOC_KATEGORIER } from '../../constants';
import { today } from '../../lib/dates';
import type { Doc } from '../../types';

export function DocModal({ existing, onClose }: { existing?: Doc; onClose: () => void }) {
  const { saveDoc, deleteDoc } = useAppData();

  const [tittel, setTittel] = useState(existing?.tittel || '');
  const [kategori, setKategori] = useState(existing?.kategori || 'Rutine');
  const [notat, setNotat] = useState(existing?.notat || '');
  const [dato, setDato] = useState(existing?.dato || today());
  const [feil, setFeil] = useState(false);

  const save = async () => {
    if (!tittel.trim()) { setFeil(true); return; }
    await saveDoc({ id: existing?.id, tittel, kategori, notat, dato });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteDoc(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre dokument' : 'Nytt dokument'}
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
      {feil && <div style={{ fontSize: 13, color: '#c0392b', fontWeight: 600 }}>Skriv inn ein tittel.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Kategori">
          <select value={kategori} onChange={(e) => setKategori(e.target.value)} style={inputStyle}>
            {DOC_KATEGORIER.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Dato">
          <input type="date" value={dato} onChange={(e) => setDato(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <Field label="Notat">
        <textarea value={notat} onChange={(e) => setNotat(e.target.value)} style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} />
      </Field>
    </Modal>
  );
}
