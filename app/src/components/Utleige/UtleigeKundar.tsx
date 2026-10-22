import { useState } from 'react';
import { reinTelefon } from '../../lib/bestilling';
import { kr, nr, tidKort, type UtleigeReservasjon } from '../../lib/utleige';
import type { UtleigeData } from './useUtleige';
import { StatusMerke } from './StatusMerke';
import { kortStil, knapp } from './stil';

/** Kundar med leigehistorikk. Søk på namn, telefon eller e-post. */
export function UtleigeKundar({ data, onOpne }: { data: UtleigeData; onOpne: (r: UtleigeReservasjon) => void }) {
  const { kundar, reservasjonar, produkt } = data;
  const [sok, setSok] = useState('');
  const [opne, setOpne] = useState<string | null>(null);
  const [notat, setNotat] = useState('');

  const q = sok.trim().toLowerCase();
  const liste = kundar
    .filter((k) => !q || [k.namn, k.telefon, k.epost].some((f) => f.toLowerCase().includes(q)))
    .map((k) => ({ k, leiger: reservasjonar.filter((r) => r.kunde_id === k.id).sort((a, b) => b.start.localeCompare(a.start)) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk etter kunde" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, maxWidth: 360 }} />
      {liste.length === 0 && <div style={{ ...kortStil, fontSize: 13.5, color: 'var(--text-muted)' }}>Ingen kundar enno.</div>}
      {liste.map(({ k, leiger }) => {
        const tlf = reinTelefon(k.telefon);
        const totalt = leiger.filter((r) => ['returnert', 'kontroll', 'utleigd', 'forseinka'].includes(r.status)).reduce((s, r) => s + r.pris_total, 0);
        const erOpen = opne === k.id;
        return (
          <div key={k.id} style={kortStil}>
            <button onClick={() => { setOpne(erOpen ? null : k.id); setNotat(k.notat); }} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 14 }}>{k.namn}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)' }}>{k.telefon}{k.epost && ` · ${k.epost}`}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'right' }}>{leiger.length} leige{leiger.length === 1 ? '' : 'r'}<br />{kr(totalt)}</span>
            </button>
            {erOpen && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {tlf && <a href={`tel:${tlf}`} style={{ ...knapp(), textDecoration: 'none' }}>Ring</a>}
                  {tlf && <a href={`sms:${tlf}`} style={{ ...knapp(), textDecoration: 'none' }}>SMS</a>}
                  {k.epost && <a href={`mailto:${k.epost}`} style={{ ...knapp(), textDecoration: 'none' }}>E-post</a>}
                </div>
                {leiger.map((r) => (
                  <button key={r.id} onClick={() => onOpne(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-alt)', cursor: 'pointer', color: 'var(--text)' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{nr(r)} · {produkt.find((p) => p.id === r.produkt_id)?.namn} · {tidKort(r.start)}</span>
                    <StatusMerke status={r.status} />
                  </button>
                ))}
                <textarea value={notat} onChange={(e) => setNotat(e.target.value)} rows={2} placeholder="Notat om kunden (internt)" style={{ padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13.5, resize: 'vertical' }} />
                {notat !== k.notat && <button onClick={() => data.lagreKunde({ ...k, notat }).catch(() => {})} style={{ ...knapp(), alignSelf: 'flex-start' }}>Lagre notat</button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
