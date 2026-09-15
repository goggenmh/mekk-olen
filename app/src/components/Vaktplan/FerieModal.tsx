import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { FERIE_TYPER } from '../../constants';
import { today, talDagar } from '../../lib/dates';
import type { Ferie } from '../../types';

export function FerieModal({ existing, onClose }: { existing?: Ferie; onClose: () => void }) {
  const { saveFerie, deleteFerie, canApprove } = useAppData();
  const { ansatte, findAnsatt } = useAnsatte();
  const { user } = useAuth();
  // Kan berre setje ferie for seg sjølv – med mindre ein har delegeringsansvar.
  const kanStyreAlle = canApprove(user?.id);

  const [ansatt, setAnsatt] = useState<Ferie['ansatt']>(existing?.ansatt || (kanStyreAlle ? ansatte[0]?.id : user?.id) || '');
  const [type, setType] = useState(existing?.type || FERIE_TYPER[0]);
  const [fra, setFra] = useState(existing?.fra || today());
  const [til, setTil] = useState(existing?.til || existing?.fra || today());
  const [tekst, setTekst] = useState(existing?.tekst || '');
  const [feil, setFeil] = useState<string | null>(null);

  const dagar = fra && til && til >= fra ? talDagar(fra, til) : 0;

  const save = async () => {
    if (!fra || !til) { setFeil('Vel både frå- og til-dato.'); return; }
    if (til < fra) { setFeil('Til-dato må vere same dag eller etter frå-dato.'); return; }
    // Utan delegeringsansvar blir ferien alltid lagra på deg sjølv.
    const forAnsatt = kanStyreAlle ? ansatt : (user?.id || ansatt);
    await saveFerie({ id: existing?.id, ansatt: forAnsatt, type, tekst, fra, til });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteFerie(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre ferie/fri' : 'Ny ferie/fri'}
      footer={
        <>
          {existing && (kanStyreAlle || existing.ansatt === user?.id) && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <Field label="Tilsett">
        {kanStyreAlle ? (
          <select value={ansatt} onChange={(e) => setAnsatt(e.target.value as Ferie['ansatt'])} style={inputStyle}>
            {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        ) : (
          <input value={findAnsatt(user?.id || '').navn} disabled style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
        )}
      </Field>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          {FERIE_TYPER.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Frå">
          <input type="date" value={fra} onChange={(e) => { setFra(e.target.value); setFeil(null); if (til < e.target.value) setTil(e.target.value); }} style={inputStyle} />
        </Field>
        <Field label="Til">
          <input type="date" value={til} min={fra} onChange={(e) => { setTil(e.target.value); setFeil(null); }} style={inputStyle} />
        </Field>
      </div>
      {dagar > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{dagar} {dagar === 1 ? 'dag' : 'dagar'} totalt.</div>}
      <Field label="Notat (valfritt)">
        <input value={tekst} onChange={(e) => setTekst(e.target.value)} style={inputStyle} placeholder="t.d. sommarferie, legetime…" />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
    </Modal>
  );
}
