import type { CSSProperties, ReactNode } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { OPPGAVE_KAT, PRIORITET, type Prioritet } from '../../constants';
import { datoKort, today, ymd } from '../../lib/dates';
import { erForseinka, fristTekst, oppgaveStatus } from '../../lib/oppgave';
import { Avatar } from '../ui/Avatar';
import type { Task } from '../../types';

const labelStyle: CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 3 };
const knapp = (primar: boolean): CSSProperties => ({
  padding: '7px 13px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  border: primar ? 'none' : '1px solid var(--border)',
  background: primar ? 'var(--brand-strong)' : 'var(--surface)',
  color: primar ? 'var(--on-brand)' : 'var(--text-secondary)',
});

function Felt({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/**
 * Eitt oppgåvekort: tittel, ansvarleg, frist og status, og éin tydeleg
 * handling (ta ansvar / fullfør). `kompakt` = tavla til leiaren.
 */
export function OppgaveKort({
  task, onOpne, onBlokker, onOpneBestilling, kompakt = false, draggable = false, onDragStart,
}: {
  task: Task;
  onOpne: () => void;
  onBlokker: () => void;
  onOpneBestilling?: () => void;
  kompakt?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  const { completeTask, reopenTask, unblockTask, moveTask, orders, canApprove } = useAppData();
  const { findAnsatt } = useAnsatte();
  const { user } = useAuth();
  const t = today();
  const erLeiar = canApprove(user?.id);
  const minOppgave = !!user && task.ansatt === user.id;
  const kanEndre = erLeiar || minOppgave;
  const status = oppgaveStatus(task, t);
  const ansvarleg = task.ansatt === 'ufordelt' ? null : findAnsatt(task.ansatt);
  const p = PRIORITET[task.prioritet as Prioritet] || PRIORITET.medium;
  const kat = OPPGAVE_KAT[task.kategori] || OPPGAVE_KAT.Anna;
  const sjekkTotal = task.sjekkliste?.length || 0;
  const sjekkFerdig = task.sjekkliste?.filter((s) => s.ferdig).length || 0;
  const bestilling = task.orderId ? orders.find((o) => o.id === task.orderId) : undefined;
  const oppretta = task.opprettaAv ? findAnsatt(task.opprettaAv) : null;
  const fullfortAv = task.ferdigAv ? findAnsatt(task.ferdigAv) : null;
  const forseinka = erForseinka(task, t);

  // Éi hovudhandling, og eventuelt éi mindre ved sida av.
  let hovud: ReactNode = null;
  let ekstra: ReactNode = null;
  if (task.ferdig) {
    if (kanEndre) ekstra = <button onClick={() => reopenTask(task)} style={knapp(false)}>Angre</button>;
  } else if (task.ansatt === 'ufordelt') {
    if (user) hovud = <button onClick={() => moveTask(task.id, user.id)} style={knapp(true)}>Ta ansvar</button>;
  } else if (task.blokkert) {
    if (kanEndre) hovud = <button onClick={() => unblockTask(task)} style={knapp(false)}>Opphev blokkering</button>;
  } else if (kanEndre) {
    hovud = <button onClick={() => completeTask(task)} style={knapp(true)}>✓ Fullfør</button>;
    if (minOppgave) ekstra = <button onClick={onBlokker} style={knapp(false)}>Treng hjelp</button>;
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      style={{
        background: 'var(--surface)', borderRadius: 13, boxShadow: 'var(--shadow-card)', opacity: task.ferdig ? 0.72 : 1,
        border: task.blokkert ? '1px solid var(--danger-border)' : forseinka ? '1px solid rgba(192,57,43,0.35)' : '1px solid var(--border)',
        padding: kompakt ? '10px 11px' : '13px 14px', display: 'flex', flexDirection: 'column', gap: kompakt ? 7 : 10,
        cursor: draggable ? 'grab' : undefined,
      }}
    >
      <button onClick={onOpne} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ flex: 1, fontSize: kompakt ? 13 : 14.5, fontWeight: 700, lineHeight: 1.3, textDecoration: task.ferdig ? 'line-through' : 'none', color: 'var(--text)' }}>{task.tittel}</span>
          {task.prioritet === 'høg' && !task.ferdig && (
            <span style={{ fontSize: 10, fontWeight: 700, color: p.fg, background: p.bg, padding: '2px 7px', borderRadius: 8, textTransform: 'uppercase', flex: 'none' }}>{p.tekst}</span>
          )}
        </span>
        {task.detalj && !kompakt && (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.detalj}</span>
        )}
      </button>

      {kompakt ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: status.fg, background: status.bg, padding: '2px 8px', borderRadius: 9 }}>{status.tekst}</span>
          {task.frist && <span style={{ fontSize: 10.5, fontWeight: 700, color: forseinka ? 'var(--danger)' : 'var(--text-muted)' }}>{fristTekst(task.frist, t)}</span>}
          {sjekkTotal > 0 && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>☑ {sjekkFerdig}/{sjekkTotal}</span>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 10, padding: '9px 10px', background: 'var(--surface-alt)', borderRadius: 10 }}>
          <Felt label="Ansvarleg">
            {ansvarleg ? (
              <>
                <Avatar init={ansvarleg.init} farge={ansvarleg.farge} size={20} fontSize={8.5} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{minOppgave ? 'Deg' : ansvarleg.navn.split(' ')[0]}</span>
              </>
            ) : <span style={{ color: 'var(--text-muted)' }}>Ufordelt</span>}
          </Felt>
          <Felt label="Frist">
            <span style={{ color: forseinka ? 'var(--danger)' : task.frist ? 'var(--text)' : 'var(--text-muted)' }}>{fristTekst(task.frist, t)}</span>
          </Felt>
          <Felt label="Status">
            <span style={{ fontSize: 11, fontWeight: 700, color: status.fg, background: status.bg, padding: '2px 8px', borderRadius: 9, whiteSpace: 'nowrap' }}>{status.tekst}</span>
          </Felt>
        </div>
      )}

      {task.blokkert && !task.ferdig && (
        <div style={{ fontSize: 12.5, color: 'var(--pill-raud-fg)', background: 'var(--pill-raud-bg)', borderRadius: 9, padding: '7px 10px', lineHeight: 1.4 }}>
          <b>Står fast:</b> {task.blokkertGrunn || 'Ingen grunn oppgitt.'}
        </div>
      )}

      {!kompakt && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: kat.fg, background: kat.bg, padding: '2px 8px', borderRadius: 9 }}>{task.kategori}</span>
          {sjekkTotal > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: sjekkFerdig === sjekkTotal ? 'var(--brand-strong)' : 'var(--text-muted)' }}>☑ {sjekkFerdig}/{sjekkTotal}</span>
          )}
          {task.rutineId && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>↻ Fast rutine</span>}
          {task.gjentak && task.gjentak !== 'ingen' && !task.rutineId && <span title="Gjentakande" style={{ fontSize: 11, color: 'var(--text-faint)' }}>↻</span>}
          {bestilling && (
            <button
              onClick={onOpneBestilling}
              disabled={!onOpneBestilling}
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-soft)', border: 'none', borderRadius: 9, padding: '2px 8px', cursor: onOpneBestilling ? 'pointer' : 'default' }}
            >
              Bestilling: {bestilling.kunde}
            </button>
          )}
        </div>
      )}

      {(hovud || ekstra || !kompakt) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: kompakt ? 'none' : '1px solid var(--divider)', paddingTop: kompakt ? 0 : 10 }}>
          {!kompakt && (
            <span style={{ flex: 1, minWidth: 120, fontSize: 11.5, color: 'var(--text-muted)' }}>
              {task.ferdig && fullfortAv
                ? `Fullført av ${fullfortAv.navn.split(' ')[0]}${task.ferdigAt ? ` · ${datoKort(ymd(new Date(task.ferdigAt)))}` : ''}`
                : task.rutineId ? 'Laga automatisk frå rutine'
                : oppretta ? `Oppretta av ${oppretta.navn.split(' ')[0]}${task.opprettaAt ? ` · ${datoKort(ymd(new Date(task.opprettaAt)))}` : ''}`
                : ''}
            </span>
          )}
          <span style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {ekstra}
            {hovud}
          </span>
        </div>
      )}
    </div>
  );
}
