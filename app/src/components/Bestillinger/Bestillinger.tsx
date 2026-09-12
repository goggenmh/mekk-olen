import { useMemo, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { ORDER_FLOW, ORDER_STATUS } from '../../constants';
import { datoKort, MND } from '../../lib/dates';
import { OrderModal } from './OrderModal';
import { NotifyModal } from './NotifyModal';
import { Icon } from '../ui/Icon';
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
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  // Henta-bestillingar grupperte i år → månad, nyaste først.
  const hentaGrupper = useMemo(() => {
    const henta = orders.filter((o) => o.status === 'henta');
    const byAr = new Map<string, Map<string, Order[]>>();
    for (const o of henta) {
      const ar = (o.dato || '').slice(0, 4) || 'Ukjent';
      const md = (o.dato || '').slice(0, 7) || 'Ukjent';
      if (!byAr.has(ar)) byAr.set(ar, new Map());
      const mnd = byAr.get(ar)!;
      if (!mnd.has(md)) mnd.set(md, []);
      mnd.get(md)!.push(o);
    }
    return [...byAr.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([ar, mndMap]) => ({
        ar,
        tal: [...mndMap.values()].reduce((n, arr) => n + arr.length, 0),
        maneder: [...mndMap.entries()]
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([md, arr]) => ({
            md,
            namn: MND[Number(md.slice(5, 7)) - 1] || md,
            ordrar: arr.slice().sort((a, b) => (a.dato < b.dato ? 1 : -1)),
          })),
      }));
  }, [orders]);

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
        <div style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 21 }}>Bestillingar</div>
        <button
          onClick={() => setOrderTarget('new')}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
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
              padding: '7px 14px', borderRadius: 11, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f.key ? 'var(--brand-strong)' : 'var(--surface)', color: filter === f.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter !== 'henta' && (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'auto' }}>
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
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.fg, background: s.bg, padding: '3px 9px', borderRadius: 9, textTransform: 'uppercase' }}>{s.tekst}</span>
                    {o.varsla && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>Varsla {datoKort(o.varsla)}</div>}
                  </td>
                  <td style={{ ...td, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {kanVarsle && (
                      <button onClick={() => setNotifyTarget(o)} title="Varsle kunde" style={{ ...iconBtn(o.varsla ? '#e8f5ee' : '#fdf2e0'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={15} /></button>
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
      )}

      {filter === 'henta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hentaGrupper.length === 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px', fontSize: 13, color: 'var(--text-muted)' }}>
              Ingen henta bestillingar enno.
            </div>
          )}
          {hentaGrupper.map((g) => {
            const arOpen = openYear === g.ar;
            return (
              <div key={g.ar} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
                <button
                  onClick={() => { setOpenYear(arOpen ? null : g.ar); setOpenMonth(null); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', width: 14 }}>{arOpen ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Geist'" }}>{g.ar}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-alt)', borderRadius: 10, padding: '2px 9px' }}>{g.tal} henta</span>
                </button>

                {arOpen && (
                  <div style={{ borderTop: '1px solid var(--divider)', padding: '6px 10px 10px' }}>
                    {g.maneder.map((m) => {
                      const mdOpen = openMonth === m.md;
                      return (
                        <div key={m.md}>
                          <button
                            onClick={() => setOpenMonth(mdOpen ? null : m.md)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 14 }}>{mdOpen ? '▾' : '▸'}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 600, textTransform: 'capitalize' }}>{m.namn}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{m.ordrar.length} stk</span>
                          </button>
                          {mdOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 6px 10px' }}>
                              {m.ordrar.map((o) => (
                                <button
                                  key={o.id}
                                  onClick={() => setOrderTarget(o)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-alt)', cursor: 'pointer', textAlign: 'left' }}
                                >
                                  <span style={{ fontSize: 13, fontWeight: 600, flex: 'none', minWidth: 0 }}>{o.kunde}</span>
                                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.vare}</span>
                                  {o.antal > 1 && <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>×{o.antal}</span>}
                                  <span style={{ fontSize: 11.5, color: 'var(--text-faint)', flex: 'none' }}>{datoKort(o.dato)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {orderTarget && <OrderModal existing={orderTarget === 'new' ? undefined : orderTarget} onClose={() => setOrderTarget(null)} />}
      {notifyTarget && <NotifyModal order={notifyTarget} onClose={() => setNotifyTarget(null)} />}
    </div>
  );
}

const th: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.3px' };
const td: CSSProperties = { padding: '10px 12px' };
const iconBtn = (bg: string): CSSProperties => ({ width: 30, height: 30, border: 'none', background: bg, borderRadius: 11, cursor: 'pointer', fontSize: 13 });
