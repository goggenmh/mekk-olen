import { useState } from 'react';
import { Modal, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { datoKort, today } from '../../lib/dates';
import type { Order } from '../../types';
import { reinTelefon } from '../../lib/bestilling';

export function NotifyModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { markOrderVarsla } = useAppData();
  const [copied, setCopied] = useState(false);
  const tlf = reinTelefon(order.telefon || '');

  const tekst = `Hei ${order.kunde}! Varen din "${order.vare}"${order.antal > 1 ? ` (${order.antal} stk)` : ''} er no komen i butikk og klar for henting hos MEKK Ølen. Opningstider: man–fre 09–18, laurdag 09–16. Helsing MEKK Ølen, tlf 53 76 50 00.`;

  const copy = async () => {
    await navigator.clipboard.writeText(tekst);
    setCopied(true);
  };

  const markert = async () => {
    await markOrderVarsla(order.id, today());
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Varsle kunde"
      subtitle={order.kunde}
      footer={<><CancelButton onClick={onClose} /><SaveButton onClick={markert}>Marker som varsla</SaveButton></>}
    >
      <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 13, fontSize: 13.5, lineHeight: 1.5 }}>{tekst}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tlf && (
          // Opnar meldings-appen på telefonen med teksten ferdig utfylt.
          <a
            href={`sms:${tlf}?&body=${encodeURIComponent(tekst)}`}
            style={{ padding: '8px 14px', background: 'var(--cta)', color: 'var(--on-cta)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
          >
            Send SMS
          </a>
        )}
        {tlf && (
          <a href={`tel:${tlf}`} style={{ padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
            Ring {order.telefon}
          </a>
        )}
        <button
          onClick={copy}
          style={{ padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
        >
          {copied ? 'Kopiert ✓' : 'Kopier tekst'}
        </button>
      </div>
      {!tlf && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Legg inn telefonnummer på bestillinga for å sende SMS herifrå.</div>}
      {order.varsla && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sist varsla {datoKort(order.varsla)}</div>}
    </Modal>
  );
}
