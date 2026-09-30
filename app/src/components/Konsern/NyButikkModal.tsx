import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAnsatte } from '../../context/AnsatteContext';

const lagInit = (navn: string) =>
  navn.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';

export function NyButikkModal({ onClose }: { onClose: () => void }) {
  const { createButikk, createAnsatt } = useAnsatte();
  const [namn, setNamn] = useState('MEKK ');
  const [farge, setFarge] = useState('#11788a');
  const [leiarNamn, setLeiarNamn] = useState('');
  const [telefon, setTelefon] = useState('');
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [lagrar, setLagrar] = useState(false);

  const save = async () => {
    if (lagrar) return;
    if (namn.trim().length < 2) { setFeil('Skriv eit butikknamn.'); return; }
    if (leiarNamn.trim().length < 2) { setFeil('Skriv namnet på første leiar.'); return; }
    if (pin.length !== 4) { setFeil('PIN må vere 4 siffer.'); return; }
    setFeil(null);
    setLagrar(true);
    try {
      const butikkId = await createButikk(namn.trim(), farge);
      await createAnsatt({
        navn: leiarNamn.trim(), rolle: 'Butikksjef', lonn: 'time', sats: 0,
        farge: '#3b6ea5', init: lagInit(leiarNamn), telefon: telefon.trim(),
        leder: true, pin, butikk_id: butikkId,
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
      title="Ny butikk"
      subtitle="Opprett butikk og første leiar"
      maxWidth={460}
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={save}>{lagrar ? 'Opprettar…' : 'Opprett butikk'}</SaveButton></>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
        <Field label="Butikknamn">
          <input value={namn} onChange={(e) => setNamn(e.target.value)} style={inputStyle} placeholder="MEKK Bergen" />
        </Field>
        <Field label="Farge">
          <input type="color" value={farge} onChange={(e) => setFarge(e.target.value)} style={{ width: 46, height: 40, border: '1px solid var(--border)', borderRadius: 10, background: 'none', cursor: 'pointer', padding: 2 }} />
        </Field>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-label)', letterSpacing: '0.4px', textTransform: 'uppercase', marginTop: 4 }}>Første leiar</div>
      <Field label="Namn">
        <input value={leiarNamn} onChange={(e) => setLeiarNamn(e.target.value)} style={inputStyle} placeholder="T.d. Kari Nord" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Telefon (valfritt)">
          <input value={telefon} onChange={(e) => setTelefon(e.target.value)} style={inputStyle} inputMode="tel" />
        </Field>
        <Field label="PIN (4 siffer)">
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={monoInputStyle} placeholder="1234" inputMode="numeric" />
        </Field>
      </div>

      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Leiaren loggar inn under den nye butikken med denne PIN-en, og kan sjølv leggje til fleire tilsette.</div>
    </Modal>
  );
}
