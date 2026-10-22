import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { PRIORITET, OPPGAVE_KAT, GJENTAK, type Prioritet } from '../../constants';
import { today, datoKort, addDays, mondayOf, fullDatoTekst } from '../../lib/dates';
import { tal } from '../../lib/tekst';
import { TaskModal } from './TaskModal';
import { Avatar } from '../ui/Avatar';
import { useIsMobile } from '../../lib/useIsMobile';
import type { Task } from '../../types';

const PRI_RANG: Record<string, number> = { høg: 0, medium: 1, låg: 2 };

/** Ferdige rutinar ein kan leggje til med eitt trykk. */
const MALAR: { namn: string; kategori: string; gjentak: string; punkt: string[] }[] = [
  { namn: 'Opningsrutine', kategori: 'Butikk', gjentak: 'dagleg', punkt: ['Lås opp og slå av alarmen', 'Slå på lys, kasse og terminal', 'Sjekk e-post og nye bestillingar', 'Set ut syklar og skilt'] },
  { namn: 'Stengerutine', kategori: 'Butikk', gjentak: 'dagleg', punkt: ['Ta inn syklar og skilt', 'Kasseoppgjer', 'Rydd verkstaden', 'Slå på alarmen og lås'] },
  { namn: 'Vekevask', kategori: 'Butikk', gjentak: 'vekevis', punkt: ['Vask golvet', 'Tørk støv i hyllene', 'Tøm søppel og papp', 'Rydd lageret'] },
  { namn: 'Varetelling', kategori: 'Lager', gjentak: 'manadleg', punkt: ['Tel dekk og slangar', 'Sjekk minimumslager', 'Bestill det som manglar'] },
];

type Utval = 'meg' | 'alle' | 'ufordelt';

const chip = (aktiv: boolean, farge?: string): CSSProperties => ({
  padding: '7px 13px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
  background: aktiv ? 'var(--brand-strong)' : 'var(--surface)', color: aktiv ? 'var(--on-brand)' : farge || 'var(--text-secondary)',
});
const kort: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--shadow-card)' };
const etikett: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-label)' };

export function Oppgaver() {
  const { tasks, moveTask, saveTask, completeTask, canApprove } = useAppData();
  const { ansatte, findAnsatt } = useAnsatte();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const leiar = canApprove(user?.id);
  const t = today();
  const imorgon = addDays(t, 1);
  const sondag = addDays(mondayOf(t), 6);

  const [taskTarget, setTaskTarget] = useState<{ existing?: Task; defaultAnsatt?: Task['ansatt'] } | null>(null);
  const [visning, setVisning] = useState<'liste' | 'tavle'>('liste');
  const [utval, setUtval] = useState<Utval>(leiar ? 'alle' : 'meg');
  const [visMalar, setVisMalar] = useState(false);

  // Hurtig-registrering
  const [nyTittel, setNyTittel] = useState('');
  const [nyAnsatt, setNyAnsatt] = useState<Task['ansatt']>(leiar ? 'ufordelt' : user?.id || 'ufordelt');
  const [nyFrist, setNyFrist] = useState<string | null>(null);
  const leggTil = async () => {
    const tittel = nyTittel.trim();
    if (!tittel) return;
    await saveTask({ tittel: tittel.charAt(0).toUpperCase() + tittel.slice(1), detalj: '', prioritet: 'medium', ansatt: nyAnsatt, ferdig: false, frist: nyFrist, kategori: 'Anna', gjentak: 'ingen', sjekkliste: [] });
    setNyTittel('');
  };
  const leggTilMal = async (m: typeof MALAR[number]) => {
    await saveTask({ tittel: m.namn, detalj: '', prioritet: 'medium', ansatt: 'ufordelt', ferdig: false, frist: t, kategori: m.kategori, gjentak: m.gjentak, sjekkliste: m.punkt.map((tekst) => ({ tekst, ferdig: false })) });
    setVisMalar(false);
  };

  const forMeg = (x: Task) => x.ansatt === user?.id || x.ansatt === 'ufordelt';
  const opne = tasks.filter((x) => !x.ferdig);
  const talUtval: Record<Utval, number> = {
    meg: opne.filter(forMeg).length,
    alle: opne.length,
    ufordelt: opne.filter((x) => x.ansatt === 'ufordelt').length,
  };
  const iUtval = (x: Task) => utval === 'alle' || (utval === 'meg' ? forMeg(x) : x.ansatt === 'ufordelt');

  const sorter = (a: Task, b: Task) => {
    if (a.frist && b.frist && a.frist !== b.frist) return a.frist < b.frist ? -1 : 1;
    if (!!a.frist !== !!b.frist) return a.frist ? -1 : 1;
    const am = a.ansatt === user?.id ? 0 : 1;
    const bm = b.ansatt === user?.id ? 0 : 1;
    if (am !== bm) return am - bm;
    return (PRI_RANG[a.prioritet] ?? 1) - (PRI_RANG[b.prioritet] ?? 1);
  };
  const synlege = opne.filter(iUtval).sort(sorter);
  const grupper: { tittel: string; farge?: string; liste: Task[] }[] = [
    { tittel: 'Forseinka', farge: 'var(--danger)', liste: synlege.filter((x) => x.frist && x.frist < t) },
    { tittel: 'I dag', farge: 'var(--brand-strong)', liste: synlege.filter((x) => x.frist === t) },
    { tittel: 'I morgon', liste: synlege.filter((x) => x.frist === imorgon) },
    { tittel: 'Resten av veka', liste: synlege.filter((x) => x.frist && x.frist > imorgon && x.frist <= sondag) },
    { tittel: 'Seinare', liste: synlege.filter((x) => x.frist && x.frist > sondag && x.frist > imorgon) },
    { tittel: 'Utan frist', liste: synlege.filter((x) => !x.frist) },
  ].filter((g) => g.liste.length > 0);

  // Fullført siste 7 dagar – og kven som har gjort mest.
  const vekeSidan = addDays(t, -7);
  const nyleg = tasks
    .filter((x) => x.ferdig && (x.ferdigAt ? x.ferdigAt.slice(0, 10) > vekeSidan : false))
    .sort((a, b) => (b.ferdigAt || '').localeCompare(a.ferdigAt || ''));
  const perPerson = [...nyleg.reduce((m, x) => (x.ferdigAv ? m.set(x.ferdigAv, (m.get(x.ferdigAv) || 0) + 1) : m), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);

  const Rad = ({ task }: { task: Task }) => {
    const a = task.ansatt !== 'ufordelt' ? findAnsatt(task.ansatt) : null;
    const p = PRIORITET[task.prioritet as Prioritet] || PRIORITET.medium;
    const forfalle = !!task.frist && !task.ferdig && task.frist < t;
    const sjekkTotal = task.sjekkliste?.length || 0;
    const sjekkFerdig = task.sjekkliste?.filter((s) => s.ferdig).length || 0;
    const ferdigAv = task.ferdigAv ? findAnsatt(task.ferdigAv) : null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: '1px solid var(--divider)' }}>
        <button
          onClick={() => (task.ferdig ? saveTask({ ...task, ferdig: false }) : completeTask(task))}
          aria-label={task.ferdig ? `Angre: ${task.tittel}` : `Fullfør: ${task.tittel}`}
          title={task.ferdig ? 'Angre' : 'Merk som gjort'}
          style={{
            width: 26, height: 26, borderRadius: '50%', flex: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${task.ferdig ? '#2f9e6f' : forfalle ? 'var(--danger)' : 'var(--border-strong, var(--text-faint))'}`,
            background: task.ferdig ? '#2f9e6f' : 'transparent', color: '#fff', fontSize: 14, fontWeight: 800, padding: 0,
          }}
        >
          {task.ferdig ? '✓' : ''}
        </button>
        <button onClick={() => setTaskTarget({ existing: task })} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}>
          <div style={{ fontSize: 14, fontWeight: 600, textDecoration: task.ferdig ? 'line-through' : 'none', color: task.ferdig ? 'var(--text-muted)' : 'var(--text)' }}>{task.tittel}</div>
          {task.detalj && !task.ferdig && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.detalj}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 5, fontSize: 11.5, color: 'var(--text-muted)' }}>
            {task.ferdig ? (
              <span>{ferdigAv?.navn ? `Gjort av ${ferdigAv.navn.split(' ')[0]}` : 'Gjort'}{task.ferdigAt ? ` · ${datoKort(task.ferdigAt.slice(0, 10))}` : ''}</span>
            ) : (
              <>
                {a ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Avatar init={a.init} farge={a.farge} size={17} fontSize={7.5} />{a.id === user?.id ? 'Meg' : a.navn.split(' ')[0]}</span>
                ) : (
                  <span style={{ fontWeight: 600 }}>Ufordelt</span>
                )}
                {task.frist && task.frist !== t && (
                  <span style={{ fontWeight: 700, padding: '1px 7px', borderRadius: 8, color: forfalle ? '#fff' : 'var(--text-muted)', background: forfalle ? 'var(--danger)' : 'var(--surface-alt)' }}>
                    {forfalle ? 'Forfall ' : ''}{task.frist === imorgon ? 'i morgon' : datoKort(task.frist)}
                  </span>
                )}
                {task.prioritet === 'høg' && <span style={{ fontWeight: 700, color: p.fg, background: p.bg, padding: '1px 7px', borderRadius: 8 }}>Viktig</span>}
                {task.kategori !== 'Anna' && <span style={{ fontWeight: 600, color: (OPPGAVE_KAT[task.kategori] || OPPGAVE_KAT.Anna).fg }}>{task.kategori}</span>}
                {task.gjentak && task.gjentak !== 'ingen' && <span title={GJENTAK[task.gjentak]?.tekst}>↻ {GJENTAK[task.gjentak]?.tekst.toLowerCase()}</span>}
                {sjekkTotal > 0 && <span style={{ fontWeight: 600, color: sjekkFerdig === sjekkTotal ? 'var(--brand-strong)' : undefined }}>☑ {sjekkFerdig}/{sjekkTotal}</span>}
              </>
            )}
          </div>
        </button>
        {!task.ferdig && task.ansatt === 'ufordelt' && user && (
          <button onClick={() => moveTask(task.id, user.id)} title="Ta denne oppgåva" style={{ ...chip(false), padding: '6px 11px', flex: 'none' }}>Ta</button>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? 16 : 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Geist Variable'", fontWeight: 800, fontSize: 25, letterSpacing: '-0.3px' }}>Oppgåver</div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setVisning('liste')} aria-pressed={visning === 'liste'} style={chip(visning === 'liste')}>Liste</button>
            <button onClick={() => setVisning('tavle')} aria-pressed={visning === 'tavle'} style={chip(visning === 'tavle')}>Tavle</button>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setVisMalar(!visMalar)} aria-expanded={visMalar} style={chip(false)}>+ Rutine frå mal</button>
          <button
            onClick={() => setTaskTarget({})}
            style={{ padding: '9px 16px', background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            + Ny oppgåve
          </button>
        </div>
      </div>

      {visMalar && (
        <div style={kort}>
          <div style={{ ...etikett, marginBottom: 10 }}>Faste rutinar – blir lagt inn som ufordelte, med sjekkliste</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 10 }}>
            {MALAR.map((m) => {
              const finst = opne.some((x) => x.tittel === m.namn);
              return (
                <button key={m.namn} onClick={() => leggTilMal(m)} disabled={finst} style={{ textAlign: 'left', padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-alt)', cursor: finst ? 'default' : 'pointer', opacity: finst ? 0.55 : 1, color: 'var(--text)', fontFamily: 'inherit' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.namn}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{finst ? 'Ligg alt inne' : `${GJENTAK[m.gjentak].tekst} · ${m.punkt.length} punkt`}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hurtig-registrering */}
      <div style={{ ...kort, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={nyTittel}
            onChange={(e) => setNyTittel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTil(); } }}
            placeholder="Skriv ei oppgåve, t.d. «Ring kunde om dekk»"
            autoCapitalize="sentences"
            aria-label="Ny oppgåve"
            style={{ flex: 1, minWidth: 0, padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }}
          />
          <button onClick={leggTil} disabled={!nyTittel.trim()} style={{ padding: '0 16px', background: nyTittel.trim() ? 'var(--brand)' : 'var(--surface-alt)', color: nyTittel.trim() ? 'var(--on-brand)' : 'var(--text-faint)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: nyTittel.trim() ? 'pointer' : 'default', flex: 'none' }}>Legg til</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Til:</span>
          <select value={nyAnsatt} onChange={(e) => setNyAnsatt(e.target.value as Task['ansatt'])} aria-label="Kven skal gjere oppgåva" style={{ ...chip(false), padding: '5px 9px' }}>
            <option value="ufordelt">Ufordelt</option>
            {ansatte.map((a) => <option key={a.id} value={a.id}>{a.id === user?.id ? 'Meg' : a.navn}</option>)}
          </select>
          <span style={{ marginLeft: 6 }}>Frist:</span>
          {([[null, 'Ingen'], [t, 'I dag'], [imorgon, 'I morgon'], [sondag, 'Denne veka']] as const).map(([v, l]) => (
            <button key={l} onClick={() => setNyFrist(v)} aria-pressed={nyFrist === v} style={{ ...chip(nyFrist === v), padding: '5px 10px', fontSize: 12 }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([['meg', 'For meg'], ['alle', 'Alle'], ['ufordelt', 'Ufordelte']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setUtval(k)} aria-pressed={utval === k} style={chip(utval === k)}>{l} ({talUtval[k]})</button>
        ))}
      </div>

      {visning === 'tavle' && !isMobile ? (
        <Tavle tasks={tasks.filter((x) => !x.ferdig && iUtval(x))} onOpne={(task) => setTaskTarget({ existing: task })} onFlytt={moveTask} onNy={(ansatt) => setTaskTarget({ defaultAnsatt: ansatt })} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ ...kort, padding: '6px 14px 4px' }}>
            {grupper.length === 0 && (
              <div style={{ padding: '26px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🎉</div>
                {utval === 'meg' ? 'Ingenting på lista di no.' : 'Ingen opne oppgåver.'}
                <div style={{ fontSize: 12.5, marginTop: 4 }}>Skriv ei ny oppgåve over, eller legg inn ein fast rutine frå mal.</div>
              </div>
            )}
            {grupper.map((g) => (
              <Gruppe key={g.tittel} tittel={g.tittel} farge={g.farge} n={g.liste.length}>
                {g.liste.map((task) => <Rad key={task.id} task={task} />)}
              </Gruppe>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={kort}>
              <div style={{ ...etikett, marginBottom: 10 }}>Gjort siste 7 dagar</div>
              {perPerson.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen oppgåver fullført enno. Hak av når noko er gjort, så blir det synleg her.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {perPerson.map(([id, n]) => {
                    const a = findAnsatt(id);
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar init={a.init} farge={a.farge} size={24} fontSize={9.5} />
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{a.navn}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}><b style={{ color: 'var(--text)' }}>{n}</b> {n === 1 ? 'oppgåve' : 'oppgåver'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {nyleg.length > 0 && (
              <div style={{ ...kort, padding: '6px 14px 4px' }}>
                <Gruppe tittel="Nyleg fullført" n={nyleg.length} startLukka>
                  {nyleg.slice(0, 15).map((task) => <Rad key={task.id} task={task} />)}
                </Gruppe>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        I dag er {fullDatoTekst(t).toLowerCase()}. {talUtval.meg > 0 ? `Du har ${tal(talUtval.meg, 'oppgåve', 'oppgåver')} som er tildelt deg eller ufordelt.` : ''} Den som får ei oppgåve, får varsel på mobilen.
      </div>

      {taskTarget && (
        <TaskModal existing={taskTarget.existing} defaultAnsatt={taskTarget.defaultAnsatt} onClose={() => setTaskTarget(null)} />
      )}
    </div>
  );
}

function Gruppe({ tittel, farge, n, startLukka = false, children }: { tittel: string; farge?: string; n: number; startLukka?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!startLukka);
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ ...etikett, color: farge || 'var(--text-label)', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '10px 2px 8px', cursor: 'pointer', width: '100%' }}>
        <span>{open ? '▾' : '▸'}</span>{tittel}<span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>· {n}</span>
      </button>
      {open && children}
    </div>
  );
}

/** Tavle: ei kolonne per person, dra kort mellom kolonnene for å fordele. */
function Tavle({ tasks, onOpne, onFlytt, onNy }: {
  tasks: Task[];
  onOpne: (t: Task) => void;
  onFlytt: (id: string, ansatt: Task['ansatt']) => void;
  onNy: (ansatt: Task['ansatt']) => void;
}) {
  const { ansatte } = useAnsatte();
  const dragId = useRef<string | null>(null);
  const t = today();
  const kolonner: { id: Task['ansatt']; tittel: string; farge: string }[] = [
    { id: 'ufordelt', tittel: 'Ufordelt', farge: '#9aa4b2' },
    ...ansatte.map((a) => ({ id: a.id, tittel: a.navn, farge: a.farge })),
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kolonner.length},minmax(190px,1fr))`, gap: 14, overflowX: 'auto' }}>
      {kolonner.map((k) => {
        const liste = tasks.filter((x) => x.ansatt === k.id).sort((a, b) => (a.frist || '9999').localeCompare(b.frist || '9999'));
        return (
          <div
            key={k.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId.current) { onFlytt(dragId.current, k.id); dragId.current = null; } }}
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 14, padding: 10, minHeight: 300, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '2px 3px' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: k.farge, flex: 'none' }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.tittel}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{liste.length}</span>
              <button onClick={() => onNy(k.id)} aria-label={`Ny oppgåve til ${k.tittel}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 0 }}>+</button>
            </div>
            {liste.map((task) => {
              const forfalle = !!task.frist && task.frist < t;
              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => { dragId.current = task.id; }}
                  onClick={() => onOpne(task)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 11px', cursor: 'grab', boxShadow: 'var(--shadow-card)' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{task.tittel}</div>
                  {task.frist && (
                    <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 700, display: 'inline-block', padding: '2px 8px', borderRadius: 9, color: forfalle ? '#fff' : 'var(--text-muted)', background: forfalle ? 'var(--danger)' : 'var(--surface-alt)' }}>
                      {forfalle ? 'Forfall ' : ''}{datoKort(task.frist)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
