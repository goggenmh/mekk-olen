import { RES_STATUS, type UtleigeReservasjon } from '../../lib/utleige';

export function StatusMerke({ status }: { status: UtleigeReservasjon['status'] }) {
  const s = RES_STATUS[status];
  return <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: s.fg, background: s.bg, whiteSpace: 'nowrap' }}>{s.tekst}</span>;
}
