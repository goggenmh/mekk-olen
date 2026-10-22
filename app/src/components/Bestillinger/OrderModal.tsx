import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { ORDER_FLOW, ORDER_STATUS } from '../../constants';
import { today } from '../../lib/dates';
import type { Order } from '../../types';
import { storeOrd, storFyrste } from '../../lib/tekst';

export function OrderModal({ existing, onClose }: { existing?: Order; onClose: () => void }) {
  const { saveOrder, deleteOrder } = useAppData();
  const { findAnsatt } = useAnsatte();
  const funnen = existing?.registrertAv ? findAnsatt(existing.registrertAv) : null;
  const lagtInnAv = funnen?.navn ? funnen : null;

  const [kunde, setKunde] = useState(existing?.kunde || '');
  const [telefon, setTelefon] = useState(existing?.telefon || '');
  const [vare, setVare] = useState(existing?.vare || '');
  const [leverandor, setLeverandor] = useState(existing?.leverandor || '');
  const [varenr, setVarenr] = useState(existing?.varenr || '');
  const [lenke, setLenke] = useState(existing?.lenke || '');
  const [dato, setDato] = useState(existing?.dato || today());
  const [antal, setAntal] = useState(existing?.antal ?? 1);
  const [status, setStatus] = useState(existing?.status || ORDER_FLOW[0]);
  const [notat, setNotat] = useState(existing?.notat || '');
  const [feil, setFeil] = useState(false);

  const save = async () => {
    if (!kunde.trim()) { setFeil(true); return; }
    await saveOrder({ id: existing?.id, kunde: storeOrd(kunde.trim()), telefon, vare: storFyrste(vare.trim()), leverandor: storFyrste(leverandor.trim()), varenr, lenke: lenke.trim() || null, dato, antal, status, notat: storFyrste(notat.trim()), varsla: existing?.varsla ?? null });
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
      {lagtInnAv && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Lagt inn av <b style={{ color: 'var(--text-secondary)' }}>{lagtInnAv.navn}</b></div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Kunde">
          <input value={kunde} onChange={(e) => { setKunde(e.target.value); setFeil(false); }} onBlur={() => setKunde(storeOrd)} autoCapitalize="words" placeholder="Namn" autoComplete="off" style={inputStyle} />
        </Field>
        <Field label="Telefon">
          <input type="tel" inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="For SMS når varen er komen" style={inputStyle} />
        </Field>
      </div>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn kundenamn.</div>}
      <Field label="Notat">
        <input value={notat} onChange={(e) => setNotat(e.target.value)} onBlur={() => setNotat(storFyrste)} autoCapitalize="sentences" placeholder="T.d. «liten fyr med lue», ønskjer å bli ringt" style={inputStyle} />
      </Field>
      <Field label="Vare">
        <input value={vare} onChange={(e) => setVare(e.target.value)} onBlur={() => setVare(storFyrste)} autoCapitalize="sentences" style={inputStyle} />
      </Field>
      <Field label="Lenke til produkt">
        <input value={lenke} autoCapitalize="off" onChange={(e) => setLenke(e.target.value)} placeholder="https://…" style={inputStyle} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Leverandør">
          <input value={leverandor} onChange={(e) => setLeverandor(e.target.value)} onBlur={() => setLeverandor(storFyrste)} autoCapitalize="sentences" style={inputStyle} />
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
