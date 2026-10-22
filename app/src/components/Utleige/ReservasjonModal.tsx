import { useEffect, useMemo, useState } from 'react';
import type { UtleigeKunde } from '../../lib/utleige';
import { Modal, Field, inputStyle, CancelButton } from '../ui/Modal';
import { useAnsatte } from '../../context/AnsatteContext';
import { addDays, today } from '../../lib/dates';
import { reinTelefon } from '../../lib/bestilling';
import { AKTIVE, RES_STATUS, kr, nr, tidKort, tilIso, fraIso, feilTekst, type PrisSvar, type UtleigeReservasjon, type ResStatus } from '../../lib/utleige';
import type { UtleigeData } from './useUtleige';
import { knapp } from './stil';

/** Ny reservasjon (res = null) eller detaljar, status, endring og retur for ein eksisterande. */
export function ReservasjonModal({ data, res, onClose }: { data: UtleigeData; res: UtleigeReservasjon | null; onClose: () => void }) {
  const { findAnsatt } = useAnsatte();
  const { produkt, einingar, kundar, reservasjonar, innstillingar } = data;
  // Hald alltid den ferskaste utgåva (live-oppdatering).
  const r = res ? reservasjonar.find((x) => x.id === res.id) ?? res : null;
  const kunde = r ? kundar.find((k) => k.id === r.kunde_id) : null;

  const start0 = r ? fraIso(r.start) : { dato: addDays(today(), 1), tid: innstillingar?.hente_tid ?? '09:00' };
  const slutt0 = r ? fraIso(r.slutt) : { dato: addDays(today(), 2), tid: innstillingar?.retur_tid ?? '12:00' };
  const [produktId, setProduktId] = useState(r?.produkt_id ?? produkt[0]?.id ?? '');
  const [valdEining, setEiningId] = useState(r?.eining_id ?? '');
  const [fraDato, setFraDato] = useState(start0.dato);
  const [fraTid, setFraTid] = useState(start0.tid);
  const [tilDato, setTilDato] = useState(slutt0.dato);
  const [tilTid, setTilTid] = useState(slutt0.tid);
  const [namn, setNamn] = useState('');
  const [telefon, setTelefon] = useState('');
  const [epost, setEpost] = useState('');
  const [nyStatus, setNyStatus] = useState<ResStatus>('stadfesta');
  const [notat, setNotat] = useState(r?.internt_notat ?? '');
  const [prisSvar, setPrisSvar] = useState<{ nokkel: string; pris?: PrisSvar; feil?: string } | null>(null);
  const [endrar, setEndrar] = useState(!r);
  const [visRetur, setVisRetur] = useState(false);
  const [lagrar, setLagrar] = useState(false);

  const p = produkt.find((x) => x.id === produktId);
  const start = fraDato ? tilIso(fraDato, fraTid) : '';
  const slutt = tilDato ? tilIso(tilDato, tilTid) : '';

  // Einingar for produktet, med om dei er ledige i perioden (vist; databasen avgjer).
  const produktEiningar = useMemo(() => einingar.filter((e) => e.produkt_id === produktId).map((e) => {
    const opptatt = reservasjonar.some((x) => x.eining_id === e.id && x.id !== r?.id && AKTIVE.includes(x.status)
      && new Date(x.start) < new Date(slutt) && new Date(x.slutt) > new Date(start));
    const sperra = data.sperrer.some((s) => s.eining_id === e.id && new Date(s.start) < new Date(slutt) && (!s.slutt || new Date(s.slutt) > new Date(start)));
    return { e, ledig: e.status === 'tilgjengeleg' && !opptatt && !sperra, grunn: e.status !== 'tilgjengeleg' ? 'ikkje tilgjengeleg' : sperra ? 'sperra' : opptatt ? 'opptatt' : '' };
  }), [einingar, produktId, reservasjonar, data.sperrer, start, slutt, r?.id]);

  // Valt eining, eller ei ledig ei når produkt/periode endrar seg (ny reservasjon).
  const gjeldande = produktEiningar.find((x) => x.e.id === valdEining);
  const einingId = gjeldande && (gjeldande.ledig || r) ? valdEining : (produktEiningar.find((x) => x.ledig)?.e.id ?? produktEiningar[0]?.e.id ?? '');

  // Pris frå prisreglane i databasen (svaret høyrer til perioden det vart spurt om).
  const prisFn = data.pris;
  const gyldigPeriode = !!start && !!slutt && new Date(slutt) > new Date(start);
  const nokkel = `${produktId}|${start}|${slutt}`;
  useEffect(() => {
    if (!endrar || !produktId || !gyldigPeriode) return;
    let avbroten = false;
    prisFn(produktId, start, slutt).then((x) => { if (!avbroten) setPrisSvar({ nokkel, pris: x }); })
      .catch((e) => { if (!avbroten) setPrisSvar({ nokkel, feil: feilTekst(e) }); });
    return () => { avbroten = true; };
  }, [endrar, produktId, start, slutt, gyldigPeriode, nokkel, prisFn]);
  const svar = prisSvar?.nokkel === nokkel ? prisSvar : null;
  const pris = svar?.pris ?? null;
  const prisFeil = !gyldigPeriode && start && slutt ? 'Retur må vere etter henting.' : svar?.feil ?? null;

  // Fyll inn kjend kunde frå telefonnummeret.
  const endreTelefon = (v: string) => {
    setTelefon(v);
    const k: UtleigeKunde | undefined = kundar.find((x) => x.telefon === v.replace(/[^0-9+]/g, ''));
    if (k) { if (!namn) setNamn(k.namn); if (!epost) setEpost(k.epost); }
  };

  const kanLagre = !!produktId && !!einingId && !!start && !!slutt && !prisFeil && (r ? true : namn.trim().length >= 2 && telefon.replace(/\D/g, '').length >= 8);

  const utfor = async (fn: () => Promise<unknown>, lukk = false) => {
    setLagrar(true);
    try { await fn(); if (lukk) onClose(); } catch { /* toast er vist */ } finally { setLagrar(false); }
  };

  const lagre = () => utfor(async () => {
    if (!r) {
      await data.nyReservasjon({ produkt_id: produktId, eining_id: einingId, start, slutt, status: nyStatus, kunde: { namn, telefon, epost }, internt_notat: notat });
      onClose();
    } else {
      await data.endreReservasjon(r, { start, slutt, eining_id: einingId, produkt_id: produktId });
      setEndrar(false);
    }
  });

  const status = (s: ResStatus, melding: string) => r && utfor(() => data.settStatus(r, s, melding));
  const tlf = kunde ? reinTelefon(kunde.telefon) : '';
  const tilbehor = (r ? produkt.find((x) => x.id === r.produkt_id) : p)?.tilbehor ?? [];

  return (
    <Modal
      onClose={onClose}
      maxWidth={580}
      title={r ? `Reservasjon ${nr(r)}` : 'Ny reservasjon'}
      subtitle={r ? `${produkt.find((x) => x.id === r.produkt_id)?.namn ?? ''} · ${einingar.find((e) => e.id === r.eining_id)?.kode ?? ''}` : undefined}
      footer={
        <>
          <CancelButton onClick={onClose}>{r ? 'Lukk' : 'Avbryt'}</CancelButton>
          {endrar && (
            <button onClick={lagre} disabled={!kanLagre || lagrar} style={{ padding: '10px 18px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 900, cursor: 'pointer', opacity: kanLagre && !lagrar ? 1 : 0.5 }}>
              {lagrar ? 'Lagrar …' : r ? 'Lagre endring' : 'Lagre reservasjon'}
            </button>
          )}
        </>
      }
    >
      {r && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 999, color: RES_STATUS[r.status].fg, background: RES_STATUS[r.status].bg }}>{RES_STATUS[r.status].tekst}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Motteken {tidKort(r.created_at)}</span>
          </div>

          {/* Handlingar etter status */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {r.status === 'ny' && <>
              <button disabled={lagrar} onClick={() => status('stadfesta', 'Stadfesta – kunden får e-post')} style={knapp(true)}>Godkjenn</button>
              <button disabled={lagrar} onClick={() => status('avslatt', 'Avslått')} style={knapp()}>Avslå</button>
            </>}
            {r.status === 'stadfesta' && <button disabled={lagrar} onClick={() => status('klar', 'Klar for henting')} style={knapp()}>Klar for henting</button>}
            {['stadfesta', 'klar'].includes(r.status) && <>
              <button disabled={lagrar} onClick={() => status('utleigd', 'Utlevert')} style={knapp(true)}>Registrer utlevering</button>
              <button disabled={lagrar} onClick={() => status('avbestilt', 'Avbestilt – kunden får e-post')} style={knapp()}>Avbestill</button>
            </>}
            {['utleigd', 'forseinka'].includes(r.status) && <button onClick={() => setVisRetur(true)} style={knapp(true)}>Registrer retur</button>}
            {r.status === 'kontroll' && (
              <button disabled={lagrar} onClick={() => utfor(async () => { await data.frigjer(r.eining_id); await data.settStatus(r, 'returnert', 'Kontrollert – eininga er tilgjengeleg igjen'); })} style={knapp(true)}>Ferdig kontrollert</button>
            )}
            {['ny', 'stadfesta', 'klar', 'utleigd', 'forseinka'].includes(r.status) && !endrar && (
              <button onClick={() => setEndrar(true)} style={knapp()}>{['utleigd', 'forseinka'].includes(r.status) ? 'Forleng / endre' : 'Endre periode'}</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 14px', fontSize: 13.5, background: 'var(--surface-alt)', borderRadius: 'var(--r)', padding: '11px 13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Kunde</span>
            <span><strong>{kunde?.namn}</strong>{tlf && <> · <a href={`tel:${tlf}`} style={{ color: 'var(--brand)', fontWeight: 700 }}>{kunde?.telefon}</a></>}{kunde?.epost && <> · {kunde.epost}</>}</span>
            <span style={{ color: 'var(--text-muted)' }}>Henting</span><span>{tidKort(r.start)}{r.utlevert_at && <span style={{ color: 'var(--text-muted)' }}> · utlevert {tidKort(r.utlevert_at)}{r.utlevert_av ? ` av ${findAnsatt(r.utlevert_av).navn.split(' ')[0]}` : ''}</span>}</span>
            <span style={{ color: 'var(--text-muted)' }}>Retur</span><span>{tidKort(r.slutt)}{r.returnert_at && <span style={{ color: 'var(--text-muted)' }}> · returnert {tidKort(r.returnert_at)}{r.returnert_av ? ` av ${findAnsatt(r.returnert_av).navn.split(' ')[0]}` : ''}</span>}</span>
            <span style={{ color: 'var(--text-muted)' }}>Pris</span><span>{kr(r.pris_leige)}{r.gebyr > 0 && ` + gebyr ${kr(r.gebyr)}`} = <strong>{kr(r.pris_total)}</strong></span>
            {r.depositum > 0 && <><span style={{ color: 'var(--text-muted)' }}>Depositum</span><span>{kr(r.depositum)}</span></>}
            {r.kunde_melding && <><span style={{ color: 'var(--text-muted)' }}>Melding</span><span style={{ whiteSpace: 'pre-wrap' }}>{r.kunde_melding}</span></>}
          </div>

          {r.retur_sjekk && (
            <div style={{ fontSize: 13, background: 'var(--surface-alt)', borderRadius: 'var(--r)', padding: '10px 13px', lineHeight: 1.6 }}>
              <strong>Retursjekk:</strong> {r.retur_sjekk.tilbehor ? 'alt tilbehøyr med' : `manglar: ${r.retur_sjekk.manglar?.join(', ') || 'tilbehøyr'}`} · {r.retur_sjekk.rein ? 'rein' : 'ikkje rein'} · {r.retur_sjekk.skade ? `skade: ${r.retur_sjekk.skildring}` : 'ingen skade'}
              {r.oppgave_id && <div style={{ color: 'var(--text-muted)' }}>Vedlikehaldsoppgåve er laga i Oppgåver.</div>}
            </div>
          )}
        </>
      )}

      {visRetur && r && <Retur tilbehor={tilbehor} lagrar={lagrar} onAvbryt={() => setVisRetur(false)}
        onLagre={(sjekk, vedlikehald, n) => utfor(async () => { await data.retur(r, sjekk, vedlikehald, n); setVisRetur(false); })} />}

      {endrar && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: r ? '1px solid var(--divider)' : 'none', paddingTop: r ? 12 : 0 }}>
          {!r && (
            <Field label="Utstyr">
              <select value={produktId} onChange={(e) => setProduktId(e.target.value)} style={inputStyle}>
                {produkt.filter((x) => x.aktiv).map((x) => <option key={x.id} value={x.id}>{x.namn}</option>)}
              </select>
            </Field>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <Field label="Henting"><input type="date" value={fraDato} onChange={(e) => setFraDato(e.target.value)} style={inputStyle} /></Field>
            <Field label="Kl."><input type="time" value={fraTid} onChange={(e) => setFraTid(e.target.value)} style={inputStyle} /></Field>
            <Field label="Retur"><input type="date" value={tilDato} onChange={(e) => setTilDato(e.target.value)} style={inputStyle} /></Field>
            <Field label="Kl."><input type="time" value={tilTid} onChange={(e) => setTilTid(e.target.value)} style={inputStyle} /></Field>
          </div>
          <Field label="Eining">
            <select value={einingId} onChange={(e) => setEiningId(e.target.value)} style={inputStyle}>
              {produktEiningar.map(({ e, ledig, grunn }) => <option key={e.id} value={e.id}>{e.kode}{ledig ? ' – ledig' : ` – ${grunn}`}</option>)}
            </select>
          </Field>
          {produktEiningar.length > 0 && !produktEiningar.some((x) => x.ledig) && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Ingen ledige einingar i perioden.</div>}
          {pris && <div style={{ fontSize: 13.5 }}>Pris: {kr(pris.leige)}{pris.gebyr > 0 && ` + gebyr ${kr(pris.gebyr)}`} = <strong>{kr(pris.total)}</strong>{pris.depositum > 0 && <span style={{ color: 'var(--text-muted)' }}> · depositum {kr(pris.depositum)}</span>}</div>}
          {prisFeil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{prisFeil}</div>}
          {!r && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <Field label="Telefon"><input type="tel" inputMode="tel" value={telefon} onChange={(e) => endreTelefon(e.target.value)} style={inputStyle} /></Field>
                <Field label="Namn"><input value={namn} onChange={(e) => setNamn(e.target.value)} autoCapitalize="words" style={inputStyle} /></Field>
              </div>
              <Field label="E-post (for stadfesting)"><input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} style={inputStyle} /></Field>
              <Field label="Status">
                <select value={nyStatus} onChange={(e) => setNyStatus(e.target.value as ResStatus)} style={inputStyle}>
                  <option value="stadfesta">Stadfesta</option>
                  <option value="ny">Ny førespurnad</option>
                  <option value="utleigd">Utlevert no</option>
                </select>
              </Field>
            </>
          )}
          {r && <button onClick={() => setEndrar(false)} style={{ ...knapp(), alignSelf: 'flex-start' }}>Avbryt endring</button>}
        </div>
      )}

      <Field label="Internt notat">
        <textarea value={notat} onChange={(e) => setNotat(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Berre for dei tilsette" />
      </Field>
      {r && notat !== r.internt_notat && <button disabled={lagrar} onClick={() => utfor(() => data.lagreNotat(r, notat))} style={{ ...knapp(), alignSelf: 'flex-start', marginTop: -6 }}>Lagre notat</button>}
    </Modal>
  );
}

function Retur({ tilbehor, lagrar, onAvbryt, onLagre }: {
  tilbehor: string[];
  lagrar: boolean;
  onAvbryt: () => void;
  onLagre: (sjekk: { tilbehor: boolean; manglar: string[]; rein: boolean; skade: boolean; skildring: string }, vedlikehald: boolean, notat: string) => void;
}) {
  const [med, setMed] = useState<Record<string, boolean>>(() => Object.fromEntries(tilbehor.map((t) => [t, true])));
  const [rein, setRein] = useState(true);
  const [skade, setSkade] = useState(false);
  const [skildring, setSkildring] = useState('');
  const [vedlikehald, setVedlikehald] = useState(false);
  const manglar = tilbehor.filter((t) => !med[t]);
  const sjekk = (label: string, verdi: boolean, sett: (v: boolean) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, cursor: 'pointer' }}>
      <input type="checkbox" checked={verdi} onChange={(e) => sett(e.target.checked)} style={{ width: 18, height: 18 }} />{label}
    </label>
  );
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--kort-label)' }}>Retur – kontrolliste</div>
      {tilbehor.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Tilbehøyr levert tilbake:</span>
          {tilbehor.map((t) => <div key={t}>{sjekk(t, !!med[t], (v) => setMed((m) => ({ ...m, [t]: v })))}</div>)}
        </div>
      )}
      {sjekk('Utstyret er reint', rein, setRein)}
      {sjekk('Skade eller feil', skade, setSkade)}
      {skade && <textarea value={skildring} onChange={(e) => setSkildring(e.target.value)} rows={2} placeholder="Kva er skadd?" style={{ ...inputStyle, resize: 'vertical' }} />}
      {sjekk('Treng vedlikehald – sperr eininga og lag oppgåve', vedlikehald, setVedlikehald)}
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={lagrar || (skade && !skildring.trim())} onClick={() => onLagre({ tilbehor: manglar.length === 0, manglar, rein, skade, skildring: skildring.trim() },
          vedlikehald, [manglar.length ? `Manglar: ${manglar.join(', ')}` : '', skade ? `Skade: ${skildring.trim()}` : '', !rein ? 'Ikkje rein' : ''].filter(Boolean).join('. '))}
          style={knapp(true)}>{lagrar ? 'Lagrar …' : 'Registrer retur'}</button>
        <button onClick={onAvbryt} style={knapp()}>Avbryt</button>
      </div>
    </div>
  );
}
