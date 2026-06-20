import { useRef, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { ANSATTE, PRIORITET, type Prioritet } from '../../constants';
import { TaskModal } from './TaskModal';
import type { Task } from '../../types';

const KOL_DEF: { id: Task['ansatt']; tittel: string; farge: string }[] = [
  { id: 'ufordelt', tittel: 'Ufordelt', farge: '#9aa4b2' },
  ...ANSATTE.map((a) => ({ id: a.id, tittel: a.navn, farge: a.farge })),
];

export function Oppgaver() {
  const { tasks, moveTask } = useAppData();
  const [taskTarget, setTaskTarget] = useState<{ existing?: Task; defaultAnsatt?: Task['ansatt'] } | null>(null);
  const dragTaskId = useRef<string | null>(null);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 21 }}>Oppgåver</div>
        <button
          onClick={() => setTaskTarget({})}
          style={{ marginLeft: 'auto', padding: '9px 16px', background: '#1597a8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
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
              style={{ background: '#f7f9fb', border: '1px solid #e1e8ec', borderRadius: 12, padding: 10, minHeight: 300, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.farge }} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{k.tittel}</span>
                <span style={{ fontSize: 11, color: '#a4b1ba' }}>({kolTasks.length})</span>
              </div>
              {kolTasks.map((t) => {
                const p = PRIORITET[t.prioritet as Prioritet] || PRIORITET.medium;
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => { dragTaskId.current = t.id; }}
                    onClick={() => setTaskTarget({ existing: t })}
                    style={{ background: '#fff', border: '1px solid #e1e8ec', borderRadius: 10, padding: '10px 11px', cursor: 'grab' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.tittel}</div>
                    {t.detalj && <div style={{ fontSize: 11.5, color: '#7e93a0', marginBottom: 6 }}>{t.detalj}</div>}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: p.fg, background: p.bg, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>{p.tekst}</span>
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
