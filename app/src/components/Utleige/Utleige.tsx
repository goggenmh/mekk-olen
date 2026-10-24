import { useState } from 'react';
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
import { UtleigeRapport } from './UtleigeRapport';

type Fane = 'oversikt' | 'kalender' | 'utstyr' | 'reservasjonar' | 'kundar' | 'rapport' | 'innstillingar';
const FANER: { key: Fane; tekst: string; berreLeiar?: boolean }[] = [
  { key: 'oversikt', tekst: 'Oversikt' },
  { key: 'kalender', tekst: 'Kalender' },
  { key: 'reservasjonar', tekst: 'Reservasjonar' },
  { key: 'utstyr', tekst: 'Utstyr' },
  { key: 'kundar', tekst: 'Kundar' },
  { key: 'rapport', tekst: 'Rapport', berreLeiar: true },
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
  // Fane i ordrelista på driftstavla (Quipli-stil: Alle / Skal ut / Skal inn / …).
  const [oversiktFane, setOversiktFane] = useState<'alle' | 'ut' | 'inn' | 'forseinka' | 'nye' | 'forleng'>('alle');

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
  // Nøkkeltal til driftstavla.
  const utleigdNo = reservasjonar.filter((r) => r.status === 'utleigd' || r.status === 'forseinka').length;
  const einingarUt = new Set(reservasjonar.filter((r) => r.status === 'utleigd' || r.status === 'forseinka').map((r) => r.eining_id)).size;
  const belegg = einingar.length ? Math.round((einingarUt / einingar.length) * 100) : 0;
  // Driftstavla si ordreliste: fanene og tala, og hurtighandling per rad.
  const forseinkaIds = new Set(forseinka.map((r) => r.id));
  const utTal = reservasjonar.filter((r) => r.status === 'stadfesta' || r.status === 'klar').length;
  const innTal = reservasjonar.filter((r) => r.status === 'utleigd' || r.status === 'forseinka').length;
  const aktiveTal = reservasjonar.filter((r) => ['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka', 'kontroll'].includes(r.status)).length;
  const forlengTal = reservasjonar.filter((r) => !!r.forleng_til).length;
  const oversiktListe = oversiktFane === 'ut' ? reservasjonar.filter((r) => r.status === 'stadfesta' || r.status === 'klar').sort((a, b) => a.start.localeCompare(b.start))
    : oversiktFane === 'inn' ? reservasjonar.filter((r) => r.status === 'utleigd' || r.status === 'forseinka').sort((a, b) => a.slutt.localeCompare(b.slutt))
    : oversiktFane === 'forseinka' ? forseinka.slice().sort((a, b) => a.slutt.localeCompare(b.slutt))
    : oversiktFane === 'forleng' ? reservasjonar.filter((r) => !!r.forleng_til).sort((a, b) => a.start.localeCompare(b.start))
    : oversiktFane === 'nye' ? nye
    : reservasjonar.filter((r) => ['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka', 'kontroll'].includes(r.status)).sort((a, b) => a.start.localeCompare(b.start));
  const oversiktFaner: [typeof oversiktFane, string][] = [['alle', `Alle (${aktiveTal})`], ['ut', `Skal ut (${utTal})`], ['inn', `Skal inn (${innTal})`], ['forseinka', `Forseinka (${forseinka.length})`], ['nye', `Nye (${nye.length})`]];
  if (forlengTal > 0) oversiktFaner.push(['forleng', `Forlenging (${forlengTal})`]);
  const hurtig = (r: UtleigeReservasjon) => {
    const stil = (primar: boolean) => ({ padding: '7px 12px', borderRadius: 'var(--r)', border: primar ? 'none' : '1px solid var(--border)', background: primar ? 'var(--brand-strong)' : 'var(--surface)', color: primar ? 'var(--on-brand)' : 'var(--text-secondary)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' as const });
    if (r.status === 'ny') return <button onClick={() => data.settStatus(r, 'stadfesta', 'Stadfesta – kunden får e-post')} style={stil(true)}>Godkjenn</button>;
    if (r.status === 'stadfesta' || r.status === 'klar') return <button onClick={() => data.settStatus(r, 'utleigd', 'Utlevert')} style={stil(true)}>Utlevering</button>;
    if (r.status === 'utleigd' || r.status === 'forseinka') return <button onClick={() => setOpne(r)} style={stil(false)}>Retur</button>;
    return null;
  };

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 10 }}>
              <Kpi tal={`${belegg}%`} label="Belegg no" />
              <Kpi tal={utleigdNo} label="Utleigd no" onClick={() => setOversiktFane('inn')} />
              <Kpi tal={nye.length} label="Opne førespurnader" tone={nye.length ? 'amber' : undefined} onClick={() => setOversiktFane('nye')} />
              <Kpi tal={utleveringar.length} label="Skal ut i dag" onClick={() => setOversiktFane('ut')} />
              <Kpi tal={returar.length} label="Skal inn i dag" onClick={() => setOversiktFane('inn')} />
              <Kpi tal={forseinka.length} label="Forseinka" tone={forseinka.length ? 'raud' : undefined} onClick={() => setOversiktFane('forseinka')} />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {oversiktFaner.map(([k, l]) => (
                <button key={k} onClick={() => setOversiktFane(k)} aria-pressed={oversiktFane === k}
                  style={{ padding: '7px 13px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap',
                    background: oversiktFane === k ? 'var(--brand-strong)' : 'var(--surface)', color: oversiktFane === k ? 'var(--on-brand)' : 'var(--text-secondary)' }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oversiktListe.length === 0 && <div style={{ ...kortStil, color: 'var(--text-muted)', fontSize: 13.5 }}>Ingen reservasjonar i denne lista.</div>}
              {oversiktListe.map((r) => {
                const frist = new Date(r.created_at).getTime() + (data.innstillingar?.svarfrist_timar ?? 48) * 3600e3;
                const over = frist < no;
                const seinka = forseinkaIds.has(r.id);
                return (
                  <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>{rad(r)}</div>
                      {hurtig(r)}
                    </div>
                    {r.status === 'ny' && (
                      <span style={{ fontSize: 11.5, fontWeight: 800, paddingLeft: 2, color: over ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {over ? 'Over svarfristen – maskina blir frigjeven automatisk' : `Svar innan ${tidKort(new Date(frist).toISOString())}`}
                      </span>
                    )}
                    {(r.status === 'utleigd' || r.status === 'forseinka') && (
                      <span style={{ fontSize: 11.5, fontWeight: 700, paddingLeft: 2, color: seinka ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {seinka ? `Forseinka – skulle vore levert ${tidKort(r.slutt)}` : `Retur ${tidKort(r.slutt)}`}
                      </span>
                    )}
                    {r.forleng_til && (
                      <span style={{ fontSize: 11.5, fontWeight: 800, paddingLeft: 2, color: 'var(--pill-amber-fg)' }}>
                        Ber om forlenging til {tidKort(r.forleng_til)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {sperra.length > 0 && (
              <div style={kortStil}>
                <div style={{ ...kortLabel, display: 'flex', gap: 8 }}>Sperra utstyr<span style={{ color: 'var(--text-muted)' }}>{sperra.length}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                </div>
              </div>
            )}
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
      {fane === 'rapport' && erLeiar && <UtleigeRapport data={data} />}
      {fane === 'innstillingar' && erLeiar && <UtleigeInnstillingarSide data={data} />}

      {opne && <ReservasjonModal data={data} res={opne === 'ny' ? null : opne} onClose={() => setOpne(null)} />}
    </div>
  );
}

function Kpi({ tal, label, tone, onClick }: { tal: number | string; label: string; tone?: 'amber' | 'raud'; onClick?: () => void }) {
  const farge = tone === 'raud' ? 'var(--danger)' : tone === 'amber' ? 'var(--pill-amber-fg)' : 'var(--text)';
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      style={{ ...kortStil, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit' }}>
      <span style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: farge }}>{tal}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
    </button>
  );
}
