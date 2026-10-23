import { useState, type ReactNode } from 'react';
import { kortStil, kortLabel } from './stil';
import { StatusMerke } from './StatusMerke';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useIsMobile } from '../../lib/useIsMobile';
import { today } from '../../lib/dates';
import { EINING_STATUS, einingStatusNo, kr, nr, tidKort, type UtleigeReservasjon } from '../../lib/utleige';
import { useUtleige } from './useUtleige';
import { ReservasjonModal } from './ReservasjonModal';
import { UtleigeKalender } from './UtleigeKalender';
import { UtleigeUtstyr } from './UtleigeUtstyr';
import { UtleigeKundar } from './UtleigeKundar';
import { UtleigeInnstillingarSide } from './UtleigeInnstillingar';

type Fane = 'oversikt' | 'kalender' | 'utstyr' | 'reservasjonar' | 'kundar' | 'innstillingar';
const FANER: { key: Fane; tekst: string; berreLeiar?: boolean }[] = [
  { key: 'oversikt', tekst: 'Oversikt' },
  { key: 'kalender', tekst: 'Kalender' },
  { key: 'reservasjonar', tekst: 'Reservasjonar' },
  { key: 'utstyr', tekst: 'Utstyr' },
  { key: 'kundar', tekst: 'Kundar' },
  { key: 'innstillingar', tekst: 'Innstillingar', berreLeiar: true },
];

export function Utleige() {
  const data = useUtleige();
  const { canApprove } = useAppData();
  const { user } = useAuth();
  const erLeiar = canApprove(user?.id);
  const isMobile = useIsMobile();
  const [fane, setFane] = useState<Fane>('oversikt');
  const [opne, setOpne] = useState<UtleigeReservasjon | 'ny' | null>(null);
  const [filter, setFilter] = useState<'aktive' | 'ny' | 'alle'>('aktive');
  const [sok, setSok] = useState('');
  // Tidspunktet sida vart opna (forseinka = utleigd med returtid før dette).
  const [no] = useState(() => Date.now());

  const { produkt, einingar, kundar, reservasjonar, lastar, feil } = data;
  const finnProdukt = (id: string) => produkt.find((p) => p.id === id);
  const finnEining = (id: string) => einingar.find((e) => e.id === id);
  const finnKunde = (id: string) => kundar.find((k) => k.id === id);

  const rad = (r: UtleigeReservasjon, tid?: string) => (
    <button key={r.id} onClick={() => setOpne(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {finnProdukt(r.produkt_id)?.namn ?? 'Ukjent'} <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>· {finnEining(r.eining_id)?.kode}</span>
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
          {nr(r)} · {finnKunde(r.kunde_id)?.namn ?? '–'} · {tid ?? `${tidKort(r.start)} – ${tidKort(r.slutt)}`}
        </span>
      </span>
      <StatusMerke status={r.status} />
    </button>
  );

  if (lastar) return <div className="side" style={{ color: 'var(--text-muted)' }}>Lastar utleige …</div>;
  if (feil) return <div className="side" style={{ color: 'var(--danger)' }}>Kunne ikkje laste utleige: {feil}</div>;

  const t = today();
  const dagAv = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const nye = reservasjonar.filter((r) => r.status === 'ny').sort((a, b) => a.start.localeCompare(b.start));
  const utleveringar = reservasjonar.filter((r) => ['stadfesta', 'klar'].includes(r.status) && dagAv(r.start) <= t).sort((a, b) => a.start.localeCompare(b.start));
  const returar = reservasjonar.filter((r) => r.status === 'utleigd' && dagAv(r.slutt) === t);
  const forseinka = reservasjonar.filter((r) => r.status === 'forseinka' || (r.status === 'utleigd' && new Date(r.slutt).getTime() < no));
  const sperra = einingar.filter((e) => e.status !== 'tilgjengeleg');

  const sokLc = sok.trim().toLowerCase();
  const liste = reservasjonar.filter((r) => filter === 'alle' || (filter === 'ny' ? r.status === 'ny' : ['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka', 'kontroll'].includes(r.status)))
    .filter((r) => !sokLc || `${nr(r)} ${finnProdukt(r.produkt_id)?.namn ?? ''} ${finnEining(r.eining_id)?.kode ?? ''} ${finnKunde(r.kunde_id)?.namn ?? ''}`.toLowerCase().includes(sokLc))
    .sort((a, b) => (filter === 'alle' ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)));

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="sidetittel">Utleige</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Kundesida: <a href="/utleige" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', fontWeight: 700 }}>{window.location.origin}/utleige</a>
            {data.innstillingar && !data.innstillingar.offentleg && <span style={{ color: 'var(--danger)', fontWeight: 700 }}> (ikkje open – slå på under Innstillingar)</span>}
          </div>
        </div>
        <button onClick={() => setOpne('ny')} disabled={produkt.length === 0} style={{ padding: '9px 16px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 900, cursor: 'pointer', opacity: produkt.length === 0 ? 0.5 : 1 }}>
          + Ny reservasjon
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%', paddingBottom: 2 }}>
        {FANER.filter((f) => !f.berreLeiar || erLeiar).map((f) => (
          <button key={f.key} onClick={() => setFane(f.key)} aria-pressed={fane === f.key}
            style={{ padding: '8px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              background: fane === f.key ? 'var(--brand-strong)' : 'var(--surface)', color: fane === f.key ? 'var(--on-brand)' : 'var(--text-secondary)' }}>
            {f.tekst}{f.key === 'reservasjonar' && nye.length > 0 ? ` (${nye.length} nye)` : ''}
          </button>
        ))}
      </div>

      {fane === 'oversikt' && (
        produkt.length === 0 ? (
          <div style={kortStil}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Kom i gang</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {erLeiar ? 'Legg inn utstyr under «Utstyr» (med éi eller fleire einingar), skriv leigevilkår under «Innstillingar» og slå på kundesida.' : 'Leiaren må leggje inn utleigeutstyret først.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, alignItems: 'start' }}>
            <Seksjon tittel="Nye førespurnader" tal={nye.length} tom="Ingen nye førespurnader.">
              {nye.map((r) => {
                const frist = new Date(r.created_at).getTime() + (data.innstillingar?.svarfrist_timar ?? 48) * 3600e3;
                const over = frist < no;
                return (
                  <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {rad(r)}
                    <span style={{ fontSize: 11.5, fontWeight: 800, paddingLeft: 2, color: over ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {over ? 'Over svarfristen – maskina blir frigjeven automatisk' : `Svar innan ${tidKort(new Date(frist).toISOString())}`}
                    </span>
                  </div>
                );
              })}
            </Seksjon>
            <Seksjon tittel="Forseinka returar" tal={forseinka.length} tom="Ingen forseinka returar.">{forseinka.map((r) => rad(r, `skulle vore levert ${tidKort(r.slutt)}`))}</Seksjon>
            <Seksjon tittel="Utleveringar i dag" tal={utleveringar.length} tom="Ingen utleveringar i dag.">{utleveringar.map((r) => rad(r, `hentar ${tidKort(r.start)}`))}</Seksjon>
            <Seksjon tittel="Forventa returar i dag" tal={returar.length} tom="Ingen returar i dag.">{returar.map((r) => rad(r, `kjem ${tidKort(r.slutt)}`))}</Seksjon>
            <Seksjon tittel="Sperra utstyr" tal={sperra.length} tom="Alt utstyr er tilgjengeleg.">
              {sperra.map((e) => {
                const s = EINING_STATUS[einingStatusNo(e, reservasjonar)];
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800 }}>{finnProdukt(e.produkt_id)?.namn} <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>· {e.kode}</span></span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: s.fg, background: s.bg }}>{s.tekst}</span>
                    <button onClick={() => data.frigjer(e.id)} style={{ padding: '5px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>Klar</button>
                  </div>
                );
              })}
            </Seksjon>
          </div>
        )
      )}

      {fane === 'kalender' && <UtleigeKalender data={data} onOpne={(r) => setOpne(r)} />}

      {fane === 'reservasjonar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {([['aktive', 'Aktive'], ['ny', `Nye (${nye.length})`], ['alle', 'Alle']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
                style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: filter === k ? 'var(--brand-soft)' : 'var(--surface)', color: filter === k ? 'var(--brand-strong)' : 'var(--text-secondary)' }}>
                {l}
              </button>
            ))}
            <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk kunde, utstyr, kode eller U-nr"
              style={{ marginLeft: 'auto', minWidth: 200, padding: '7px 11px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
          </div>
          {liste.length === 0 && <div style={{ ...kortStil, color: 'var(--text-muted)', fontSize: 13.5 }}>Ingen reservasjonar her.</div>}
          {liste.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>{rad(r)}</div>
              {!isMobile && <span style={{ fontSize: 13, fontWeight: 700, width: 110, textAlign: 'right' }}>{kr(r.pris_total)}</span>}
            </div>
          ))}
        </div>
      )}

      {fane === 'utstyr' && <UtleigeUtstyr data={data} erLeiar={erLeiar} />}
      {fane === 'kundar' && <UtleigeKundar data={data} onOpne={(r) => setOpne(r)} />}
      {fane === 'innstillingar' && erLeiar && <UtleigeInnstillingarSide data={data} />}

      {opne && <ReservasjonModal data={data} res={opne === 'ny' ? null : opne} onClose={() => setOpne(null)} />}
    </div>
  );
}

function Seksjon({ tittel, tal, children, tom }: { tittel: string; tal: number; children: ReactNode; tom: string }) {
  return (
    <div style={kortStil}>
      <div style={{ ...kortLabel, display: 'flex', gap: 8 }}>{tittel}<span style={{ color: 'var(--text-muted)' }}>{tal}</span></div>
      {tal === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tom}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>}
    </div>
  );
}
