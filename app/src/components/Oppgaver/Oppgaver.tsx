import { useRef, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { PRIORITET, type Prioritet } from '../../constants';
import { TaskModal } from './TaskModal';
import type { Task } from '../../types';

export function Oppgaver() {
  const { tasks, moveTask, saveTask } = useAppData();
  const { ansatte } = useAnsatte();
  const [taskTarget, setTaskTarget] = useState<{ existing?: Task; defaultAnsatt?: Task['ansatt'] } | null>(null);
  const dragTaskId = useRef<string | null>(null);

  const KOL_DEF: { id: Task['ansatt']; tittel: string; farge: string }[] = [
    { id: 'ufordelt', tittel: 'Ufordelt', farge: '#9aa4b2' },
    ...ansatte.map((a) => ({ id: a.id, tittel: a.navn, farge: a.farge })),
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 21 }}>Oppgåver</div>
        <button
          onClick={() => setTaskTarget({})}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Ny oppgåve
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${KOL_DEF.length},1fr)`, gap: 14 }}>
        {KOL_DEF.map((k) => {
          const kolTasks = tasks.filter((t) => t.ansatt === k.id);
          return (
            <div
              key={k.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragTaskId.current) { moveTask(dragTaskId.current, k.id); dragTaskId.current = null; }
              }}
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 16, padding: 10, minHeight: 300, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.farge }} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{k.tittel}</span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>({kolTasks.length})</span>
              </div>
              {kolTasks.map((t) => {
                const p = PRIORITET[t.prioritet as Prioritet] || PRIORITET.medium;
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => { dragTaskId.current = t.id; }}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '10px 11px', cursor: 'grab', opacity: t.ferdig ? 0.6 : 1 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={t.ferdig}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => saveTask({ ...t, ferdig: e.target.checked })}
                        style={{ width: 15, height: 15, marginTop: 2, cursor: 'pointer', flex: 'none' }}
                      />
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setTaskTarget({ existing: t })}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textDecoration: t.ferdig ? 'line-through' : 'none' }}>{t.tittel}</div>
                        {t.detalj && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>{t.detalj}</div>}
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: p.fg, background: p.bg, padding: '2px 8px', borderRadius: 9, textTransform: 'uppercase' }}>{p.tekst}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {taskTarget && (
        <TaskModal existing={taskTarget.existing} defaultAnsatt={taskTarget.defaultAnsatt} onClose={() => setTaskTarget(null)} />
      )}
    </div>
  );
}
