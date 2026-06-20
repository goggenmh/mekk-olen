import { useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { ORDER_FLOW, ORDER_STATUS } from '../../constants';
import { datoKort } from '../../lib/dates';
import { OrderModal } from './OrderModal';
import { NotifyModal } from './NotifyModal';
import type { Order } from '../../types';

const FILTERS: { key: string; label: string }[] = [
  { key: 'aktive', label: 'Aktive' },
  { key: 'ny', label: ORDER_STATUS.ny.tekst },
  { key: 'tinga', label: ORDER_STATUS.tinga.tekst },
  { key: 'komen', label: ORDER_STATUS.komen.tekst },
  { key: 'henta', label: ORDER_STATUS.henta.tekst },
];

export function Bestillinger() {
  const { orders, advanceOrder } = useAppData();
  const [filter, setFilter] = useState('aktive');
  const [orderTarget, setOrderTarget] = useState<Order | 'new' | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<Order | null>(null);

  const filtered = orders
    .filter((o) => (filter === 'aktive' ? o.status !== 'henta' : o.status === filter))
    .slice()
    .sort((a, b) => {
      const ia = ORDER_FLOW.indexOf(a.status as typeof ORDER_FLOW[number]);
      const ib = ORDER_FLOW.indexOf(b.status as typeof ORDER_FLOW[number]);
      if (ia !== ib) return ia - ib;
      return a.dato < b.dato ? -1 : 1;
    });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 21 }}>Bestillingar</div>
        <button
          onClick={() => setOrderTarget('new')}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: '#1597a8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Ny bestilling
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f.key ? '#11788a' : 'var(--surface)', color: filter === f.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)' }}>
              <th style={th}>Kunde</th>
              <th style={th}>Vare</th>
              <th style={th}>Leverandør</th>
              <th style={th}>Dato</th>
              <th style={th}>Antal</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const s = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS];
              const kanFram = o.status !== ORDER_FLOW[ORDER_FLOW.length - 1];
              const kanVarsle = o.status === 'komen';
              const nesteIdx = ORDER_FLOW.indexOf(o.status as typeof ORDER_FLOW[number]) + 1;
              return (
                <tr key={o.id} style={{ borderTop: '1px solid var(--divider)' }}>
                  <td style={{ ...td, fontWeight: 600, cursor: 'pointer' }} onClick={() => setOrderTarget(o)}>{o.kunde}</td>
                  <td style={td}>{o.vare}</td>
                  <td style={td}>{o.leverandor}</td>
                  <td style={td}>{datoKort(o.dato)}</td>
                  <td style={td}>{o.antal}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.fg, background: s.bg, padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase' }}>{s.tekst}</span>
                    {o.varsla && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>Varsla {datoKort(o.varsla)}</div>}
                  </td>
                  <td style={{ ...td, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {kanVarsle && (
                      <button onClick={() => setNotifyTarget(o)} title="Varsle kunde" style={iconBtn(o.varsla ? '#e8f5ee' : '#fdf2e0')}>🔔</button>
                    )}
                    {kanFram && (
                      <button onClick={() => advanceOrder(o.id, ORDER_FLOW[nesteIdx])} title={s.neste} style={iconBtn('#e7f6f8')}>→</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>Ingen bestillingar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {orderTarget && <OrderModal existing={orderTarget === 'new' ? undefined : orderTarget} onClose={() => setOrderTarget(null)} />}
      {notifyTarget && <NotifyModal order={notifyTarget} onClose={() => setNotifyTarget(null)} />}
    </div>
  );
}

const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.3px' };
const td: CSSProperties = { padding: '10px 12px' };
const iconBtn = (bg: string): CSSProperties => ({ width: 30, height: 30, border: 'none', background: bg, borderRadius: 8, cursor: 'pointer', fontSize: 13 });
