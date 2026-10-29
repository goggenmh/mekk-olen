import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { REKLAMASJON, REKLAMASJON_STEG } from '../../lib/oppgave';
import { addDays, today } from '../../lib/dates';
import type { Task } from '../../types';

/**
 * Registrer ein reklamasjon. Blir lagra som ei oppgåve i kategorien
 * «Reklamasjon», lagt på den som fører han inn. Dagleg leiar får varsel
 * og kan følgje saka opp vidare.
 */
export function ReklamasjonModal({ onClose }: { onClose: () => void }) {
  const { saveTask, orders } = useAppData();
  const { ansatte } = useAnsatte();
  const { user } = useAuth();
  const t = today();

  const [kunde, setKunde] = useState('');
  const [telefon, setTelefon] = useState('');
  const [vare, setVare] = useState('');
  const [varenr, setVarenr] = useState('');
  const [orderId, setOrderId] = useState('');
  const [skildring, setSkildring] = useState('');
  const [frist, setFrist] = useState(addDays(t, 1));
  const [ansvarleg, setAnsvarleg] = useState<Task['ansatt']>(user?.id || 'ufordelt');
  const [feil, setFeil] = useState('');
  const [lagrar, setLagrar] = useState(false);

  // Vel ein kjøpsordre → fyll inn kunde og vare automatisk.
  const velBestilling = (id: string) => {
    setOrderId(id);
    const o = orders.find((x) => x.id === id);
    if (o) {
      if (!kunde.trim()) setKunde(o.kunde);
      if (!telefon.trim() && o.telefon) setTelefon(o.telefon);
      if (!vare.trim()) setVare(o.vare);
      if (!varenr.trim() && o.varenr) setVarenr(o.varenr);
    }
  };

  const lagre = async () => {
    if (!kunde.trim()) { setFeil('Skriv inn kven kunden er.'); return; }
    if (!skildring.trim()) { setFeil('Skriv kort kva reklamasjonen gjeld.'); return; }
    setLagrar(true);
    // Telefonen står på eiga linje («Telefon: …») slik at han kan hentast ut
    // att og visast som ei ring-lenke på reklamasjonen (sjå reklamasjonTelefon).
    const detaljLinjer = [
      skildring.trim(),
      '',
      `Kunde: ${kunde.trim()}`,
      telefon.trim() ? `Telefon: ${telefon.trim()}` : '',
      (vare.trim() || varenr.trim()) ? `Vare: ${[vare.trim(), varenr.trim() && `varenr ${varenr.trim()}`].filter(Boolean).join(' · ')}` : '',
    ].filter((l, i) => l !== '' || i === 1).join('\n');
    try {
      await saveTask({
        tittel: `Reklamasjon: ${kunde.trim()}${vare.trim() ? ` – ${vare.trim()}` : ''}`,
        detalj: detaljLinjer,
        prioritet: 'høg',
        ansatt: ansvarleg,
        ferdig: false,
        frist: frist || null,
        kategori: REKLAMASJON,
        gjentak: 'ingen',
        sjekkliste: REKLAMASJON_STEG.map((tekst) => ({ tekst, ferdig: false })),
        orderId: orderId || undefined,
      });
      onClose();
    } finally {
      setLagrar(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Ny reklamasjon"
      subtitle="Dagleg leiar får varsel og kan følgje saka opp."
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={lagre}>{lagrar ? 'Lagrar…' : 'Registrer reklamasjon'}</SaveButton></>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Kunde">
          <input value={kunde} onChange={(e) => { setKunde(e.target.value); setFeil(''); }} placeholder="Namn" autoCapitalize="words" autoFocus style={inputStyle} />
        </Field>
        <Field label="Telefon (valfri)">
          <input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="Nummer" inputMode="tel" style={inputStyle} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Field label="Vare (valfri)">
          <input value={vare} onChange={(e) => setVare(e.target.value)} placeholder="Kva produkt gjeld det?" autoCapitalize="sentences" style={inputStyle} />
        </Field>
        <Field label="Varenr (valfri)">
          <input value={varenr} onChange={(e) => setVarenr(e.target.value)} placeholder="Varenr" style={inputStyle} />
        </Field>
      </div>
      {orders.length > 0 && (
        <Field label="Knytt til bestilling (valfri)">
          <select value={orderId} onChange={(e) => velBestilling(e.target.value)} style={inputStyle}>
            <option value="">Ingen</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.kunde} – {o.vare}</option>)}
          </select>
        </Field>
      )}
      <Field label="Kva gjeld reklamasjonen?">
        <textarea value={skildring} onChange={(e) => { setSkildring(e.target.value); setFeil(''); }} placeholder="T.d. «Drill sluttar å lade etter to veker. Kunden vil ha ny eller reparasjon.»" autoCapitalize="sentences" style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Ansvarleg">
          <select value={ansvarleg} onChange={(e) => setAnsvarleg(e.target.value as Task['ansatt'])} style={inputStyle}>
            <option value="ufordelt">Ufordelt</option>
            {ansatte.map((a) => <option key={a.id} value={a.id}>{a.id === user?.id ? `${a.navn} (meg)` : a.navn}</option>)}
          </select>
        </Field>
        <Field label="Frist for oppfølging">
          <input type="date" value={frist} onChange={(e) => setFrist(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
    </Modal>
  );
}
