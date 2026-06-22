import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAnsatte } from '../../context/AnsatteContext';
import type { Employee } from '../../constants';

const FARGAR = ['#11788a', '#e08a1e', '#2f9e6f', '#6a5acd', '#c0392b', '#b07b1a', '#9aa4b2', '#1d6fa5'];

export function AnsattModal({ existing, onClose }: { existing?: Employee; onClose: () => void }) {
  const { createAnsatt, updateAnsatt } = useAnsatte();

  const [navn, setNavn] = useState(existing?.navn || '');
  const [rolle, setRolle] = useState(existing?.rolle || '');
  const [telefon, setTelefon] = useState(existing?.telefon || '');
  const [farge, setFarge] = useState(existing?.farge || FARGAR[0]);
  const [lonn, setLonn] = useState<'fast' | 'time'>(existing?.lonn || 'time');
  const [sats, setSats] = useState(existing?.sats || 0);
  const [leder, setLeder] = useState(existing?.leder || false);
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState('');
  const [lagrar, setLagrar] = useState(false);

  const init = navn.trim().slice(0, 2).toUpperCase() || '?';

  const save = async () => {
    if (!navn.trim()) { setFeil('Skriv inn navn.'); return; }
    if (!existing && pin.length !== 4) { setFeil('PIN må vere 4 siffer.'); return; }
    setLagrar(true);
    setFeil('');
    try {
      if (existing) {
        await updateAnsatt(existing.id, { navn: navn.trim(), rolle, telefon, farge, lonn, sats, leder, init });
      } else {
        await createAnsatt({ navn: navn.trim(), rolle, telefon, farge, lonn, sats, init, leder, pin });
      }
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
      title={existing ? 'Endre ansatt' : 'Ny ansatt'}
      subtitle={existing ? existing.email : 'Lagar ny innlogging i Supabase Auth'}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save}>{lagrar ? 'Lagrar…' : 'Lagre'}</SaveButton>
        </>
      }
    >
      <Field label="Namn">
        <input value={navn} onChange={(e) => setNavn(e.target.value)} style={inputStyle} placeholder="t.d. Kari Nilsen" />
      </Field>
      <Field label="Rolle">
        <input value={rolle} onChange={(e) => setRolle(e.target.value)} style={inputStyle} placeholder="t.d. Selgar" />
      </Field>
      <Field label="Telefon">
        <input value={telefon} onChange={(e) => setTelefon(e.target.value)} style={monoInputStyle} placeholder="t.d. 901 23 456" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Lønstype">
          <select value={lonn} onChange={(e) => setLonn(e.target.value as 'fast' | 'time')} style={inputStyle}>
            <option value="time">Timeløn</option>
            <option value="fast">Fastløn</option>
          </select>
        </Field>
        <Field label={lonn === 'time' ? 'Sats (kr/t)' : 'Sats'}>
          <input type="number" min={0} value={sats} onChange={(e) => setSats(Number(e.target.value))} style={monoInputStyle} />
        </Field>
      </div>
      <Field label="Farge">
        <div style={{ display: 'flex', gap: 8 }}>
          {FARGAR.map((f) => (
            <button
              key={f}
              onClick={() => setFarge(f)}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: f, cursor: 'pointer',
                border: farge === f ? '3px solid var(--text)' : '1px solid var(--border)',
              }}
            />
          ))}
        </div>
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={leder} onChange={(e) => setLeder(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Tilgangsnivå: leiar (ser administrasjon, godkjenner alltid)</span>
      </label>
      {!existing && (
        <Field label="PIN (4 siffer) — brukt til innlogging">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={monoInputStyle}
            placeholder="1234"
            inputMode="numeric"
          />
        </Field>
      )}
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
    </Modal>
  );
}
