import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAnsatte } from '../../context/AnsatteContext';

const lagInit = (navn: string) =>
  navn.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';

export function NyKonsernAdminModal({ onClose }: { onClose: () => void }) {
  const { createAnsatt } = useAnsatte();
  const [navn, setNavn] = useState('');
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [lagrar, setLagrar] = useState(false);

  const save = async () => {
    if (lagrar) return;
    if (navn.trim().length < 2) { setFeil('Skriv eit namn.'); return; }
    if (pin.length !== 4) { setFeil('PIN må vere 4 siffer.'); return; }
    setFeil(null);
    setLagrar(true);
    try {
      await createAnsatt({
        navn: navn.trim(), rolle: 'Konsern-admin', lonn: 'time', sats: 0,
        farge: '#0c5a69', init: lagInit(navn), telefon: '',
        leder: false, pin, konsern_admin: true,
      });
      onClose();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noko gjekk feil.');
      setLagrar(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Ny konsern-admin"
      subtitle="Ein leiar som ser alle butikkane, utan eigen butikk"
      maxWidth={420}
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={save}>{lagrar ? 'Opprettar…' : 'Opprett'}</SaveButton></>}
    >
      <Field label="Namn">
        <input value={navn} onChange={(e) => setNavn(e.target.value)} style={inputStyle} placeholder="T.d. Demo Leiar" />
      </Field>
      <Field label="PIN (4 siffer)">
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={monoInputStyle} placeholder="1234" inputMode="numeric" />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loggar inn under «Konsern-leiing» på innloggingsskjermen, og landar rett på denne oversikta.</div>
    </Modal>
  );
}
