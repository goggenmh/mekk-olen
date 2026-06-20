import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { DOC_KAT, DOC_KATEGORIER } from '../../constants';
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
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 21 }}>Dokument</div>
        <button
          onClick={() => setDocTarget('new')}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: '#1597a8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
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
              padding: '7px 14px', borderRadius: 8, border: '1px solid #e1e8ec', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f ? '#11788a' : '#fff', color: filter === f ? '#fff' : '#566570',
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
              style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{k.ikon}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: k.fg, background: k.bg, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>{d.kategori}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{d.tittel}</div>
              {d.notat && <div style={{ fontSize: 12, color: '#7e93a0', marginBottom: 6, lineHeight: 1.4 }}>{d.notat}</div>}
              <div style={{ fontSize: 11, color: '#a4b1ba' }}>{datoKort(d.dato)}</div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ fontSize: 13, color: '#7e93a0' }}>Ingen dokument.</div>}
      </div>

      {docTarget && <DocModal existing={docTarget === 'new' ? undefined : docTarget} onClose={() => setDocTarget(null)} />}
    </div>
  );
}
