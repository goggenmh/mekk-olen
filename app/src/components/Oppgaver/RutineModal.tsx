import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { PRIORITET, OPPGAVE_KATEGORIAR, type Prioritet } from '../../constants';
import { ANSVAR_SPESIELL, RUTINE_MALAR, VEKEDAGAR, rutineTekst } from '../../lib/oppgave';
import type { Rutine } from '../../types';

type Utkast = Omit<Rutine, 'id'> & { id?: string };

const TOM: Utkast = { tittel: '', detalj: '', kategori: 'Butikk', prioritet: 'medium', ansvar: 'ufordelt', dagar: [1, 2, 3, 4, 5, 6], manadsdag: null, sjekkliste: [], aktiv: true };

/** Leiaren set opp faste rutinar som blir til oppgåver automatisk på rett dag. */
export function RutineModal({ onClose }: { onClose: () => void }) {
  const { rutinar, saveRutine, deleteRutine } = useAppData();
  const { findAnsatt } = useAnsatte();
  const [utkast, setUtkast] = useState<Utkast | null>(null);

  if (utkast) return <RutineSkjema utkast={utkast} onTilbake={() => setUtkast(null)} onLagre={async (r) => { await saveRutine(r); setUtkast(null); }} onSlett={utkast.id ? async () => { await deleteRutine(utkast.id!); setUtkast(null); } : undefined} />;

  const ansvarTekst = (a: string) => ANSVAR_SPESIELL[a]?.split(' (')[0] ?? findAnsatt(a).navn;
  const brukteMalar = new Set(rutinar.map((r) => r.tittel));

  return (
    <Modal onClose={onClose} maxWidth={520} title="Faste rutinar" subtitle="Blir til oppgåver automatisk på rett dag" footer={<><CancelButton onClick={onClose}>Lukk</CancelButton><SaveButton onClick={() => setUtkast({ ...TOM })}>+ Ny rutine</SaveButton></>}>
      {rutinar.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen rutinar enno. Start med ein mal under.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rutinar.map((r) => (
          <button
            key={r.id}
            onClick={() => setUtkast({ ...r })}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', opacity: r.aktiv ? 1 : 0.55, color: 'var(--text)' }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{r.tittel}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {rutineTekst(r)} · {ansvarTekst(r.ansvar)}{r.aktiv ? '' : ' · på pause'}
              </span>
            </span>
            <span style={{ color: 'var(--text-faint)' }}>›</span>
          </button>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-label)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 8 }}>Rutine frå mal</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
          {RUTINE_MALAR.map((m) => (
            <button
              key={m.tittel}
              onClick={() => setUtkast({ ...m, aktiv: true, sjekkliste: m.sjekkliste.map((p) => ({ ...p })) })}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px dashed var(--border)', background: 'var(--surface-alt)', cursor: 'pointer', color: 'var(--text)' }}
            >
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{m.tittel}{brukteMalar.has(m.tittel) ? ' ✓' : ''}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{rutineTekst(m)} · {ansvarTekst(m.ansvar)}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function RutineSkjema({ utkast, onTilbake, onLagre, onSlett }: { utkast: Utkast; onTilbake: () => void; onLagre: (r: Utkast) => Promise<void>; onSlett?: () => Promise<void> }) {
  const { ansatte } = useAnsatte();
  const [r, setR] = useState<Utkast>(utkast);
  const [nyPunkt, setNyPunkt] = useState('');
  const [feil, setFeil] = useState('');
  const sett = (endring: Partial<Utkast>) => { setR((prev) => ({ ...prev, ...endring })); setFeil(''); };
  const manadleg = r.manadsdag !== null;

  const lagre = async () => {
    if (!r.tittel.trim()) { setFeil('Skriv inn ein tittel.'); return; }
    if (!manadleg && r.dagar.length === 0) { setFeil('Vel minst éin dag.'); return; }
    await onLagre({ ...r, tittel: r.tittel.trim() });
  };

  return (
    <Modal
      onClose={onTilbake}
      maxWidth={480}
      title={r.id ? 'Endre rutine' : 'Ny rutine'}
      footer={<>{onSlett && <DeleteButton onClick={onSlett} />}<CancelButton onClick={onTilbake}>Tilbake</CancelButton><SaveButton onClick={lagre} /></>}
    >
      <Field label="Tittel">
        <input value={r.tittel} onChange={(e) => sett({ tittel: e.target.value })} style={inputStyle} />
      </Field>
      <Field label="Beskriving">
        <textarea value={r.detalj} onChange={(e) => sett({ detalj: e.target.value })} style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
      </Field>
      <Field label="Ansvarleg">
        <select value={r.ansvar} onChange={(e) => sett({ ansvar: e.target.value })} style={inputStyle}>
          {Object.entries(ANSVAR_SPESIELL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          {ansatte.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
        </select>
      </Field>
      <Field label="Når">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['veke', 'Vekedagar'], ['manad', 'Kvar månad']] as const).map(([k, l]) => {
              const aktiv = (k === 'manad') === manadleg;
              return (
                <button key={k} type="button" onClick={() => sett({ manadsdag: k === 'manad' ? (r.manadsdag ?? 1) : null })}
                  style={{ padding: '6px 12px', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: aktiv ? 'var(--brand-strong)' : 'var(--surface)', color: aktiv ? 'var(--on-brand)' : 'var(--text-secondary)' }}>
                  {l}
                </button>
              );
            })}
          </div>
          {manadleg ? (
            <select value={r.manadsdag ?? 1} onChange={(e) => sett({ manadsdag: Number(e.target.value) })} style={inputStyle}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Den {d}.</option>)}
              <option value={31}>Siste dag i månaden</option>
            </select>
          ) : (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {VEKEDAGAR.map((namn, i) => {
                const dag = i + 1;
                const valt = r.dagar.includes(dag);
                return (
                  <button key={dag} type="button" aria-pressed={valt}
                    onClick={() => sett({ dagar: valt ? r.dagar.filter((x) => x !== dag) : [...r.dagar, dag].sort((a, b) => a - b) })}
                    style={{ width: 44, padding: '7px 0', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border)', background: valt ? 'var(--brand-soft)' : 'var(--surface)', color: valt ? 'var(--brand-strong)' : 'var(--text-muted)' }}>
                    {namn}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{rutineTekst(r)} – oppgåva får frist same dag.</div>
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Prioritet">
          <select value={r.prioritet} onChange={(e) => sett({ prioritet: e.target.value as Prioritet })} style={inputStyle}>
            {Object.entries(PRIORITET).map(([k, v]) => <option key={k} value={k}>{v.tekst}</option>)}
          </select>
        </Field>
        <Field label="Kategori">
          <select value={r.kategori} onChange={(e) => sett({ kategori: e.target.value })} style={inputStyle}>
            {OPPGAVE_KATEGORIAR.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Sjekkliste">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {r.sjekkliste.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-faint)' }}>–</span>
              <span style={{ flex: 1 }}>{p.tekst}</span>
              <button type="button" onClick={() => sett({ sjekkliste: r.sjekkliste.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 15 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={nyPunkt}
              onChange={(e) => setNyPunkt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nyPunkt.trim()) { e.preventDefault(); sett({ sjekkliste: [...r.sjekkliste, { tekst: nyPunkt.trim(), ferdig: false }] }); setNyPunkt(''); } }}
              placeholder="Legg til punkt og trykk Enter…"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={r.aktiv} onChange={(e) => sett({ aktiv: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Aktiv (lag oppgåver automatisk)</span>
      </label>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
    </Modal>
  );
}
