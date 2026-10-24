import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { supabase } from '../../supabaseClient';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { ORDER_FLOW, ORDER_STATUS } from '../../constants';
import { today, fmtPris } from '../../lib/dates';
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
  // Pris per stk som tekst, så komma og mellomrom kan skrivast («1 199,50»).
  const [pris, setPris] = useState(existing?.pris != null ? String(existing.pris).replace('.', ',') : '');
  const prisTal = pris.trim() ? Number(pris.replace(/\s/g, '').replace(',', '.')) : null;
  const prisFeil = prisTal !== null && (!Number.isFinite(prisTal) || prisTal < 0);
  const [feil, setFeil] = useState(false);

  // Produktbilete: frå før, frå søk, eller (ved lagring) henta frå lenka.
  const [bilde, setBilde] = useState<string | null>(existing?.bilde ?? null);
  const [sokar, setSokar] = useState(false);
  const [sokMelding, setSokMelding] = useState<string | null>(null);

  // Når lenka blir endra manuelt, nullstill biletet (eller hent att det gamle).
  const endreLenke = (v: string) => {
    setLenke(v);
    setBilde(v.trim() === (existing?.lenke || '') ? (existing?.bilde ?? null) : null);
  };

  // EKSPERIMENTELT: prøv å finne produkt ut frå vare + leverandør.
  const finnProdukt = async () => {
    if (!vare.trim() || !leverandor.trim() || sokar) return;
    setSokar(true); setSokMelding(null);
    try {
      const { data, error } = await supabase.functions.invoke('finn-produkt', { body: { vare: vare.trim(), leverandor: leverandor.trim() } });
      const r = data as { lenke?: string | null; bilde?: string | null; merknad?: string } | null;
      if (error || !r) setSokMelding('Søket feila. Prøv igjen, eller lim inn lenka sjølv.');
      else if (r.lenke) { setLenke(r.lenke); setBilde(r.bilde ?? null); setSokMelding('Forslag henta – sjekk at det er rett produkt før du lagrar.'); }
      else setSokMelding(r.merknad || 'Fann ingen treff.');
    } catch { setSokMelding('Søket feila. Prøv igjen, eller lim inn lenka sjølv.'); }
    setSokar(false);
  };

  const save = async () => {
    if (!kunde.trim()) { setFeil(true); return; }
    if (prisFeil) return;
    await saveOrder({ id: existing?.id, kunde: storeOrd(kunde.trim()), telefon, vare: storFyrste(vare.trim()), leverandor: storFyrste(leverandor.trim()), varenr, lenke: lenke.trim() || null, dato, antal, status, notat: storFyrste(notat.trim()), pris: prisTal === null ? null : Math.round(prisTal * 100) / 100, varsla: existing?.varsla ?? null, bilde });
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
        <input value={lenke} autoCapitalize="off" onChange={(e) => endreLenke(e.target.value)} placeholder="https://…" style={inputStyle} />
      </Field>
      {bilde && (
        <img src={bilde} alt="Produktbilete" onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ width: 96, height: 96, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginTop: -4 }} />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Leverandør">
          <input value={leverandor} onChange={(e) => setLeverandor(e.target.value)} onBlur={() => setLeverandor(storFyrste)} autoCapitalize="sentences" style={inputStyle} />
        </Field>
        <Field label="Varenr">
          <input value={varenr} onChange={(e) => setVarenr(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      {vare.trim() && leverandor.trim() && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={finnProdukt} disabled={sokar}
            style={{ alignSelf: 'flex-start', padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--surface-alt)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: sokar ? 'default' : 'pointer', fontFamily: 'inherit', opacity: sokar ? 0.6 : 1 }}>
            {sokar ? 'Søkjer …' : '🔎 Finn produkt automatisk (prøv)'}
          </button>
          {sokMelding && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{sokMelding}</div>}
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4 }}>Eksperimentelt: søkjer opp produktet ut frå vare + leverandør. Kontroller alltid at lenka er rett før du lagrar.</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Dato">
          <input type="date" value={dato} onChange={(e) => setDato(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Antal">
          <input type="number" min={1} value={antal} onChange={(e) => setAntal(Number(e.target.value))} style={inputStyle} />
        </Field>
      </div>
      <Field label="Pris per stk (kr)">
        <input inputMode="decimal" value={pris} onChange={(e) => setPris(e.target.value)} placeholder="T.d. 1199,00" autoComplete="off" style={inputStyle} />
      </Field>
      {prisFeil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv prisen som eit tal, t.d. 1199,00.</div>}
      {prisTal !== null && !prisFeil && antal > 1 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -6 }}>Totalt {fmtPris(prisTal * antal)} for {antal} stk</div>
      )}
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
          {ORDER_FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].tekst}</option>)}
        </select>
      </Field>
    </Modal>
  );
}
