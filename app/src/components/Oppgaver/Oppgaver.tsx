import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAuth } from '../../context/AuthContext';
import { addDays, fullDatoTekst, mondayOf, today, ymd } from '../../lib/dates';
import { FRISTGRUPPER, erForseinka, erReklamasjon, fristgruppe, ledigeOppgaver, sorterOppgaver } from '../../lib/oppgave';
import { tal } from '../../lib/tekst';
import { useIsMobile } from '../../lib/useIsMobile';
import { TaskModal } from './TaskModal';
import { ReklamasjonModal } from './ReklamasjonModal';
import { BlokkerModal } from './BlokkerModal';
import { RutineModal } from './RutineModal';
import { OppgaveKort } from './OppgaveKort';
import type { View } from '../../lib/view';
import type { Task } from '../../types';

type Fane = 'mine' | 'ledige' | 'alle' | 'fullforte';
type Fokus = 'forseinka' | 'blokkert' | 'reklamasjon' | null;

const fane = (aktiv: boolean): CSSProperties => ({
  padding: '8px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
  background: aktiv ? 'var(--brand-strong)' : 'var(--surface)', color: aktiv ? 'var(--on-brand)' : 'var(--text-secondary)', whiteSpace: 'nowrap',
});

export function Oppgaver({ setView }: { setView?: (v: View) => void }) {
  const { tasks, moveTask, saveTask, canApprove } = useAppData();
  const { ansatte } = useAnsatte();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const erLeiar = canApprove(user?.id);
  const t = today();

  const [valtFane, setFane] = useState<Fane>('mine');
  const [fokus, setFokus] = useState<Fokus>(null);
  const [tavle, setTavle] = useState(false);
  const [taskTarget, setTaskTarget] = useState<{ existing?: Task; defaultAnsatt?: Task['ansatt'] } | null>(null);
  const [blokkerTarget, setBlokkerTarget] = useState<Task | null>(null);
  const [visRutinar, setVisRutinar] = useState(false);
  const [visReklamasjon, setVisReklamasjon] = useState(false);
  const dragTaskId = useRef<string | null>(null);

  // Hurtig-registrering: skriv tittel, vel kven og frist, trykk Enter.
  const imorgon = addDays(t, 1);
  const sondag = addDays(mondayOf(t), 6);
  const [nyTittel, setNyTittel] = useState('');
  const [nyAnsatt, setNyAnsatt] = useState<Task['ansatt']>(erLeiar ? 'ufordelt' : user?.id || 'ufordelt');
  const [nyFrist, setNyFrist] = useState<string | null>(null);
  const leggTil = async () => {
    const tittel = nyTittel.trim();
    if (!tittel) return;
    await saveTask({ tittel: tittel.charAt(0).toUpperCase() + tittel.slice(1), detalj: '', prioritet: 'medium', ansatt: nyAnsatt, ferdig: false, frist: nyFrist, kategori: 'Anna', gjentak: 'ingen', sjekkliste: [] });
    setNyTittel('');
  };

  const opne = tasks.filter((x) => !x.ferdig);
  const mine = opne.filter((x) => x.ansatt === user?.id);
  const ledige = ledigeOppgaver(tasks);
  const forseinka = opne.filter((x) => erForseinka(x, t));
  const blokkerte = opne.filter((x) => x.blokkert);
  const reklamasjonar = opne.filter(erReklamasjon);
  const vekeSidan = addDays(t, -6);
  const fullforteVeke = tasks.filter((x) => x.ferdig && x.ferdigAt && ymd(new Date(x.ferdigAt)) >= vekeSidan);
  const mineIDag = mine.filter((x) => x.frist && x.frist <= t).length;

  const velFane = (f: Fane) => { setFane(f); setFokus(null); };
  const velFokus = (f: Exclude<Fokus, null>) => {
    if (fokus === f) { setFokus(null); return; }
    setFane('alle');
    setFokus(f);
    setTavle(false);
  };

  // Kva lista viser no.
  let synlege = valtFane === 'mine' ? mine : valtFane === 'ledige' ? ledige : valtFane === 'alle' ? opne : tasks.filter((x) => x.ferdig);
  if (fokus === 'forseinka') synlege = synlege.filter((x) => erForseinka(x, t));
  if (fokus === 'blokkert') synlege = synlege.filter((x) => x.blokkert);
  if (fokus === 'reklamasjon') synlege = synlege.filter(erReklamasjon);

  const kort = (task: Task, kompakt = false) => (
    <OppgaveKort
      key={task.id}
      task={task}
      kompakt={kompakt}
      onOpne={() => setTaskTarget({ existing: task })}
      onBlokker={() => setBlokkerTarget(task)}
      onOpneBestilling={setView ? () => setView('bestilling') : undefined}
      draggable={kompakt && erLeiar}
      onDragStart={() => { dragTaskId.current = task.id; }}
    />
  );

  const rutenett: CSSProperties = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(320px,1fr))', gap: 12, alignItems: 'start' };

  const undertittel = valtFane === 'mine'
    ? mine.length === 0
      ? 'Du har ingen opne oppgåver.'
      : `${mineIDag > 0 ? `${tal(mineIDag, 'oppgåve', 'oppgåver')} å gjere i dag` : 'Ingenting med frist i dag'} · ${tal(mine.length, 'open oppgåve', 'opne oppgåver')} totalt`
    : valtFane === 'ledige' ? 'Ufordelte oppgåver. Trykk «Ta ansvar» for å gjere ei til di.'
    : valtFane === 'fullforte' ? 'Det som er gjort, nyaste først.'
    : 'Alle opne oppgåver i butikken.';

  return (
    <div style={{ padding: isMobile ? 16 : 30, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="sidetittel">Oppgåver</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{undertittel}</div>
        </div>
        {erLeiar && (
          <button onClick={() => setVisRutinar(true)} style={{ padding: '9px 14px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ↻ Faste rutinar
          </button>
        )}
        <button
          onClick={() => setVisReklamasjon(true)}
          style={{ padding: '9px 14px', background: 'var(--surface)', color: 'var(--pill-raud-fg)', border: '1px solid var(--pill-raud-fg)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Ny reklamasjon
        </button>
        <button
          onClick={() => setTaskTarget({ defaultAnsatt: valtFane === 'mine' ? user?.id : undefined })}
          style={{ padding: '9px 16px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Ny oppgåve
        </button>
      </div>

      {/* Leiaroversikt: det som treng merksemd. Tilsette ser ikkje dette. */}
      {erLeiar && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 10 }}>
          {([
            { key: 'forseinka', tal: forseinka.length, lab: 'Forseinka', farge: 'var(--danger)', klikk: () => velFokus('forseinka'), aktiv: fokus === 'forseinka' },
            { key: 'ledige', tal: ledige.length, lab: 'Ufordelte', farge: 'var(--accent)', klikk: () => velFane('ledige'), aktiv: valtFane === 'ledige' },
            { key: 'blokkert', tal: blokkerte.length, lab: 'Blokkerte', farge: 'var(--danger)', klikk: () => velFokus('blokkert'), aktiv: fokus === 'blokkert' },
            { key: 'fullfort', tal: fullforteVeke.length, lab: 'Fullført siste 7 dagar', farge: 'var(--brand-strong)', klikk: () => velFane('fullforte'), aktiv: valtFane === 'fullforte' },
          ]).map((k) => (
            <button
              key={k.key}
              onClick={k.klikk}
              aria-pressed={k.aktiv}
              style={{
                textAlign: 'left', padding: '11px 14px', borderRadius: 'var(--r)', cursor: 'pointer', boxShadow: 'var(--shadow-card)',
                background: k.aktiv ? 'var(--brand-soft)' : 'var(--surface)', border: k.aktiv ? '1px solid var(--brand)' : '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Geist Mono Variable'", color: k.tal > 0 ? k.farge : 'var(--text-faint)' }}>{k.tal}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{k.lab}</div>
            </button>
          ))}
        </div>
      )}

      {/* Hurtig-registrering */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 12, boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={nyTittel}
            onChange={(e) => setNyTittel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTil(); } }}
            placeholder="Skriv ei oppgåve, t.d. «Ring kunde om dekk»"
            autoCapitalize="sentences"
            aria-label="Ny oppgåve"
            style={{ flex: 1, minWidth: 0, padding: '11px 13px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }}
          />
          <button onClick={leggTil} disabled={!nyTittel.trim()} style={{ padding: '0 16px', background: nyTittel.trim() ? 'var(--cta)' : 'var(--surface-alt)', color: nyTittel.trim() ? 'var(--on-cta)' : 'var(--text-faint)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: nyTittel.trim() ? 'pointer' : 'default', flex: 'none' }}>Legg til</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Til:</span>
          <select value={nyAnsatt} onChange={(e) => setNyAnsatt(e.target.value as Task['ansatt'])} aria-label="Kven skal gjere oppgåva" style={{ ...fane(false), padding: '5px 9px', fontSize: 12 }}>
            <option value="ufordelt">Ufordelt</option>
            {ansatte.map((a) => <option key={a.id} value={a.id}>{a.id === user?.id ? 'Meg' : a.navn}</option>)}
          </select>
          <span style={{ marginLeft: 6 }}>Frist:</span>
          {([[null, 'Ingen'], [t, 'I dag'], [imorgon, 'I morgon'], [sondag, 'Denne veka']] as const).map(([v, l]) => (
            <button key={l} onClick={() => setNyFrist(v)} aria-pressed={nyFrist === v} style={{ ...fane(nyFrist === v), padding: '5px 10px', fontSize: 12 }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%' }}>
          {([
            ['mine', `Mine (${mine.length})`],
            ['ledige', `Ledige (${ledige.length})`],
            ['alle', `Alle (${opne.length})`],
            ['fullforte', 'Fullførte'],
          ] as const).map(([k, l]) => (
            <button key={k} onClick={() => velFane(k)} aria-pressed={valtFane === k && !fokus} style={fane(valtFane === k && !fokus)}>{l}</button>
          ))}
        </div>
        {reklamasjonar.length > 0 && (
          <button
            onClick={() => velFokus('reklamasjon')}
            aria-pressed={fokus === 'reklamasjon'}
            style={{ ...fane(fokus === 'reklamasjon'), background: fokus === 'reklamasjon' ? 'var(--pill-raud-fg)' : 'var(--surface)', color: fokus === 'reklamasjon' ? '#fff' : 'var(--pill-raud-fg)', borderColor: 'var(--pill-raud-fg)' }}
          >
            Reklamasjonar ({reklamasjonar.length})
          </button>
        )}
        {fokus && fokus !== 'reklamasjon' && (
          <button onClick={() => setFokus(null)} style={{ ...fane(true), background: 'var(--danger)' }}>
            {fokus === 'forseinka' ? 'Forseinka' : 'Blokkerte'} ✕
          </button>
        )}
        {erLeiar && !isMobile && valtFane === 'alle' && !fokus && (
          <div style={{ marginLeft: 'auto', display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {([[false, 'Liste'], [true, 'Per person']] as const).map(([v, l]) => (
              <button key={l} onClick={() => setTavle(v)} aria-pressed={tavle === v}
                style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: tavle === v ? 'var(--surface-alt)' : 'var(--surface)', color: tavle === v ? 'var(--text)' : 'var(--text-muted)' }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {valtFane === 'fullforte' ? (
        <Aktivitet tasks={synlege} kort={kort} rutenett={rutenett} />
      ) : tavle && valtFane === 'alle' && !fokus && !isMobile ? (
        // Leiaren fordeler arbeid: dra oppgåver mellom personar.
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ansatte.length + 1},minmax(200px,1fr))`, gap: 12, overflowX: 'auto' }}>
          {[{ id: 'ufordelt', navn: 'Ufordelt', farge: '#9aa4b2' }, ...ansatte].map((a) => {
            const kol = opne.filter((x) => x.ansatt === a.id).sort(sorterOppgaver);
            return (
              <div
                key={a.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragTaskId.current) { moveTask(dragTaskId.current, a.id); dragTaskId.current = null; } }}
                style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 10, minHeight: 300, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 3px 6px' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.farge, flex: 'none' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.navn}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{kol.length}</span>
                </div>
                {kol.map((x) => kort(x, true))}
              </div>
            );
          })}
        </div>
      ) : synlege.length === 0 ? (
        <TomListe fane={valtFane} ledige={ledige.length} onLedige={() => velFane('ledige')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {FRISTGRUPPER.map((g) => {
            const iGruppa = synlege.filter((x) => fristgruppe(x, t) === g.key).sort(sorterOppgaver);
            if (iGruppa.length === 0) return null;
            return (
              <section key={g.key}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: g.key === 'forseinka' ? 'var(--danger)' : 'var(--text)' }}>{g.tittel}</h3>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{iGruppa.length}</span>
                </div>
                <div style={rutenett}>{iGruppa.map((x) => kort(x))}</div>
              </section>
            );
          })}
        </div>
      )}

      {taskTarget && (
        <TaskModal existing={taskTarget.existing} defaultAnsatt={taskTarget.defaultAnsatt} onClose={() => setTaskTarget(null)} />
      )}
      {blokkerTarget && <BlokkerModal task={blokkerTarget} onClose={() => setBlokkerTarget(null)} />}
      {visRutinar && <RutineModal onClose={() => setVisRutinar(false)} />}
      {visReklamasjon && <ReklamasjonModal onClose={() => setVisReklamasjon(false)} />}
    </div>
  );
}

function TomListe({ fane: f, ledige, onLedige }: { fane: Fane; ledige: number; onLedige: () => void }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '26px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>
        {f === 'mine' ? 'Du har ingen oppgåver no' : f === 'ledige' ? 'Ingen ledige oppgåver' : 'Ingen oppgåver her'}
      </div>
      {f === 'mine' && ledige > 0 && (
        <button onClick={onLedige} style={{ padding: '8px 14px', background: 'var(--brand-strong)', color: 'var(--on-brand)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Sjå {tal(ledige, 'ledig oppgåve', 'ledige oppgåver')} du kan ta
        </button>
      )}
    </div>
  );
}

/** Fullførte oppgåver gruppert per dag – kven gjorde kva, og når. */
function Aktivitet({ tasks, kort, rutenett }: { tasks: Task[]; kort: (t: Task) => ReactNode; rutenett: CSSProperties }) {
  const t = today();
  const dag = (x: Task) => (x.ferdigAt ? ymd(new Date(x.ferdigAt)) : '');
  const sortert = [...tasks].sort((a, b) => (b.ferdigAt || '').localeCompare(a.ferdigAt || '')).slice(0, 60);
  const dagar = [...new Set(sortert.map(dag))];
  const tittel = (d: string) => (!d ? 'Tidlegare' : d === t ? 'I dag' : d === addDays(t, -1) ? 'I går' : fullDatoTekst(d));
  if (sortert.length === 0) return <TomListe fane="fullforte" ledige={0} onLedige={() => {}} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {dagar.map((d) => (
        <section key={d || 'tidlegare'}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{tittel(d)}</h3>
          <div style={rutenett}>{sortert.filter((x) => dag(x) === d).map((x) => kort(x))}</div>
        </section>
      ))}
    </div>
  );
}
