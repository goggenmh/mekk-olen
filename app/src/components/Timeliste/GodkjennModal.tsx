import { useState } from 'react';
import { Modal, CancelButton } from '../ui/Modal';
import { useAnsatte } from '../../context/AnsatteContext';
import { fmt, fullDatoTekst } from '../../lib/dates';
import { Avatar } from '../ui/Avatar';
import type { Avvik } from '../../lib/avvik';

/**
 * Stadfesting før leiaren godkjenner timar. Viser avvika mot vaktplanen
 * per tilsett og dag, så det er lett å sjå kva som ikkje stemmer.
 */
export function GodkjennModal({ avvik, tal, onGodkjenn, onClose }: {
  avvik: Avvik[];
  /** Kor mange timeføringar som blir godkjende. */
  tal: number;
  onGodkjenn: () => Promise<void>;
  onClose: () => void;
}) {
  const { findAnsatt } = useAnsatte();
  const [lagrar, setLagrar] = useState(false);
  const perAnsatt = [...new Set(avvik.map((a) => a.ansatt))];

  const godkjenn = async () => {
    setLagrar(true);
    try { await onGodkjenn(); onClose(); } finally { setLagrar(false); }
  };

  return (
    <Modal
      onClose={onClose}
      maxWidth={460}
      title={avvik.length > 0 ? 'Sjekk avvik' : 'Godkjenn timar'}
      subtitle={avvik.length > 0
        ? `${avvik.length} ${avvik.length === 1 ? 'dag stemmer' : 'dagar stemmer'} ikkje med vaktplanen`
        : `${tal} ${tal === 1 ? 'timeføring' : 'timeføringar'} blir godkjende`}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <button
            onClick={godkjenn}
            disabled={lagrar}
            style={{ padding: '10px 18px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {lagrar ? 'Godkjenner…' : avvik.length > 0 ? 'Godkjenn likevel' : 'Godkjenn'}
          </button>
        </>
      }
    >
      {avvik.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>Alle timane stemmer med vaktplanen.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {perAnsatt.map((id) => {
            const a = findAnsatt(id);
            return (
              <div key={id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <Avatar init={a.init} farge={a.farge} size={26} fontSize={10} />
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{a.navn}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {avvik.filter((x) => x.ansatt === id).map((x) => {
                    const diff = x.fort - x.plan;
                    return (
                      <div key={x.dato} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r)', background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{fullDatoTekst(x.dato)}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {x.plan > 0 ? `Vakt ${fmt(x.plan)} t` : 'Ikkje på vaktplanen'} · ført {fmt(x.fort)} t
                          </div>
                        </div>
                        <span style={{ flex: 'none', fontFamily: "'Geist Mono Variable'", fontSize: 13, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--r-sm)', color: 'var(--pill-raud-fg)', background: 'var(--pill-raud-bg)' }}>
                          {diff > 0 ? '+' : '−'}{fmt(Math.abs(diff))} t
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Trykk på ein dag i timelista for å sjå eller rette føringa.</div>
        </div>
      )}
    </Modal>
  );
}
