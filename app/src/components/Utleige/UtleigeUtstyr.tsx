import { useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { today, addDays } from '../../lib/dates';
import { EINING_STATUS, SPERRE_GRUNN, einingStatusNo, kr, tidKort, tilIso, type EiningStatus, type SperreGrunn, type UtleigeEining, type UtleigeProdukt } from '../../lib/utleige';
import type { UtleigeData } from './useUtleige';
import { kortStil, knapp } from './stil';

const MANUELL: EiningStatus[] = ['tilgjengeleg', 'kontroll', 'vedlikehald', 'ikkje_tilgjengeleg'];

/** Utstyr: produkt med fysiske einingar, statusar og sperrer. Leiaren endrar produkt og einingar. */
export function UtleigeUtstyr({ data, erLeiar }: { data: UtleigeData; erLeiar: boolean }) {
  const { produkt, einingar, reservasjonar, sperrer } = data;
  const [redigerer, setRedigerer] = useState<UtleigeProdukt | 'ny' | null>(null);
  const [sperreFor, setSperreFor] = useState<UtleigeEining | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {erLeiar && <button onClick={() => setRedigerer('ny')} style={{ ...knapp(true), alignSelf: 'flex-start' }}>+ Nytt utstyr</button>}
      {produkt.length === 0 && <div style={{ ...kortStil, fontSize: 13.5, color: 'var(--text-muted)' }}>Ikkje noko utleigeutstyr enno.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, alignItems: 'start' }}>
        {produkt.map((p) => {
          const mine = einingar.filter((e) => e.produkt_id === p.id);
          return (
            <div key={p.id} style={{ ...kortStil, display: 'flex', flexDirection: 'column', gap: 10, opacity: p.aktiv ? 1 : 0.6 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {p.bilete_url
                  ? <img src={p.bilete_url} alt="" style={{ width: 64, height: 64, objectFit: 'contain', background: '#ffffff', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', flex: 'none' }} />
                  : <div style={{ width: 64, height: 64, background: 'var(--surface-alt)', borderRadius: 'var(--r-sm)', flex: 'none' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{p.namn}{!p.aktiv && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}> · skjult</span>}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {kr(p.dogn_pris)}/døgn{p.helg_pris != null && ` · helg ${kr(p.helg_pris)}`}{p.halvdag_pris != null && ` · halv dag ${kr(p.halvdag_pris)}`}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Gebyr {kr(p.gebyr)} · depositum {kr(p.depositum)}</div>
                </div>
                {erLeiar && <button onClick={() => setRedigerer(p)} style={{ ...knapp(), alignSelf: 'flex-start' }}>Endre</button>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mine.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>Ingen einingar – legg til minst éi.</div>}
                {mine.map((e) => {
                  const st = EINING_STATUS[einingStatusNo(e, reservasjonar)];
                  const aktiveSperrer = sperrer.filter((s) => s.eining_id === e.id && (!s.slutt || new Date(s.slutt) > new Date()));
                  return (
                    <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 13.5, flex: 1 }}>{e.kode}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: st.fg, background: st.bg }}>{st.tekst}</span>
                        <button onClick={() => setSperreFor(e)} style={{ ...knapp(), padding: '4px 9px', fontSize: 12 }}>Sperr</button>
                        {e.status !== 'tilgjengeleg' && <button onClick={() => data.frigjer(e.id)} style={{ ...knapp(), padding: '4px 9px', fontSize: 12 }}>Klar</button>}
                      </div>
                      {aktiveSperrer.map((s) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--pill-raud-fg)' }}>
                          <span style={{ flex: 1 }}>{SPERRE_GRUNN[s.grunn]}: {tidKort(s.start)} – {s.slutt ? tidKort(s.slutt) : 'til vidare'}{s.notat && ` · ${s.notat}`}</span>
                          <button onClick={() => data.slettSperre(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>Fjern</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {redigerer && <ProduktModal data={data} p={redigerer === 'ny' ? null : redigerer} onClose={() => setRedigerer(null)} />}
      {sperreFor && <SperreModal data={data} eining={sperreFor} onClose={() => setSperreFor(null)} />}
    </div>
  );
}

const talEllerNull = (s: string) => (s.trim() === '' ? null : Number(s.replace(/\s/g, '').replace(',', '.')));
const prisTekst = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

function ProduktModal({ data, p, onClose }: { data: UtleigeData; p: UtleigeProdukt | null; onClose: () => void }) {
  const [namn, setNamn] = useState(p?.namn ?? '');
  const [beskriving, setBeskriving] = useState(p?.beskriving ?? '');
  const [kategori, setKategori] = useState(p?.kategori ?? 'Verktøy');
  const [bilete, setBilete] = useState<string | null>(p?.bilete_url ?? null);
  const [dogn, setDogn] = useState(prisTekst(p?.dogn_pris));
  const [halvdag, setHalvdag] = useState(prisTekst(p?.halvdag_pris));
  const [helg, setHelg] = useState(prisTekst(p?.helg_pris));
  const [gebyr, setGebyr] = useState(prisTekst(p?.gebyr ?? 0));
  const [depositum, setDepositum] = useState(prisTekst(p?.depositum ?? 0));
  const [tilbehor, setTilbehor] = useState((p?.tilbehor ?? []).join('\n'));
  const [aktiv, setAktiv] = useState(p?.aktiv ?? true);
  const [sortering, setSortering] = useState(String(p?.sortering ?? 0));
  const [nyKode, setNyKode] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [lastar, setLastar] = useState(false);
  const mine = p ? data.einingar.filter((e) => e.produkt_id === p.id) : [];

  const prisar = [dogn, halvdag, helg, gebyr, depositum].map(talEllerNull);
  const ugyldig = prisar.some((x) => x !== null && (!Number.isFinite(x) || x < 0)) || prisar[0] === null;

  const lagre = async () => {
    if (!namn.trim()) { setFeil('Skriv inn eit namn.'); return; }
    if (ugyldig) { setFeil('Sjekk prisane: døgnpris må fyllast ut, og alle prisar må vere tal (t.d. 450 eller 450,50).'); return; }
    try {
      const lagra = await data.lagreProdukt({
        id: p?.id, namn: namn.trim(), beskriving: beskriving.trim(), kategori: kategori.trim() || 'Verktøy', bilete_url: bilete,
        dogn_pris: prisar[0]!, halvdag_pris: prisar[1], helg_pris: prisar[2], gebyr: prisar[3] ?? 0, depositum: prisar[4] ?? 0,
        tilbehor: tilbehor.split('\n').map((x) => x.trim()).filter(Boolean), aktiv, sortering: Number(sortering) || 0,
      });
      // Nytt utstyr: lag første eining med koden som står i feltet.
      if (!p && nyKode.trim()) await data.lagreEining({ produkt_id: lagra.id, kode: nyKode.trim(), status: 'tilgjengeleg', notat: '' });
      onClose();
    } catch { /* toast er vist */ }
  };

  const lastOpp = async (fil: File | undefined) => {
    if (!fil) return;
    setLastar(true);
    try { setBilete(await data.lastOppBilete(fil)); } catch { /* toast */ } finally { setLastar(false); }
  };

  return (
    <Modal onClose={onClose} maxWidth={560} title={p ? 'Endre utstyr' : 'Nytt utstyr'}
      footer={<>
        {p && <DeleteButton onClick={async () => { if (window.confirm(`Slette «${p.namn}» og alle einingane? Reservasjonshistorikk hindrar sletting – då kan du skjule utstyret i staden.`)) { try { await data.slettProdukt(p.id); onClose(); } catch { /* toast */ } } }} />}
        <CancelButton onClick={onClose} /><SaveButton onClick={lagre} />
      </>}>
      <Field label="Namn"><input value={namn} onChange={(e) => setNamn(e.target.value)} autoCapitalize="sentences" style={inputStyle} /></Field>
      <Field label="Beskriving"><textarea value={beskriving} onChange={(e) => setBeskriving(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Kategori"><input value={kategori} onChange={(e) => setKategori(e.target.value)} style={inputStyle} /></Field>
        <Field label="Sortering"><input type="number" value={sortering} onChange={(e) => setSortering(e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="Bilete">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {bilete && <img src={bilete} alt="" style={{ width: 64, height: 64, objectFit: 'contain', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }} />}
          <input type="file" accept="image/*" onChange={(e) => lastOpp(e.target.files?.[0])} disabled={lastar} style={{ fontSize: 13 }} />
          {bilete && <button type="button" onClick={() => setBilete(null)} style={knapp()}>Fjern</button>}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <Field label="Per døgn (kr)"><input inputMode="decimal" value={dogn} onChange={(e) => setDogn(e.target.value)} style={inputStyle} /></Field>
        <Field label="Halv dag"><input inputMode="decimal" value={halvdag} onChange={(e) => setHalvdag(e.target.value)} placeholder="valfri" style={inputStyle} /></Field>
        <Field label="Helg fre–mån"><input inputMode="decimal" value={helg} onChange={(e) => setHelg(e.target.value)} placeholder="valfri" style={inputStyle} /></Field>
        <Field label="Gebyr"><input inputMode="decimal" value={gebyr} onChange={(e) => setGebyr(e.target.value)} style={inputStyle} /></Field>
        <Field label="Depositum"><input inputMode="decimal" value={depositum} onChange={(e) => setDepositum(e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="Tilbehøyr (éi linje per ting)"><textarea value={tilbehor} onChange={(e) => setTilbehor(e.target.value)} rows={3} placeholder={'Skjøteledning 10 m\nVernebriller'} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
        <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} style={{ width: 18, height: 18 }} /> Vis på kundesida
      </label>

      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-label)' }}>Fysiske einingar</div>
        {mine.map((e) => (
          <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input defaultValue={e.kode} onBlur={(ev) => ev.target.value.trim() && ev.target.value.trim() !== e.kode && data.lagreEining({ ...e, kode: ev.target.value.trim() }).catch(() => {})} style={{ ...inputStyle, flex: 1 }} aria-label="Kode" />
            <select value={e.status} onChange={(ev) => data.lagreEining({ ...e, status: ev.target.value as EiningStatus }).catch(() => {})} style={{ ...inputStyle, width: 'auto' }}>
              {MANUELL.map((s) => <option key={s} value={s}>{EINING_STATUS[s].tekst}</option>)}
            </select>
            <button onClick={() => window.confirm(`Slette eininga ${e.kode}?`) && data.slettEining(e.id).catch(() => {})} style={{ ...knapp(), color: 'var(--danger)' }}>Slett</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={nyKode} onChange={(e) => setNyKode(e.target.value)} placeholder={p ? 'Ny eining, t.d. HOPP-02' : 'Første eining, t.d. HOPP-01'} style={{ ...inputStyle, flex: 1 }} />
          {p && <button disabled={!nyKode.trim()} onClick={() => data.lagreEining({ produkt_id: p.id, kode: nyKode.trim(), status: 'tilgjengeleg', notat: '' }).then(() => setNyKode('')).catch(() => {})} style={knapp()}>Legg til</button>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Koden må vere unik i butikken (står t.d. på ein lapp på maskina).</div>
      </div>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{feil}</div>}
    </Modal>
  );
}

function SperreModal({ data, eining, onClose }: { data: UtleigeData; eining: UtleigeEining; onClose: () => void }) {
  const [grunn, setGrunn] = useState<SperreGrunn>('vedlikehald');
  const [fra, setFra] = useState(today());
  const [til, setTil] = useState(addDays(today(), 1));
  const [tilVidare, setTilVidare] = useState(false);
  const [notat, setNotat] = useState('');
  const start = tilIso(fra, '00:00');
  const slutt = tilVidare ? null : tilIso(addDays(til, 1), '00:00');
  const kryssar = data.reservasjonar.filter((r) => r.eining_id === eining.id && ['ny', 'stadfesta', 'klar'].includes(r.status)
    && new Date(r.slutt) > new Date(start) && (!slutt || new Date(r.start) < new Date(slutt)));

  const lagre = async () => {
    try { await data.nySperre({ eining_id: eining.id, start, slutt, grunn, notat: notat.trim() }); onClose(); } catch { /* toast */ }
  };

  return (
    <Modal onClose={onClose} title={`Sperr ${eining.kode}`} subtitle="Eininga kan ikkje leigast ut i perioden" footer={<><CancelButton onClick={onClose} /><SaveButton onClick={lagre}>Sperr</SaveButton></>}>
      <Field label="Grunn">
        <select value={grunn} onChange={(e) => setGrunn(e.target.value as SperreGrunn)} style={inputStyle}>
          {Object.entries(SPERRE_GRUNN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Frå"><input type="date" value={fra} onChange={(e) => setFra(e.target.value)} style={inputStyle} /></Field>
        <Field label="Til og med"><input type="date" value={til} min={fra} disabled={tilVidare} onChange={(e) => setTil(e.target.value)} style={inputStyle} /></Field>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={tilVidare} onChange={(e) => setTilVidare(e.target.checked)} style={{ width: 18, height: 18 }} /> Til vidare (til nokon trykkjer «Klar»)
      </label>
      <Field label="Notat"><input value={notat} onChange={(e) => setNotat(e.target.value)} style={inputStyle} /></Field>
      {kryssar.length > 0 && (
        <div style={{ fontSize: 13, color: 'var(--pill-amber-fg)', background: 'var(--pill-amber-bg)', borderRadius: 'var(--r)', padding: '9px 12px' }}>
          {kryssar.length} reservasjon{kryssar.length === 1 ? '' : 'ar'} på denne eininga ligg i perioden. Flytt {kryssar.length === 1 ? 'han' : 'dei'} til ei anna eining eller kontakt kunden.
        </div>
      )}
    </Modal>
  );
}
