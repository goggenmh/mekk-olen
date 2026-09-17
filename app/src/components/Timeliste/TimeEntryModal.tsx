import { useState } from 'react';
import { Modal, Field, monoInputStyle, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { dur, fmt, mins } from '../../lib/dates';
import type { TimeEntry } from '../../types';

interface Bolk { id?: string; start: string; slutt: string; pause: number; }

export function TimeEntryModal({
  target,
  onClose,
}: {
  target: { ansatt: TimeEntry['ansatt']; date: string };
  onClose: () => void;
}) {
  const { entries, saveEntry, deleteEntry } = useAppData();
  const { findAnsatt } = useAnsatte();
  const a = findAnsatt(target.ansatt);

  const eksisterande = entries
    .filter((e) => e.ansatt === target.ansatt && e.date === target.date)
    .slice()
    .sort((x, y) => (x.start < y.start ? -1 : 1));

  const [bolkar, setBolkar] = useState<Bolk[]>(
    eksisterande.length > 0
      ? eksisterande.map((e) => ({ id: e.id, start: e.start, slutt: e.slutt, pause: e.pause }))
      : [{ start: '09:00', slutt: '17:00', pause: 0 }]
  );
  const [status, setStatus] = useState<TimeEntry['status']>(
    eksisterande.length > 0 && eksisterande.every((e) => e.status === 'godkjent') ? 'godkjent' : 'venter'
  );
  const [feil, setFeil] = useState<string | null>(null);

  const oppdater = (i: number, patch: Partial<Bolk>) => setBolkar((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const leggTil = () => setBolkar((b) => [...b, { start: '09:00', slutt: '17:00', pause: 0 }]);
  const fjern = (i: number) => setBolkar((b) => b.filter((_, j) => j !== i));

  const totalTimar = bolkar.reduce((acc, b) => acc + (mins(b.slutt) > mins(b.start) ? dur(b.start, b.slutt) - b.pause / 60 : 0), 0);

  const save = async () => {
    if (bolkar.some((b) => mins(b.slutt) <= mins(b.start))) { setFeil('Slutt må vere etter start i alle bolkane.'); return; }
    // Slett bolkar som er fjerna.
    const behaldne = new Set(bolkar.map((b) => b.id).filter(Boolean));
    for (const e of eksisterande) {
      if (!behaldne.has(e.id)) await deleteEntry(e.id);
    }
    // Lagre / oppdatere resten.
    for (const b of bolkar) {
      await saveEntry({ id: b.id, ansatt: target.ansatt, date: target.date, start: b.start, slutt: b.slutt, pause: b.pause, status });
    }
    onClose();
  };

  const godkjent = status === 'godkjent';

  return (
    <Modal
      onClose={onClose}
      title="Timeføring"
      subtitle={`${a.navn} · ${target.date}`}
      maxWidth={460}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bolkar.map((b, i) => {
          const ugyldig = mins(b.slutt) <= mins(b.start);
          const t = ugyldig ? 0 : dur(b.start, b.slutt) - b.pause / 60;
          return (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '11px 12px', background: 'var(--surface-alt)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-label)' }}>Bolk {i + 1}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{ugyldig ? '–' : `${fmt(t)} t`}</span>
                {bolkar.length > 1 && (
                  <button onClick={() => fjern(i)} title="Fjern bolk" style={{ marginLeft: 10, width: 26, height: 26, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', color: 'var(--danger)', fontSize: 14 }}>✕</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <Field label="Start">
                  <input type="time" value={b.start} onChange={(e) => { oppdater(i, { start: e.target.value }); setFeil(null); }} style={monoInputStyle} />
                </Field>
                <Field label="Slutt">
                  <input type="time" value={b.slutt} onChange={(e) => { oppdater(i, { slutt: e.target.value }); setFeil(null); }} style={monoInputStyle} />
                </Field>
                <Field label="Pause (min)">
                  <input type="number" min={0} step={5} value={b.pause} onChange={(e) => oppdater(i, { pause: Number(e.target.value) })} style={monoInputStyle} />
                </Field>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={leggTil} style={{ alignSelf: 'flex-start', border: '1px dashed var(--border)', background: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--brand-strong)', cursor: 'pointer' }}>
        + Legg til tidsbolk
      </button>

      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Totalt denne dagen: <strong style={{ color: 'var(--text)' }}>{fmt(totalTimar)} t</strong></div>

      <button
        onClick={() => setStatus(godkjent ? 'venter' : 'godkjent')}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
          border: `1px solid ${godkjent ? '#bfe3cd' : 'var(--border)'}`, background: godkjent ? '#e8f5ee' : 'var(--surface-alt)',
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: 8, border: `2px solid ${godkjent ? '#2f9e6f' : 'var(--text-faint2)'}`, background: godkjent ? '#2f9e6f' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
          {godkjent ? '✓' : ''}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: godkjent ? '#2f9e6f' : 'var(--text-secondary)' }}>{godkjent ? 'Godkjent' : 'Ventar på godkjenning'}</span>
      </button>
    </Modal>
  );
}
