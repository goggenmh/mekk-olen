import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { datoIntervall, talDagar } from '../../lib/dates';
import type { EmployeeId } from '../../constants';
import type { Unavailable } from '../../types';

/**
 * «Kan ikkje jobbe» (raud dag) for éin eller fleire dagar på rad.
 * `existing` = dagane i ein periode som blir endra/fjerna.
 * Tilsette merkar eigne dagar; leiarar kan velje tilsett.
 */
export function UnavailableModal({
  ansatt: startAnsatt, dato, existing, onClose,
}: {
  ansatt?: EmployeeId;
  dato: string;
  existing?: Unavailable[];
  onClose: () => void;
}) {
  const { saveUnavailablePeriode, removeUnavailableMange, canApprove } = useAppData();
  const { ansatte } = useAnsatte();
  const { user } = useAuth();
  const leiar = canApprove(user?.id);
  const finst = existing && existing.length > 0;
  const datoar = (existing || []).map((u) => u.dato).sort();

  const [ansatt, setAnsatt] = useState<EmployeeId>(existing?.[0]?.ansatt || startAnsatt || user?.id || '');
  const [fra, setFra] = useState(datoar[0] || dato);
  const [til, setTil] = useState(datoar[datoar.length - 1] || dato);
  const [grunn, setGrunn] = useState(existing?.[0]?.grunn || '');
  const [feil, setFeil] = useState<string | null>(null);
  // Andre sine raude dagar kan berre leiarar endre.
  const kanEndre = !finst || leiar || existing![0].ansatt === user?.id;

  const save = async () => {
    if (!fra || !til) { setFeil('Vel både frå- og til-dato.'); return; }
    if (til < fra) { setFeil('Til-dato må vere same dag eller etter frå-dato.'); return; }
    if (talDagar(fra, til) > 62) { setFeil('Maks 62 dagar om gongen. Lengre fråvær kan registrerast som ferie/fri.'); return; }
    await saveUnavailablePeriode(ansatt, fra, til, grunn, existing);
    onClose();
  };
  const fjern = async () => {
    if (existing) await removeUnavailableMange(existing.map((u) => u.id));
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={finst ? 'Raud dag' : 'Kan ikkje jobbe'}
      subtitle={finst ? datoIntervall(datoar[0], datoar[datoar.length - 1]) : undefined}
      footer={
        kanEndre ? (
          <>
            {finst && <DeleteButton onClick={fjern}>Fjern markering</DeleteButton>}
            <CancelButton onClick={onClose} />
            <SaveButton onClick={save} />
          </>
        ) : <CancelButton onClick={onClose}>Lukk</CancelButton>
      }
    >
      {leiar && !finst && (
        <Field label="Tilsett">
          <select value={ansatt} onChange={(e) => setAnsatt(e.target.value)} style={inputStyle}>
            {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        </Field>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Frå">
          <input type="date" value={fra} disabled={!kanEndre} onChange={(e) => { setFra(e.target.value); if (til < e.target.value) setTil(e.target.value); setFeil(null); }} style={inputStyle} />
        </Field>
        <Field label="Til">
          <input type="date" value={til} min={fra} disabled={!kanEndre} onChange={(e) => { setTil(e.target.value); setFeil(null); }} style={inputStyle} />
        </Field>
      </div>
      <Field label="Grunn (valfritt)">
        <input
          value={grunn}
          disabled={!kanEndre}
          onChange={(e) => setGrunn(e.target.value)}
          placeholder="t.d. legetime, skule, eksamen…"
          autoFocus={kanEndre}
          style={inputStyle}
        />
      </Field>
      {feil && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>{feil}</div>}
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Dagane blir merka raude på vaktplanen og i Ferie &amp; fri, så det er synleg at {ansatt === user?.id ? 'du' : 'den tilsette'} ikkje kan jobbe. Dette er ikkje ein søknad om fri.
      </div>
    </Modal>
  );
}
