import { useState } from 'react';
import { Modal, CancelButton, SaveButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { datoKort, today } from '../../lib/dates';
import type { Order } from '../../types';

export function NotifyModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { markOrderVarsla } = useAppData();
  const [copied, setCopied] = useState(false);

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
      <div style={{ background: '#f7f9fb', border: '1px solid #e1e8ec', borderRadius: 9, padding: 13, fontSize: 13.5, lineHeight: 1.5 }}>{tekst}</div>
      <button
        onClick={copy}
        style={{ alignSelf: 'flex-start', padding: '8px 14px', border: '1px solid #d6dfe4', background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#142029', cursor: 'pointer' }}
      >
        {copied ? 'Kopiert ✓' : 'Kopier tekst'}
      </button>
      {order.varsla && <div style={{ fontSize: 12.5, color: '#7e93a0' }}>Sist varsla {datoKort(order.varsla)}</div>}
    </Modal>
  );
}
