import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { DOC_KAT, DOC_KATEGORIER } from '../../constants';
import { Icon } from '../ui/Icon';
import { datoKort } from '../../lib/dates';
import { DocModal } from './DocModal';
import type { Doc } from '../../types';

const FILTERS = ['Alle', ...DOC_KATEGORIER];

export function Dokument() {
  const { docs } = useAppData();
  const [filter, setFilter] = useState('Alle');
  const [docTarget, setDocTarget] = useState<Doc | 'new' | null>(null);

  const filtered = docs.filter((d) => filter === 'Alle' || d.kategori === filter);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 21 }}>Dokument</div>
        <button
          onClick={() => setDocTarget('new')}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Nytt dokument
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px', borderRadius: 11, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f ? 'var(--brand-strong)' : 'var(--surface)', color: filter === f ? '#fff' : 'var(--text-secondary)',
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
              onClick={() => setDocTarget(d)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', cursor: 'pointer' }}
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
                  href={d.fil_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand-strong)', marginTop: 6 }}
                >
                  <Icon name="paperclip" size={13} /> {d.fil_namn}
                </a>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen dokument.</div>}
      </div>

      {docTarget && <DocModal existing={docTarget === 'new' ? undefined : docTarget} onClose={() => setDocTarget(null)} />}
    </div>
  );
}
