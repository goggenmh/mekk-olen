import { useRef, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { PRIORITET, OPPGAVE_KAT, type Prioritet } from '../../constants';
import { today, datoKort } from '../../lib/dates';
import { TaskModal } from './TaskModal';
import type { Task } from '../../types';

const PRI_RANG: Record<string, number> = { høg: 0, medium: 1, låg: 2 };

export function Oppgaver() {
  const { tasks, moveTask, saveTask, completeTask } = useAppData();
  const { ansatte } = useAnsatte();
  const [taskTarget, setTaskTarget] = useState<{ existing?: Task; defaultAnsatt?: Task['ansatt'] } | null>(null);
  const [visFullforte, setVisFullforte] = useState(false);
  const dragTaskId = useRef<string | null>(null);
  const t = today();

  const KOL_DEF: { id: Task['ansatt']; tittel: string; farge: string }[] = [
    { id: 'ufordelt', tittel: 'Ufordelt', farge: '#9aa4b2' },
    ...ansatte.map((a) => ({ id: a.id, tittel: a.navn, farge: a.farge })),
  ];

  const sorter = (a: Task, b: Task) => {
    // Forfalne først, så etter frist (med frist før utan), så prioritet.
    const ao = a.frist && !a.ferdig && a.frist < t ? 0 : 1;
    const bo = b.frist && !b.ferdig && b.frist < t ? 0 : 1;
    if (ao !== bo) return ao - bo;
    if (a.frist && b.frist && a.frist !== b.frist) return a.frist < b.frist ? -1 : 1;
    if (!!a.frist !== !!b.frist) return a.frist ? -1 : 1;
    return (PRI_RANG[a.prioritet] ?? 1) - (PRI_RANG[b.prioritet] ?? 1);
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 22, letterSpacing: '-0.2px' }}>Oppgåver</div>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={visFullforte} onChange={(e) => setVisFullforte(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          Vis fullførte
        </label>
        <button
          onClick={() => setTaskTarget({})}
          style={{ padding: '9px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Ny oppgåve
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${KOL_DEF.length},minmax(190px,1fr))`, gap: 14 }}>
        {KOL_DEF.map((k) => {
          const kolTasks = tasks
            .filter((t2) => t2.ansatt === k.id && (visFullforte || !t2.ferdig))
            .sort(sorter);
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
              {kolTasks.map((task) => {
                const p = PRIORITET[task.prioritet as Prioritet] || PRIORITET.medium;
                const kat = OPPGAVE_KAT[task.kategori] || OPPGAVE_KAT.Anna;
                const forfalle = task.frist && !task.ferdig && task.frist < t;
                const sjekkTotal = task.sjekkliste?.length || 0;
                const sjekkFerdig = task.sjekkliste?.filter((s) => s.ferdig).length || 0;
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => { dragTaskId.current = task.id; }}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '10px 11px', cursor: 'grab', opacity: task.ferdig ? 0.6 : 1 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={task.ferdig}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => (e.target.checked ? completeTask(task) : saveTask({ ...task, ferdig: false }))}
                        style={{ width: 15, height: 15, marginTop: 2, cursor: 'pointer', flex: 'none' }}
                      />
                      <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => setTaskTarget({ existing: task })}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textDecoration: task.ferdig ? 'line-through' : 'none' }}>{task.tittel}</div>
                        {task.detalj && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>{task.detalj}</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: p.fg, background: p.bg, padding: '2px 8px', borderRadius: 9, textTransform: 'uppercase' }}>{p.tekst}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: kat.fg, background: kat.bg, padding: '2px 8px', borderRadius: 9 }}>{task.kategori}</span>
                          {task.frist && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 9, color: forfalle ? '#fff' : 'var(--text-muted)', background: forfalle ? 'var(--danger)' : 'var(--surface-alt)' }}>
                              {forfalle ? 'Forfall ' : ''}{datoKort(task.frist)}
                            </span>
                          )}
                          {task.gjentak && task.gjentak !== 'ingen' && (
                            <span title="Gjentakande" style={{ fontSize: 11, color: 'var(--text-faint)' }}>↻</span>
                          )}
                          {sjekkTotal > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: sjekkFerdig === sjekkTotal ? 'var(--brand-strong)' : 'var(--text-muted)' }}>
                              ☑ {sjekkFerdig}/{sjekkTotal}
                            </span>
                          )}
                        </div>
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
