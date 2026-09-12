import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { PRIORITET, OPPGAVE_KATEGORIAR, GJENTAK, type Prioritet } from '../../constants';
import type { Task, SjekklistePunkt } from '../../types';

export function TaskModal({ existing, defaultAnsatt, onClose }: { existing?: Task; defaultAnsatt?: Task['ansatt']; onClose: () => void }) {
  const { saveTask, deleteTask, completeTask } = useAppData();
  const { ansatte } = useAnsatte();

  const [tittel, setTittel] = useState(existing?.tittel || '');
  const [detalj, setDetalj] = useState(existing?.detalj || '');
  const [prioritet, setPrioritet] = useState<Prioritet>((existing?.prioritet as Prioritet) || 'medium');
  const [ansatt, setAnsatt] = useState<Task['ansatt']>(existing?.ansatt || defaultAnsatt || 'ufordelt');
  const [frist, setFrist] = useState(existing?.frist || '');
  const [kategori, setKategori] = useState(existing?.kategori || 'Anna');
  const [gjentak, setGjentak] = useState(existing?.gjentak || 'ingen');
  const [sjekkliste, setSjekkliste] = useState<SjekklistePunkt[]>(existing?.sjekkliste || []);
  const [nyPunkt, setNyPunkt] = useState('');
  const [ferdig, setFerdig] = useState(existing?.ferdig || false);
  const [feil, setFeil] = useState(false);

  const leggTilPunkt = () => {
    if (!nyPunkt.trim()) return;
    setSjekkliste((prev) => [...prev, { tekst: nyPunkt.trim(), ferdig: false }]);
    setNyPunkt('');
  };

  const save = async () => {
    if (!tittel.trim()) { setFeil(true); return; }
    const felt = { tittel: tittel.trim(), detalj, prioritet, ansatt, frist: frist || null, kategori, gjentak, sjekkliste };
    const vartFerdig = ferdig && !existing?.ferdig;
    if (vartFerdig && gjentak !== 'ingen') {
      // Ny fullføring av ei gjentakande oppgåve → lag neste førekomst automatisk.
      await completeTask({ id: existing?.id, ferdig: false, ...felt } as Task);
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
      title={existing ? 'Endre oppgåve' : 'Ny oppgåve'}
      footer={
        <>
          {existing && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <Field label="Tittel">
        <input value={tittel} onChange={(e) => { setTittel(e.target.value); setFeil(false); }} style={inputStyle} />
      </Field>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn ein tittel.</div>}
      <Field label="Detaljer">
        <textarea value={detalj} onChange={(e) => setDetalj(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Prioritet">
          <select value={prioritet} onChange={(e) => setPrioritet(e.target.value as Prioritet)} style={inputStyle}>
            {Object.entries(PRIORITET).map(([k, v]) => <option key={k} value={k}>{v.tekst}</option>)}
          </select>
        </Field>
        <Field label="Tildelt">
          <select value={ansatt} onChange={(e) => setAnsatt(e.target.value as Task['ansatt'])} style={inputStyle}>
            <option value="ufordelt">Ufordelt</option>
            {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Frist">
          <input type="date" value={frist} onChange={(e) => setFrist(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Kategori">
          <select value={kategori} onChange={(e) => setKategori(e.target.value)} style={inputStyle}>
            {OPPGAVE_KATEGORIAR.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Gjentaking">
        <select value={gjentak} onChange={(e) => setGjentak(e.target.value)} style={inputStyle}>
          {Object.entries(GJENTAK).map(([k, v]) => <option key={k} value={k}>{v.tekst}</option>)}
        </select>
      </Field>
      {gjentak !== 'ingen' && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: -6 }}>
          Når du hakar av oppgåva som fullført, blir neste førekomst laga automatisk.
        </div>
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

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={ferdig} onChange={(e) => setFerdig(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Fullført</span>
      </label>
    </Modal>
  );
}
