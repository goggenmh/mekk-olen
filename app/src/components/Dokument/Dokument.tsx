import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { DOC_KAT, DOC_KATEGORIER } from '../../constants';
import { Icon } from '../ui/Icon';
import { datoKort } from '../../lib/dates';
import { safeHref } from '../../lib/url';
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

  const filtered = docs.filter((d) => filter === 'Alle' || d.kategori === filter);

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: "'Geist Variable'", fontWeight: 800, fontSize: 25, letterSpacing: '-0.3px' }}>Dokument</div>
        <button
          onClick={() => setDocTarget('new')}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Nytt dokument
        </button>
      </div>

      {manglarMine > 0 && (
        <div role="status" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>
          <b>{manglarMine} HMS-dokument</b> ventar på at du stadfestar at du har lese {manglarMine === 1 ? 'det' : 'dei'}.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
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
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ display: 'flex', color: k.fg }}><Icon name={k.ikon} size={18} /></span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: k.fg, background: k.bg, padding: '2px 8px', borderRadius: 9, textTransform: 'uppercase' }}>{d.kategori}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{d.tittel}</div>
              {d.notat && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{d.notat}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{datoKort(d.dato)}</div>
              {d.fil_url && (
                <a
                  href={safeHref(d.fil_url)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand-strong)', marginTop: 6 }}
                >
                  <Icon name="paperclip" size={13} /> {d.fil_namn}
                </a>
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
                        style={{ alignSelf: 'flex-start', padding: '7px 12px', background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
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
