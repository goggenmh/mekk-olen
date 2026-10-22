import { useState } from 'react';
import { addDays, today, mondayOf, parseDate, UKE_KORT, weekdayIdx, MND } from '../../lib/dates';
import { useIsMobile } from '../../lib/useIsMobile';
import { RES_STATUS, SPERRE_GRUNN, nr, tidKort, type UtleigeReservasjon } from '../../lib/utleige';
import type { UtleigeData } from './useUtleige';
import { kortStil, knapp } from './stil';

type Visning = 'dag' | 'veke' | 'manad';

/** Lokal midnatt for ein dato (ÅÅÅÅ-MM-DD) som tidspunkt i ms. */
const midnatt = (d: string) => parseDate(d).getTime();

/**
 * Kalender per fysisk eining: reservasjonar som fargelagde stolpar etter
 * status, sperrer (vedlikehald o.l.) skraverte. Dag, veke eller månad.
 */
export function UtleigeKalender({ data, onOpne }: { data: UtleigeData; onOpne: (r: UtleigeReservasjon) => void }) {
  const isMobile = useIsMobile();
  const [visning, setVisning] = useState<Visning>(isMobile ? 'dag' : 'veke');
  const [anker, setAnker] = useState(today());
  const { produkt, einingar, reservasjonar, sperrer, kundar } = data;

  const fraDato = visning === 'dag' ? anker : visning === 'veke' ? mondayOf(anker) : `${anker.slice(0, 7)}-01`;
  const antalDagar = visning === 'dag' ? 1 : visning === 'veke' ? 7 : new Date(Number(anker.slice(0, 4)), Number(anker.slice(5, 7)), 0).getDate();
  const dagar = Array.from({ length: antalDagar }, (_, i) => addDays(fraDato, i));
  // Dagvising: 07–21 er nok for ein butikk.
  const fra = visning === 'dag' ? midnatt(fraDato) + 7 * 3600e3 : midnatt(fraDato);
  const til = visning === 'dag' ? midnatt(fraDato) + 21 * 3600e3 : midnatt(addDays(fraDato, antalDagar));
  const span = til - fra;

  const plass = (startIso: string, sluttIso: string | null) => {
    const s = Math.max(new Date(startIso).getTime(), fra);
    const e = Math.min(sluttIso ? new Date(sluttIso).getTime() : til, til);
    if (e <= s) return null;
    return { left: `${((s - fra) / span) * 100}%`, width: `${Math.max(((e - s) / span) * 100, 0.8)}%` };
  };

  const flytt = (n: number) => {
    if (visning === 'dag') setAnker(addDays(anker, n));
    else if (visning === 'veke') setAnker(addDays(anker, 7 * n));
    else { const d = parseDate(anker); d.setMonth(d.getMonth() + n, 1); setAnker(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`); }
  };
  const tittel = visning === 'dag'
    ? `${UKE_KORT[weekdayIdx(anker)]} ${parseDate(anker).getDate()}. ${MND[parseDate(anker).getMonth()]}`
    : visning === 'veke' ? `${parseDate(dagar[0]).getDate()}.–${parseDate(dagar[6]).getDate()}. ${MND[parseDate(dagar[6]).getMonth()]}`
    : `${MND[parseDate(fraDato).getMonth()]} ${fraDato.slice(0, 4)}`;

  const timar = visning === 'dag' ? Array.from({ length: 14 }, (_, i) => 7 + i) : [];
  const etikettBreidd = isMobile ? 92 : 170;
  const t = today();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => flytt(-1)} style={knapp()} aria-label="Førre">‹</button>
        <div style={{ fontWeight: 800, fontSize: 15, minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>{tittel}</div>
        <button onClick={() => flytt(1)} style={knapp()} aria-label="Neste">›</button>
        <button onClick={() => setAnker(today())} style={knapp()}>I dag</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['dag', 'veke', 'manad'] as const).map((v) => (
            <button key={v} onClick={() => setVisning(v)} aria-pressed={visning === v}
              style={{ ...knapp(visning === v), padding: '7px 12px' }}>{v === 'dag' ? 'Dag' : v === 'veke' ? 'Veke' : 'Månad'}</button>
          ))}
        </div>
      </div>

      <div style={{ ...kortStil, padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: visning === 'manad' ? 900 : 560 }}>
          {/* Hovud: dagar eller timar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)', background: 'var(--surface-alt)' }}>
            <div style={{ width: etikettBreidd, flex: 'none' }} />
            <div style={{ flex: 1, display: 'flex' }}>
              {(visning === 'dag' ? timar.map((h) => String(h).padStart(2, '0')) : dagar).map((d) => {
                const erIdag = visning !== 'dag' && d === t;
                return (
                  <div key={d} style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontSize: 10.5, fontWeight: 800, color: erIdag ? 'var(--brand-strong)' : 'var(--text-label)', background: erIdag ? 'var(--brand-soft)' : undefined, borderLeft: '1px solid var(--divider)' }}>
                    {visning === 'dag' ? d : visning === 'manad' ? parseDate(d).getDate() : `${UKE_KORT[weekdayIdx(d)]} ${parseDate(d).getDate()}`}
                  </div>
                );
              })}
            </div>
          </div>

          {einingar.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>Ingen einingar enno.</div>}
          {produkt.map((p) => {
            const mine = einingar.filter((e) => e.produkt_id === p.id);
            if (mine.length === 0) return null;
            return (
              <div key={p.id}>
                <div style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--kort-label)', background: 'var(--surface)', borderBottom: '1px solid var(--divider)' }}>{p.namn}</div>
                {mine.map((e) => (
                  <div key={e.id} style={{ display: 'flex', borderBottom: '1px solid var(--divider)', minHeight: 40 }}>
                    <div style={{ width: etikettBreidd, flex: 'none', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.kode}</div>
                    <div style={{ flex: 1, position: 'relative', backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent calc(100% / ${visning === 'dag' ? 14 : antalDagar} - 1px), var(--divider) calc(100% / ${visning === 'dag' ? 14 : antalDagar} - 1px), var(--divider) calc(100% / ${visning === 'dag' ? 14 : antalDagar}))` }}>
                      {sperrer.filter((s) => s.eining_id === e.id).map((s) => {
                        const pos = plass(s.start, s.slutt);
                        return pos && (
                          <div key={s.id} title={`${SPERRE_GRUNN[s.grunn]}${s.notat ? `: ${s.notat}` : ''}`}
                            style={{ position: 'absolute', top: 6, bottom: 6, ...pos, borderRadius: 'var(--r-sm)', background: 'repeating-linear-gradient(45deg, var(--pill-raud-bg), var(--pill-raud-bg) 6px, transparent 6px, transparent 12px)', border: '1px solid var(--danger-border)', fontSize: 10.5, fontWeight: 800, color: 'var(--pill-raud-fg)', padding: '0 5px', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {SPERRE_GRUNN[s.grunn]}
                          </div>
                        );
                      })}
                      {reservasjonar.filter((r) => r.eining_id === e.id && !['avbestilt', 'avslatt'].includes(r.status)).map((r) => {
                        const pos = plass(r.start, r.slutt);
                        if (!pos) return null;
                        const st = RES_STATUS[r.status];
                        const kunde = kundar.find((k) => k.id === r.kunde_id)?.namn ?? '';
                        return (
                          <button key={r.id} onClick={() => onOpne(r)} title={`${nr(r)} ${kunde} · ${tidKort(r.start)} – ${tidKort(r.slutt)} · ${st.tekst}`}
                            style={{ position: 'absolute', top: 5, bottom: 5, ...pos, borderRadius: 'var(--r-sm)', border: r.status === 'ny' ? `2px dashed ${st.farge}` : 'none', background: r.status === 'ny' ? 'var(--pill-amber-bg)' : st.farge, color: r.status === 'ny' ? 'var(--pill-amber-fg)' : '#ffffff', fontSize: 11, fontWeight: 800, padding: '0 6px', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {kunde || nr(r)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
        {(['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka', 'returnert', 'kontroll'] as const).map((s) => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 2, background: s === 'ny' ? 'var(--pill-amber-bg)' : RES_STATUS[s].farge, border: s === 'ny' ? `2px dashed ${RES_STATUS.ny.farge}` : 'none' }} />{RES_STATUS[s].tekst}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 11, height: 11, borderRadius: 2, background: 'repeating-linear-gradient(45deg, var(--pill-raud-bg), var(--pill-raud-bg) 3px, transparent 3px, transparent 6px)', border: '1px solid var(--danger-border)' }} />Sperra
        </span>
      </div>
    </div>
  );
}
