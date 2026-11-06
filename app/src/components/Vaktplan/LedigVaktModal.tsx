import { useState } from 'react';
import { Modal, Field, CancelButton, SaveButton } from '../ui/Modal';
import { inputStyle } from '../ui/modalStyles';
import { useAppData } from '../../context/appData';
import { useAuth } from '../../context/auth';
import { today } from '../../lib/dates';

const SKIFT = ['Formiddag', 'Kveld', 'Heildag', 'Laurdag'];

// Legg ut ei ledig vakt på vaktbørsen. Leiar fyller inn dato og tid; den fyrste
// tilsette som trykkjer «Eg tek henne» får ho (med godkjenning).
export function LedigVaktModal({ forhand, onClose }: { forhand?: { date?: string }; onClose: () => void }) {
  const { leggUtLedigVakt } = useAppData();
  const { user } = useAuth();
  const [date, setDate] = useState(forhand?.date || today());
  const [start, setStart] = useState('09:00');
  const [slutt, setSlutt] = useState('15:00');
  const [skift, setSkift] = useState(SKIFT[0]);
  const [grunn, setGrunn] = useState('');
  const [feil, setFeil] = useState(false);
  const [lagrar, setLagrar] = useState(false);

  const lagre = async () => {
    if (lagrar) return;
    if (!date || !start || !slutt || slutt <= start || !user) { setFeil(true); return; }
    setLagrar(true);
    try {
      await leggUtLedigVakt({ date, start, slutt, skift, grunn: grunn.trim() || null, opprettaAv: user.id });
      onClose();
    } catch { setLagrar(false); }
  };

  return (
    <Modal
      onClose={onClose}
      title="Legg ut ledig vakt"
      maxWidth={420}
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={lagre}>Legg ut</SaveButton></>}
    >
      <Field label="Dato">
        <input type="date" value={date} min={today()} onChange={(e) => { setDate(e.target.value); setFeil(false); }} style={inputStyle} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Frå">
          <input type="time" value={start} onChange={(e) => { setStart(e.target.value); setFeil(false); }} style={inputStyle} />
        </Field>
        <Field label="Til">
          <input type="time" value={slutt} onChange={(e) => { setSlutt(e.target.value); setFeil(false); }} style={inputStyle} />
        </Field>
      </div>
      <Field label="Skift">
        <select value={skift} onChange={(e) => setSkift(e.target.value)} style={inputStyle}>
          {SKIFT.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Grunn (valfritt)">
        <input value={grunn} onChange={(e) => setGrunn(e.target.value)} placeholder="T.d. «Kari på kurs»" style={inputStyle} />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Sjekk dato og at slutt er etter start.</div>}
    </Modal>
  );
}
