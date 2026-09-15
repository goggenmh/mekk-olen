import { useState, type CSSProperties } from 'react';
import { Modal, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { skiftFraTid } from '../../lib/dates';
import { SKIFT_FARGE } from '../../constants';

const DAGAR: { key: string; namn: string }[] = [
  { key: 'man', namn: 'Måndag' },
  { key: 'tir', namn: 'Tysdag' },
  { key: 'ons', namn: 'Onsdag' },
  { key: 'tor', namn: 'Torsdag' },
  { key: 'fre', namn: 'Fredag' },
  { key: 'lau', namn: 'Laurdag' },
];

// Måndag = 0 … laurdag = 5, for å rekne ut skift-farge (Laurdag).
const DUMMY_DATO: Record<string, string> = {
  man: '2024-01-01', tir: '2024-01-02', ons: '2024-01-03', tor: '2024-01-04', fre: '2024-01-05', lau: '2024-01-06',
};

interface Rad { ansatt: string; dag: string; start: string; slutt: string; }

const sel: CSSProperties = { padding: '8px 9px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 9, fontFamily: "'Geist'", fontSize: 13, color: 'var(--text)' };

export function StandardvekeModal({ onClose }: { onClose: () => void }) {
  const { standardveke, saveStandardveke } = useAppData();
  const { ansatte } = useAnsatte();
  const [rader, setRader] = useState<Rad[]>(
    standardveke.map((e) => ({ ansatt: e.ansatt, dag: e.dag, start: e.start, slutt: e.slutt }))
  );

  const oppdater = (i: number, patch: Partial<Rad>) => setRader((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const fjern = (i: number) => setRader((r) => r.filter((_, j) => j !== i));
  const leggTil = () => setRader((r) => [...r, { ansatt: ansatte[0]?.id || '', dag: 'man', start: '09:00', slutt: '15:00' }]);

  const lagre = async () => {
    const gyldige = rader.filter((r) => r.ansatt && r.start < r.slutt);
    await saveStandardveke(gyldige);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Standardveke"
      subtitle="Malen som «Fyll frå standardveke» brukar"
      maxWidth={560}
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={lagre} /></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '52vh', overflowY: 'auto' }}>
        {rader.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Ingen rader enno. Legg til vakter under.</div>
        )}
        {rader.map((r, i) => {
          const ugyldigTid = r.start >= r.slutt;
          const skift = ugyldigTid ? '' : skiftFraTid(r.start, r.slutt, DUMMY_DATO[r.dag]);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <select value={r.ansatt} onChange={(e) => oppdater(i, { ansatt: e.target.value })} style={{ ...sel, flex: '1 1 130px' }}>
                {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
              </select>
              <select value={r.dag} onChange={(e) => oppdater(i, { dag: e.target.value })} style={{ ...sel, flex: '0 1 110px' }}>
                {DAGAR.map((d) => <option key={d.key} value={d.key}>{d.namn}</option>)}
              </select>
              <input type="time" value={r.start} onChange={(e) => oppdater(i, { start: e.target.value })} style={{ ...sel, fontFamily: "'Geist Mono'", width: 92 }} />
              <input type="time" value={r.slutt} onChange={(e) => oppdater(i, { slutt: e.target.value })} style={{ ...sel, fontFamily: "'Geist Mono'", width: 92 }} />
              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 62, color: skift ? (SKIFT_FARGE[skift] || 'var(--text-muted)') : 'var(--danger)' }}>{skift || 'ugyldig'}</span>
              <button onClick={() => fjern(i)} title="Fjern" style={{ width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 9, cursor: 'pointer', color: 'var(--danger)', fontSize: 15, flex: 'none' }}>✕</button>
            </div>
          );
        })}
      </div>
      <button onClick={leggTil} style={{ marginTop: 4, alignSelf: 'flex-start', border: '1px dashed var(--border)', background: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--brand-strong)', cursor: 'pointer' }}>
        + Legg til vakt
      </button>
      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Skifttypen blir sett automatisk ut frå tida. Du fyller ei veke ved å trykkje «Fyll frå standardveke» på vaktplanen.</div>
    </Modal>
  );
}
