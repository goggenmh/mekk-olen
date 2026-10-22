import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { DOC_KAT, DOC_KATEGORIER } from '../../constants';
import { Icon } from '../ui/Icon';
import { datoKort } from '../../lib/dates';
import { DocLenke } from './DocLenke';
import { DocModal } from './DocModal';
import type { Doc } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { erLeiar } from '../../lib/view';
import { krevStadfesting } from '../../lib/dokument';

const FILTERS = ['Alle', ...DOC_KATEGORIER];

export function Dokument() {
  const { docs, stadfestingar, stadfestDoc } = useAppData();
  const { user } = useAuth();
  const { ansatte } = useAnsatte();
  const leiar = erLeiar(user);
  const [jobbar, setJobbar] = useState<string | null>(null);
  const stadfest = async (id: string) => {
    setJobbar(id);
    try { await stadfestDoc(id); } catch { window.alert('Kunne ikkje lagre stadfestinga. Prøv igjen.'); } finally { setJobbar(null); }
  };
  const manglarMine = docs.filter((d) => krevStadfesting(d) && !stadfestingar.some((s) => s.docId === d.id && s.ansatt === user?.id)).length;
  const [filter, setFilter] = useState('Alle');
  const [docTarget, setDocTarget] = useState<Doc | 'new' | null>(null);

  const [sok, setSok] = useState('');
  const q = sok.trim().toLowerCase();
  const filtered = docs
    .filter((d) => filter === 'Alle' || d.kategori === filter)
    .filter((d) => !q || [d.tittel, d.notat, d.fil_namn].some((f) => (f || '').toLowerCase().includes(q)));

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="sidetittel">Dokument</div>
        <button
          onClick={() => setDocTarget('new')}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Nytt dokument
        </button>
      </div>

      {manglarMine > 0 && (
        <div role="status" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '11px 14px', fontSize: 13.5 }}>
          <b>{manglarMine} HMS-dokument</b> ventar på at du stadfestar at du har lese {manglarMine === 1 ? 'det' : 'dei'}.
        </div>
      )}

      <input
        type="search"
        value={sok}
        onChange={(e) => setSok(e.target.value)}
        placeholder="Søk i dokument …"
        aria-label="Søk i dokument"
        style={{ padding: '10px 13px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text)', maxWidth: 420 }}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f ? 'var(--brand-strong)' : 'var(--surface)', color: filter === f ? 'var(--on-brand)' : 'var(--text-secondary)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
        {filtered.map((d) => {
          const k = DOC_KAT[d.kategori] || DOC_KAT.Anna;
          return (
            <div
              key={d.id}
              className="hoverable"
              onClick={() => setDocTarget(d)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ display: 'flex', color: k.fg }}><Icon name={k.ikon} size={18} /></span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: k.fg, background: k.bg, padding: '2px 8px', borderRadius: 'var(--r)', textTransform: 'uppercase' }}>{d.kategori}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{d.tittel}</div>
              {d.notat && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{d.notat}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{datoKort(d.dato)}</div>
              {d.fil_url && (
                <DocLenke filUrl={d.fil_url} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand-strong)', marginTop: 6 }}>
                  <Icon name="paperclip" size={13} /> {d.fil_namn}
                </DocLenke>
              )}
              {krevStadfesting(d) && (() => {
                const mi = stadfestingar.find((s) => s.docId === d.id && s.ansatt === user?.id);
                const lese = ansatte.filter((a) => stadfestingar.some((s) => s.docId === d.id && s.ansatt === a.id));
                const ikkje = ansatte.filter((a) => !lese.includes(a));
                return (
                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'default' }}>
                    {mi ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2f9e6f' }}>✓ Du stadfesta {datoKort(mi.stadfestaAt.slice(0, 10))}</span>
                    ) : (
                      <button
                        onClick={() => stadfest(d.id)}
                        disabled={jobbar === d.id}
                        style={{ alignSelf: 'flex-start', padding: '7px 12px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {jobbar === d.id ? 'Lagrar …' : 'Eg har lese dette'}
                      </button>
                    )}
                    {leiar && (
                      <span title={ikkje.length ? `Manglar: ${ikkje.map((a) => a.navn).join(', ')}` : 'Alle har lese'} style={{ fontSize: 11.5, color: ikkje.length ? 'var(--text-muted)' : '#2f9e6f' }}>
                        Lese av {lese.length}/{ansatte.length}{ikkje.length ? ` · manglar `+ikkje.map((a) => a.navn).join(', ') : ''}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen dokument.</div>}
      </div>

      {docTarget && <DocModal existing={docTarget === 'new' ? undefined : docTarget} onClose={() => setDocTarget(null)} />}
    </div>
  );
}
