import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { PRIORITET, OPPGAVE_KATEGORIAR, GJENTAK, type Prioritet } from '../../constants';
import { addDays, datoKort, today, ymd } from '../../lib/dates';
import type { Task, SjekklistePunkt, TaskInput } from '../../types';

const fristKnapp = (aktiv: boolean) => ({
  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--border)', background: aktiv ? 'var(--brand-soft)' : 'var(--surface)', color: aktiv ? 'var(--brand-strong)' : 'var(--text-secondary)',
}) as const;

export function TaskModal({ existing, defaultAnsatt, preset, onClose }: {
  existing?: Task;
  defaultAnsatt?: Task['ansatt'];
  /** Utfylte felt for ei ny oppgåve, t.d. frå ei bestilling. */
  preset?: Partial<TaskInput>;
  onClose: () => void;
}) {
  const { saveTask, deleteTask, completeTask, orders, canApprove } = useAppData();
  const { ansatte, findAnsatt } = useAnsatte();
  const { user } = useAuth();
  const t = today();
  const erLeiar = canApprove(user?.id);

  const [tittel, setTittel] = useState(existing?.tittel || preset?.tittel || '');
  const [detalj, setDetalj] = useState(existing?.detalj || preset?.detalj || '');
  const [prioritet, setPrioritet] = useState<Prioritet>((existing?.prioritet as Prioritet) || (preset?.prioritet as Prioritet) || 'medium');
  const [ansatt, setAnsatt] = useState<Task['ansatt']>(existing?.ansatt || preset?.ansatt || defaultAnsatt || 'ufordelt');
  const [frist, setFrist] = useState(existing?.frist || preset?.frist || '');
  const [kategori, setKategori] = useState(existing?.kategori || preset?.kategori || 'Anna');
  const [gjentak, setGjentak] = useState(existing?.gjentak || 'ingen');
  const [sjekkliste, setSjekkliste] = useState<SjekklistePunkt[]>(existing?.sjekkliste || []);
  const [nyPunkt, setNyPunkt] = useState('');
  const [ferdig, setFerdig] = useState(existing?.ferdig || false);
  const [blokkert, setBlokkert] = useState(existing?.blokkert || false);
  const [blokkertGrunn, setBlokkertGrunn] = useState(existing?.blokkertGrunn || '');
  const [feil, setFeil] = useState(false);

  const orderId = existing?.orderId ?? preset?.orderId ?? null;
  const bestilling = orderId ? orders.find((o) => o.id === orderId) : undefined;
  const oppretta = existing?.opprettaAv ? findAnsatt(existing.opprettaAv) : null;
  // Tilsette kan slette oppgåver dei sjølv har laga; leiaren kan slette alle.
  const kanSlette = !!existing && (erLeiar || (!!user && existing.opprettaAv === user.id));

  const leggTilPunkt = () => {
    if (!nyPunkt.trim()) return;
    setSjekkliste((prev) => [...prev, { tekst: nyPunkt.trim(), ferdig: false }]);
    setNyPunkt('');
  };

  const save = async () => {
    if (!tittel.trim()) { setFeil(true); return; }
    const felt = { tittel: tittel.trim(), detalj, prioritet, ansatt, frist: frist || null, kategori, gjentak, sjekkliste, blokkert: blokkert && !ferdig, blokkertGrunn, orderId };
    const vartFerdig = ferdig && !existing?.ferdig;
    if (vartFerdig && existing) {
      // Fullføring går same veg som knappen på kortet (lagar òg neste førekomst).
      await completeTask({ ...existing, ...felt, ferdig: false });
    } else {
      await saveTask({ id: existing?.id, ferdig, ...felt });
    }
    onClose();
  };

  const del = async () => {
    if (existing) await deleteTask(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Oppgåve' : 'Ny oppgåve'}
      subtitle={existing ? [
        existing.rutineId ? 'Laga frå fast rutine' : oppretta ? `Oppretta av ${oppretta.navn}${existing.opprettaAt ? ` ${datoKort(ymd(new Date(existing.opprettaAt)))}` : ''}` : '',
      ].filter(Boolean).join(' · ') || undefined : undefined}
      footer={
        <>
          {kanSlette && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <Field label="Kva skal gjerast?">
        <input value={tittel} onChange={(e) => { setTittel(e.target.value); setFeil(false); }} placeholder="T.d. «Følg opp nytt sortiment»" autoCapitalize="sentences" autoFocus={!existing} style={inputStyle} />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn ein tittel.</div>}
      <Field label="Beskriving">
        <textarea autoCapitalize="sentences" value={detalj} onChange={(e) => setDetalj(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      </Field>
      {bestilling && (
        <div style={{ fontSize: 12.5, color: 'var(--brand-strong)', background: 'var(--brand-soft)', borderRadius: 10, padding: '8px 11px', fontWeight: 600 }}>
          Kopla til bestillinga til {bestilling.kunde} ({bestilling.vare})
        </div>
      )}
      <Field label="Ansvarleg">
        <select value={ansatt} onChange={(e) => setAnsatt(e.target.value as Task['ansatt'])} style={inputStyle}>
          <option value="ufordelt">Ufordelt – kven som helst kan ta ho</option>
          {ansatte.map((a) => <option key={a.id} value={a.id}>{a.id === user?.id ? `${a.navn} (meg)` : a.navn}</option>)}
        </select>
      </Field>
      <Field label="Frist">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setFrist(t)} style={fristKnapp(frist === t)}>I dag</button>
            <button type="button" onClick={() => setFrist(addDays(t, 1))} style={fristKnapp(frist === addDays(t, 1))}>I morgon</button>
            <button type="button" onClick={() => setFrist(addDays(t, 7))} style={fristKnapp(frist === addDays(t, 7))}>Om ei veke</button>
            <button type="button" onClick={() => setFrist('')} style={fristKnapp(!frist)}>Ingen frist</button>
          </div>
          <input type="date" value={frist} onChange={(e) => setFrist(e.target.value)} style={inputStyle} />
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Prioritet">
          <select value={prioritet} onChange={(e) => setPrioritet(e.target.value as Prioritet)} style={inputStyle}>
            {Object.entries(PRIORITET).map(([k, v]) => <option key={k} value={k}>{v.tekst}</option>)}
          </select>
        </Field>
        <Field label="Kategori">
          <select value={kategori} onChange={(e) => setKategori(e.target.value)} style={inputStyle}>
            {OPPGAVE_KATEGORIAR.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
      </div>
      {/* Faste oppgåver blir no laga som rutinar; eldre gjentakande oppgåver kan framleis endrast. */}
      {existing && existing.gjentak !== 'ingen' && (
        <Field label="Gjentaking">
          <select value={gjentak} onChange={(e) => setGjentak(e.target.value)} style={inputStyle}>
            {Object.entries(GJENTAK).map(([k, v]) => <option key={k} value={k}>{v.tekst}</option>)}
          </select>
        </Field>
      )}

      <Field label="Sjekkliste">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sjekkliste.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={p.ferdig}
                onChange={(e) => setSjekkliste((prev) => prev.map((x, j) => (j === i ? { ...x, ferdig: e.target.checked } : x)))}
                style={{ width: 16, height: 16, cursor: 'pointer', flex: 'none' }}
              />
              <span style={{ flex: 1, fontSize: 13, textDecoration: p.ferdig ? 'line-through' : 'none', color: p.ferdig ? 'var(--text-muted)' : 'var(--text)' }}>{p.tekst}</span>
              <button
                onClick={() => setSjekkliste((prev) => prev.filter((_, j) => j !== i))}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 15, flex: 'none' }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={nyPunkt}
              onChange={(e) => setNyPunkt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTilPunkt(); } }}
              placeholder="Legg til punkt…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={leggTilPunkt} style={{ padding: '0 14px', background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 11, fontSize: 18, fontWeight: 600, cursor: 'pointer', flex: 'none' }}>+</button>
          </div>
        </div>
      </Field>

      {existing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4, borderTop: '1px solid var(--divider)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: 10 }}>
            <input type="checkbox" checked={ferdig} onChange={(e) => setFerdig(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Fullført</span>
          </label>
          {!ferdig && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={blokkert} onChange={(e) => setBlokkert(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Blokkert – kan ikkje fullførast no</span>
            </label>
          )}
          {blokkert && !ferdig && (
            <textarea
              value={blokkertGrunn}
              onChange={(e) => setBlokkertGrunn(e.target.value)}
              placeholder="Kvifor? Leiaren får beskjed."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
