import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { FERIE_TYPER } from '../../constants';
import { today, talDagar, datoIntervall } from '../../lib/dates';
import { feriesaldo, overlappar, virkedagar } from '../../lib/ferie';
import type { Ferie } from '../../types';

/**
 * Ny/endre ferie og fri. Tilsette sender ein søknad som leiar må svare på;
 * leiarar (og dei med delegert godkjenning) kan registrere direkte for alle.
 */
export function FerieModal({ existing, onClose }: { existing?: Ferie; onClose: () => void }) {
  const { ferie, shifts, saveFerie, deleteFerie, canApprove } = useAppData();
  const { ansatte, findAnsatt } = useAnsatte();
  const { user } = useAuth();
  const kanStyreAlle = canApprove(user?.id);
  // Tilsette kan endre/trekkje eigne søknader så lenge dei ikkje er behandla.
  const laast = !!existing && !kanStyreAlle && existing.status !== 'ventar';

  const [ansatt, setAnsatt] = useState<Ferie['ansatt']>(existing?.ansatt || (kanStyreAlle ? ansatte[0]?.id : user?.id) || '');
  const [type, setType] = useState(existing?.type || FERIE_TYPER[0]);
  const [fra, setFra] = useState(existing?.fra || today());
  const [til, setTil] = useState(existing?.til || existing?.fra || today());
  const [tekst, setTekst] = useState(existing?.tekst || '');
  const [feil, setFeil] = useState<string | null>(null);

  const forAnsatt = kanStyreAlle ? ansatt : (user?.id || ansatt);
  const dagar = fra && til && til >= fra ? talDagar(fra, til) : 0;
  const virke = fra && til && til >= fra ? virkedagar(fra, til) : 0;
  const tilsett = findAnsatt(forAnsatt);
  const saldo = type === 'Ferie' ? feriesaldo(tilsett, ferie.filter((f) => f.id !== existing?.id), Number(fra.slice(0, 4))) : null;
  const andre = dagar > 0 ? overlappar({ id: existing?.id, ansatt: forAnsatt, fra, til }, ferie) : [];
  const vakter = dagar > 0 ? shifts.filter((s) => s.ansatt === forAnsatt && s.date >= fra && s.date <= til).length : 0;

  const save = async () => {
    if (!fra || !til) { setFeil('Vel både frå- og til-dato.'); return; }
    if (til < fra) { setFeil('Til-dato må vere same dag eller etter frå-dato.'); return; }
    await saveFerie({ id: existing?.id, ansatt: forAnsatt, type, tekst, fra, til, status: kanStyreAlle ? 'godkjend' : 'ventar' });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteFerie(existing.id);
    onClose();
  };

  const tittel = existing ? (laast ? 'Ferie/fri' : 'Endre ferie/fri') : kanStyreAlle ? 'Registrer ferie/fri' : 'Søk om ferie/fri';

  return (
    <Modal
      onClose={onClose}
      title={tittel}
      subtitle={existing && existing.status !== 'godkjend' ? (existing.status === 'ventar' ? 'Søknaden ventar på svar frå leiar' : 'Søknaden vart avslått') : undefined}
      footer={
        <>
          {existing && (kanStyreAlle || (existing.ansatt === user?.id && existing.status === 'ventar')) && (
            <DeleteButton onClick={del} />
          )}
          <CancelButton onClick={onClose} />
          {!laast && <SaveButton onClick={save}>{kanStyreAlle ? 'Lagre' : existing ? 'Oppdater søknad' : 'Send søknad'}</SaveButton>}
        </>
      }
    >
      <Field label="Tilsett">
        {kanStyreAlle ? (
          <select value={ansatt} onChange={(e) => setAnsatt(e.target.value as Ferie['ansatt'])} style={inputStyle}>
            {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        ) : (
          <input value={tilsett.navn} disabled style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
        )}
      </Field>
      <Field label="Type">
        <select value={type} disabled={laast} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          {FERIE_TYPER.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Frå">
          <input type="date" value={fra} disabled={laast} onChange={(e) => { setFra(e.target.value); setFeil(null); if (til < e.target.value) setTil(e.target.value); }} style={inputStyle} />
        </Field>
        <Field label="Til">
          <input type="date" value={til} disabled={laast} min={fra} onChange={(e) => { setTil(e.target.value); setFeil(null); }} style={inputStyle} />
        </Field>
      </div>
      {dagar > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {dagar} {dagar === 1 ? 'dag' : 'dagar'} · {virke} {virke === 1 ? 'virkedag' : 'virkedagar'}
          {saldo && <> · {saldo.att - (existing?.status === 'avslatt' ? 0 : virke)} feriedagar att etter dette (av {saldo.rett})</>}
        </div>
      )}
      {saldo && saldo.att - virke < 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>Dette er meir enn feriedagane som er att i år.</div>
      )}
      {(andre.length > 0 || vakter > 0) && (
        <div style={{ fontSize: 12.5, background: 'var(--accent-soft)', borderRadius: 10, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {vakter > 0 && <span>⚠ {tilsett.navn.split(' ')[0]} har {vakter} {vakter === 1 ? 'vakt' : 'vakter'} i perioden som må dekkjast.</span>}
          {andre.map((x) => (
            <span key={x.id}>⚠ {findAnsatt(x.ansatt).navn} er òg borte {datoIntervall(x.fra!, x.til)} ({x.type.toLowerCase()}{x.status === 'ventar' ? ', søkt' : ''}).</span>
          ))}
        </div>
      )}
      <Field label="Notat (valfritt)">
        <input value={tekst} disabled={laast} onChange={(e) => setTekst(e.target.value)} style={inputStyle} placeholder="t.d. sommarferie, legetime…" />
      </Field>
      {existing?.svar && (
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}><b>Svar frå leiar:</b> {existing.svar}</div>
      )}
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
    </Modal>
  );
}
