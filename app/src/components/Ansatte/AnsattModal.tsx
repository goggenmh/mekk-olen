import { useState } from 'react';
import { Modal, Field, inputStyle, monoInputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAnsatte } from '../../context/AnsatteContext';
import type { Employee } from '../../constants';
import { FERIEPENGESATSAR, STANDARD_FERIEPENGESATS } from '../../lib/skatt';

const FARGAR = ['#11788a', '#e08a1e', '#2f9e6f', '#6a5acd', '#c0392b', '#b07b1a', '#9aa4b2', '#1d6fa5'];

const EPOST_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AnsattModal({ existing, onClose }: { existing?: Employee; onClose: () => void }) {
  const { createAnsatt, updateAnsatt, updateEmail } = useAnsatte();

  const [navn, setNavn] = useState(existing?.navn || '');
  const [rolle, setRolle] = useState(existing?.rolle || '');
  const [telefon, setTelefon] = useState(existing?.telefon || '');
  const [epost, setEpost] = useState(existing?.email || '');
  const [farge, setFarge] = useState(existing?.farge || FARGAR[0]);
  const [lonn, setLonn] = useState<'fast' | 'time'>(existing?.lonn || 'time');
  const [sats, setSats] = useState(existing?.sats || 0);
  const [leder, setLeder] = useState(existing?.leder || false);
  const [skattetype, setSkattetype] = useState<'' | 'skattekort' | 'frikort'>(existing?.skattetype || '');
  const [skatteprosent, setSkatteprosent] = useState(existing?.skatteprosent ?? 0);
  const [frikortgrense, setFrikortgrense] = useState(existing?.frikortgrense ?? 0);
  const [feriepengesats, setFeriepengesats] = useState(existing?.feriepengesats ?? STANDARD_FERIEPENGESATS);
  // Tidlegare løn gjeld for inneverande år; gamle tal frå i fjor blir ikkje viste.
  const iAar = new Date().getFullYear();
  const gjeldIAar = existing?.tidlegare_ar === iAar;
  const [tidlegareMekk, setTidlegareMekk] = useState(gjeldIAar ? existing?.tidlegare_mekk ?? 0 : 0);
  const [tidlegareAndre, setTidlegareAndre] = useState(gjeldIAar ? existing?.tidlegare_andre ?? 0 : 0);
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState('');
  const [lagrar, setLagrar] = useState(false);

  const init = navn.trim().slice(0, 2).toUpperCase() || '?';

  const save = async () => {
    if (!navn.trim()) { setFeil('Skriv inn navn.'); return; }
    if (!existing && pin.length !== 4) { setFeil('PIN må vere 4 siffer.'); return; }
    if (epost.trim() && !EPOST_REGEX.test(epost.trim())) { setFeil('E-posten ser ikkje gyldig ut.'); return; }
    if (skattetype === 'skattekort' && (skatteprosent < 0 || skatteprosent > 60)) { setFeil('Prosenttrekket må vere mellom 0 og 60.'); return; }
    if (skattetype === 'frikort' && frikortgrense <= 0) { setFeil('Skriv inn frikortbeløpet som står på frikortet.'); return; }
    if (tidlegareMekk < 0 || tidlegareAndre < 0) { setFeil('Tidlegare løn kan ikkje vere negativ.'); return; }
    setLagrar(true);
    setFeil('');
    const skatt = {
      skattetype: skattetype || null,
      skatteprosent: skattetype === 'skattekort' ? skatteprosent : null,
      frikortgrense: skattetype === 'frikort' ? frikortgrense : null,
      feriepengesats,
      tidlegare_ar: iAar,
      tidlegare_mekk: tidlegareMekk,
      tidlegare_andre: tidlegareAndre,
    };
    try {
      if (existing) {
        await updateAnsatt(existing.id, { navn: navn.trim(), rolle, telefon, farge, lonn, sats, leder, init, ...skatt });
        if (epost.trim() && epost.trim() !== existing.email) {
          await updateEmail(existing.id, epost.trim());
        }
      } else {
        const id = await createAnsatt({
          navn: navn.trim(), rolle, telefon, farge, lonn, sats, init, leder, pin,
          ...(epost.trim() ? { email: epost.trim() } : {}),
        });
        await updateAnsatt(id, skatt);
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
      title={existing ? 'Endre tilsett' : 'Ny tilsett'}
      subtitle={existing ? undefined : 'Lagar ny innlogging i Supabase Auth'}
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
      <Field label="E-post (brukt til innlogging)">
        <input
          value={epost}
          onChange={(e) => setEpost(e.target.value)}
          style={monoInputStyle}
          placeholder={existing ? existing.email : 'La stå tom for auto-generert adresse'}
        />
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Skatt">
          <select value={skattetype} onChange={(e) => setSkattetype(e.target.value as '' | 'skattekort' | 'frikort')} style={inputStyle}>
            <option value="">Ikkje registrert</option>
            <option value="skattekort">Skattekort</option>
            <option value="frikort">Frikort</option>
          </select>
        </Field>
        {skattetype === 'skattekort' && (
          <Field label="Prosenttrekk (%)">
            <input type="number" min={0} max={60} step={0.5} value={skatteprosent} onChange={(e) => setSkatteprosent(Number(e.target.value))} style={monoInputStyle} />
          </Field>
        )}
        {skattetype === 'frikort' && (
          <Field label="Frikortbeløp i år (kr)">
            <input type="number" min={0} step={100} value={frikortgrense} onChange={(e) => setFrikortgrense(Number(e.target.value))} style={monoInputStyle} />
          </Field>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4 }}>
        {skattetype === 'skattekort' && 'Står det tabelltrekk på skattekortet, skriv inn prosentsatsen frå kortet. Trekket blir då eit anslag.'}
        {skattetype === 'frikort' && 'Ikkje trekk før frikortbeløpet er brukt opp i år. Deretter blir 50 % trekt.'}
        {!skattetype && 'Utan registrert skattekort skal arbeidsgivar trekkje 50 %.'}
      </div>
      {lonn === 'time' && (
        <>
          <Field label="Feriepengar">
            <select value={feriepengesats} onChange={(e) => setFeriepengesats(Number(e.target.value))} style={inputStyle}>
              {FERIEPENGESATSAR.map((f) => <option key={f.sats} value={f.sats}>{f.tekst}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label={`Løn frå MEKK før appen i ${iAar} (kr)`}>
              <input type="number" min={0} step={100} value={tidlegareMekk} onChange={(e) => setTidlegareMekk(Number(e.target.value))} style={monoInputStyle} />
            </Field>
            <Field label={`Anna skattbar inntekt i ${iAar} (kr)`}>
              <input type="number" min={0} step={100} value={tidlegareAndre} onChange={(e) => setTidlegareAndre(Number(e.target.value))} style={monoInputStyle} />
            </Field>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4 }}>
            Brukt i frikort og feriepengar. «Løn frå MEKK før appen» er løn i år før timane vart førte her (utan feriepengar) –
            tel for både frikort og feriepengar. «Anna skattbar inntekt» er t.d. andre arbeidsgivarar og feriepengar utbetalt i år – tel berre for frikortet.
          </div>
        </>
      )}
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
