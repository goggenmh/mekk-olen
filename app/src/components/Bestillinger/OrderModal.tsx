import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { ORDER_FLOW, ORDER_STATUS } from '../../constants';
import { today } from '../../lib/dates';
import type { Order } from '../../types';

export function OrderModal({ existing, onClose }: { existing?: Order; onClose: () => void }) {
  const { saveOrder, deleteOrder } = useAppData();

  const [kunde, setKunde] = useState(existing?.kunde || '');
  const [telefon, setTelefon] = useState(existing?.telefon || '');
  const [vare, setVare] = useState(existing?.vare || '');
  const [leverandor, setLeverandor] = useState(existing?.leverandor || '');
  const [varenr, setVarenr] = useState(existing?.varenr || '');
  const [dato, setDato] = useState(existing?.dato || today());
  const [antal, setAntal] = useState(existing?.antal ?? 1);
  const [status, setStatus] = useState(existing?.status || ORDER_FLOW[0]);
  const [feil, setFeil] = useState(false);

  const save = async () => {
    if (!kunde.trim()) { setFeil(true); return; }
    await saveOrder({ id: existing?.id, kunde, telefon, vare, leverandor, varenr, dato, antal, status, varsla: existing?.varsla ?? null });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteOrder(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre bestilling' : 'Ny bestilling'}
      maxWidth={460}
      footer={
        <>
          {existing && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Kunde">
          <input value={kunde} onChange={(e) => { setKunde(e.target.value); setFeil(false); }} style={inputStyle} />
        </Field>
        <Field label="Telefon">
          <input value={telefon} onChange={(e) => setTelefon(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn kundenamn.</div>}
      <Field label="Vare">
        <input value={vare} onChange={(e) => setVare(e.target.value)} style={inputStyle} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Leverandør">
          <input value={leverandor} onChange={(e) => setLeverandor(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Varenr">
          <input value={varenr} onChange={(e) => setVarenr(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Dato">
          <input type="date" value={dato} onChange={(e) => setDato(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Antal">
          <input type="number" min={1} value={antal} onChange={(e) => setAntal(Number(e.target.value))} style={inputStyle} />
        </Field>
      </div>
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
          {ORDER_FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].tekst}</option>)}
        </select>
      </Field>
    </Modal>
  );
}
