import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { DOC_KATEGORIER } from '../../constants';
import { today } from '../../lib/dates';
import type { Doc } from '../../types';

export function DocModal({ existing, onClose }: { existing?: Doc; onClose: () => void }) {
  const { saveDoc, deleteDoc, uploadDocFile } = useAppData();

  const [tittel, setTittel] = useState(existing?.tittel || '');
  const [kategori, setKategori] = useState(existing?.kategori || 'Rutine');
  const [notat, setNotat] = useState(existing?.notat || '');
  const [dato, setDato] = useState(existing?.dato || today());
  const [feil, setFeil] = useState(false);
  const [fil, setFil] = useState<File | null>(null);
  const [filUrl, setFilUrl] = useState(existing?.fil_url || null);
  const [filNamn, setFilNamn] = useState(existing?.fil_namn || null);
  const [lasterOpp, setLasterOpp] = useState(false);

  const save = async () => {
    if (!tittel.trim()) { setFeil(true); return; }
    let url = filUrl;
    let namn = filNamn;
    if (fil) {
      setLasterOpp(true);
      try {
        const opplasta = await uploadDocFile(fil);
        url = opplasta.url;
        namn = opplasta.namn;
      } finally {
        setLasterOpp(false);
      }
    }
    await saveDoc({ id: existing?.id, tittel, kategori, notat, dato, fil_url: url, fil_namn: namn });
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
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn ein tittel.</div>}
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
      <Field label="Filvedlegg">
        {filNamn && !fil && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
            {filUrl ? <a href={filUrl} target="_blank" rel="noreferrer">{filNamn}</a> : <span>{filNamn}</span>}
            <button
              type="button"
              onClick={() => { setFilUrl(null); setFilNamn(null); }}
              style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}
            >
              Fjern
            </button>
          </div>
        )}
        <input type="file" onChange={(e) => setFil(e.target.files?.[0] || null)} style={inputStyle} />
        {lasterOpp && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Laster opp fil…</div>}
      </Field>
    </Modal>
  );
}
