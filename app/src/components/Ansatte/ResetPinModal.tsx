import { useState } from 'react';
import { Modal, Field, monoInputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAnsatte } from '../../context/AnsatteContext';
import type { Employee } from '../../constants';

export function ResetPinModal({ ansatt, onClose }: { ansatt: Employee; onClose: () => void }) {
  const { resetPin } = useAnsatte();
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState('');
  const [lagrar, setLagrar] = useState(false);

  const save = async () => {
    if (pin.length !== 4) { setFeil('PIN må vere 4 siffer.'); return; }
    setLagrar(true);
    try {
      await resetPin(ansatt.id, pin);
      onClose();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noko gjekk feil.');
    } finally {
      setLagrar(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Nullstill PIN"
      subtitle={ansatt.navn}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save}>{lagrar ? 'Lagrar…' : 'Lagre'}</SaveButton>
        </>
      }
    >
      <Field label="Ny PIN (4 siffer)">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={monoInputStyle}
          placeholder="1234"
          inputMode="numeric"
        />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
    </Modal>
  );
}
