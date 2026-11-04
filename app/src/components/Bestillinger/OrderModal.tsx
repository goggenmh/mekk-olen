import { useEffect, useRef, useState } from 'react';
import { Modal, Field, inputStyle, CancelButton, SaveButton, DeleteButton } from '../ui/Modal';
import { supabase } from '../../supabaseClient';
import { useAppData } from '../../context/AppDataContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { ORDER_FLOW, ORDER_STATUS } from '../../constants';
import { today, fmtPris } from '../../lib/dates';
import type { Order } from '../../types';
import { storeOrd, storFyrste } from '../../lib/tekst';

// Eit treff frå lager-søket (same form som lager_sok gjev).
interface LagerPlass { plass: string; tal: number }
interface LagerTreff { nr: string; namn: string; strekkode: string | null; eining: string | null; total: number; plassar: LagerPlass[] }
interface Beholdning { total: number; eining: string | null; plassar: LagerPlass[] }

// `prefyll` lèt t.d. lager-sida opne «Ny bestilling» ferdig utfylt frå ei vare.
export interface OrderPrefyll { vare?: string; varenr?: string; leverandor?: string; beholdning?: Beholdning }

export function OrderModal({ existing, prefyll, onClose }: { existing?: Order; prefyll?: OrderPrefyll; onClose: () => void }) {
  const { saveOrder, deleteOrder } = useAppData();
  const { findAnsatt } = useAnsatte();
  const funnen = existing?.registrertAv ? findAnsatt(existing.registrertAv) : null;
  const lagtInnAv = funnen?.navn ? funnen : null;

  const [kunde, setKunde] = useState(existing?.kunde || '');
  const [telefon, setTelefon] = useState(existing?.telefon || '');
  const [vare, setVare] = useState(existing?.vare || prefyll?.vare || '');
  const [leverandor, setLeverandor] = useState(existing?.leverandor || prefyll?.leverandor || '');
  const [varenr, setVarenr] = useState(existing?.varenr || prefyll?.varenr || '');

  // Lagersøk på «Vare»-feltet: fyller namn + varenr frå varelista og viser kor
  // mange som er på lager. Vi hoppar over fyrste søk når feltet alt har innhald
  // (redigering eller prefyll), så lista ikkje sprett opp med ein gong.
  const [lagerTreff, setLagerTreff] = useState<LagerTreff[]>([]);
  const [visListe, setVisListe] = useState(false);
  const [beholdning, setBeholdning] = useState<Beholdning | null>(prefyll?.beholdning ?? null);
  const hoppOverSok = useRef((existing?.vare || prefyll?.vare || '').trim().length >= 2);
  const sokSeq = useRef(0);
  const [lenke, setLenke] = useState(existing?.lenke || '');
  const [dato, setDato] = useState(existing?.dato || today());
  const [antal, setAntal] = useState(existing?.antal ?? 1);
  const [status, setStatus] = useState(existing?.status || ORDER_FLOW[0]);
  const [notat, setNotat] = useState(existing?.notat || '');
  // Pris per stk som tekst, så komma og mellomrom kan skrivast («1 199,50»).
  const [pris, setPris] = useState(existing?.pris != null ? String(existing.pris).replace('.', ',') : '');
  const prisTal = pris.trim() ? Number(pris.replace(/\s/g, '').replace(',', '.')) : null;
  const prisFeil = prisTal !== null && (!Number.isFinite(prisTal) || prisTal < 0);
  const [feil, setFeil] = useState(false);

  // Produktbilete: frå før, frå søk, eller (ved lagring) henta frå lenka.
  const [bilde, setBilde] = useState<string | null>(existing?.bilde ?? null);
  const [sokar, setSokar] = useState(false);
  const [sokMelding, setSokMelding] = useState<string | null>(null);

  // Når lenka blir endra manuelt, nullstill biletet (eller hent att det gamle).
  const endreLenke = (v: string) => {
    setLenke(v);
    setBilde(v.trim() === (existing?.lenke || '') ? (existing?.bilde ?? null) : null);
  };

  // Finst det alt ei lenke, hentar vi berre biletet frå ho (og rører ikkje
  // lenka). Elles søkjer vi opp produktet – helst på mekk.no ut frå varenr,
  // elles på nettet ut frå vare + leverandør.
  const harLenke = lenke.trim() !== '';
  const kanHente = harLenke || varenr.trim().length >= 2 || (vare.trim() !== '' && leverandor.trim() !== '');
  const hentProdukt = async () => {
    if (sokar || !kanHente) return;
    setSokar(true); setSokMelding(null);
    try {
      if (harLenke) {
        const { data, error } = await supabase.functions.invoke('lenke-bilete', { body: { url: lenke.trim() } });
        const r = data as { bilde?: string | null } | null;
        if (error) setSokMelding('Klarte ikkje hente bilete frå lenka.');
        else if (r?.bilde) { setBilde(r.bilde); setSokMelding('Bilete henta frå lenka.'); }
        else setSokMelding('Fann ikkje noko bilete på den sida.');
      } else {
        const { data, error } = await supabase.functions.invoke('finn-produkt', { body: { vare: vare.trim(), leverandor: leverandor.trim(), varenr: varenr.trim() } });
        const r = data as { lenke?: string | null; bilde?: string | null; merknad?: string; kjelde?: string } | null;
        if (error || !r) setSokMelding('Søket feila. Prøv igjen, eller lim inn lenka sjølv.');
        else if (r.lenke) { setLenke(r.lenke); setBilde(r.bilde ?? null); setSokMelding(`Forslag henta${r.kjelde ? ' frå ' + r.kjelde : ''} – sjekk at det er rett produkt før du lagrar.`); }
        else setSokMelding(r.merknad || 'Fann ingen treff.');
      }
    } catch { setSokMelding('Noko gjekk gale. Prøv igjen.'); }
    setSokar(false);
  };

  // Søk i varelista når du skriv i «Vare». Treff blir viste i ei lita liste.
  useEffect(() => {
    if (hoppOverSok.current) { hoppOverSok.current = false; return; }
    const s = vare.trim();
    const id = ++sokSeq.current;
    // All state-endring skjer inne i tidsavbrotet (ikkje synkront i effekten).
    const t = setTimeout(async () => {
      if (s.length < 2) { if (id === sokSeq.current) { setLagerTreff([]); setVisListe(false); } return; }
      try {
        const { data, error } = await supabase.rpc('lager_sok', { p_q: s });
        if (id !== sokSeq.current) return;
        if (error) { setLagerTreff([]); setVisListe(false); return; }
        const rader = ((data ?? []) as LagerTreff[]).slice(0, 6);
        setLagerTreff(rader);
        setVisListe(rader.length > 0);
      } catch { /* lageret er ikkje tilgjengeleg (t.d. i demo) – feltet er vanleg tekst */ }
    }, 250);
    return () => clearTimeout(t);
  }, [vare]);

  const velLagervare = (v: LagerTreff) => {
    hoppOverSok.current = true;
    setVare(v.namn);
    setVarenr(v.nr);
    setBeholdning({ total: v.total, eining: v.eining, plassar: v.plassar });
    setVisListe(false);
    setLagerTreff([]);
  };

  const endreVare = (v: string) => {
    setVare(v);
    setBeholdning(null); // beholdninga høyrer til ei vald vare – nullstill ved manuell skriving
  };

  const save = async () => {
    if (!kunde.trim()) { setFeil(true); return; }
    if (prisFeil) return;
    await saveOrder({ id: existing?.id, kunde: storeOrd(kunde.trim()), telefon, vare: storFyrste(vare.trim()), leverandor: storFyrste(leverandor.trim()), varenr, lenke: lenke.trim() || null, dato, antal, status, notat: storFyrste(notat.trim()), pris: prisTal === null ? null : Math.round(prisTal * 100) / 100, varsla: existing?.varsla ?? null, bilde });
    onClose();
  };

  const del = async () => {
    if (existing) await deleteOrder(existing.id);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={existing ? 'Endre bestilling' : 'Ny bestilling'}
      maxWidth={460}
      footer={
        <>
          {existing && <DeleteButton onClick={del} />}
          <CancelButton onClick={onClose} />
          <SaveButton onClick={save} />
        </>
      }
    >
      {lagtInnAv && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Lagt inn av <b style={{ color: 'var(--text-secondary)' }}>{lagtInnAv.navn}</b></div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Kunde">
          <input value={kunde} onChange={(e) => { setKunde(e.target.value); setFeil(false); }} onBlur={() => setKunde(storeOrd)} autoCapitalize="words" placeholder="Namn" autoComplete="off" style={inputStyle} />
        </Field>
        <Field label="Telefon">
          <input type="tel" inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="For SMS når varen er komen" style={inputStyle} />
        </Field>
      </div>
      {feil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv inn kundenamn.</div>}
      <Field label="Notat">
        <input value={notat} onChange={(e) => setNotat(e.target.value)} onBlur={() => setNotat(storFyrste)} autoCapitalize="sentences" placeholder="T.d. «liten fyr med lue», ønskjer å bli ringt" style={inputStyle} />
      </Field>
      <Field label="Vare">
        <div style={{ position: 'relative' }}>
          <input
            value={vare}
            onChange={(e) => endreVare(e.target.value)}
            onFocus={() => { if (lagerTreff.length > 0) setVisListe(true); }}
            onBlur={() => { setVare(storFyrste); setTimeout(() => setVisListe(false), 150); }}
            autoCapitalize="sentences" autoComplete="off" placeholder="Skriv namn eller varenr – søkjer i varelista" style={inputStyle}
          />
          {visListe && lagerTreff.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
              {lagerTreff.map((v) => (
                <button
                  key={v.nr} type="button"
                  onMouseDown={(e) => { e.preventDefault(); velLagervare(v); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'baseline', gap: 8, padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--divider)', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)' }}
                >
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.namn}</span>
                  <span style={{ flex: 'none', fontSize: 11.5, color: 'var(--text-faint)' }}>{v.nr}</span>
                  <span style={{ flex: 'none', fontSize: 11.5, fontWeight: 700, color: v.total > 0 ? 'var(--pill-gronn-fg)' : 'var(--text-faint)' }}>{v.total > 0 ? `${v.total} på lager` : 'tomt'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>
      {beholdning && (
        <div style={{ marginTop: -4, fontSize: 12.5, lineHeight: 1.45, padding: '8px 11px', borderRadius: 'var(--r)', background: beholdning.total > 0 ? 'var(--pill-amber-bg)' : 'var(--surface-alt)', color: beholdning.total > 0 ? 'var(--pill-amber-fg)' : 'var(--text-muted)' }}>
          {beholdning.total > 0 ? (
            <>
              <b>{beholdning.total}{beholdning.eining ? ` ${beholdning.eining}` : ''} på lager</b>
              {beholdning.plassar.length > 0 && ` (${beholdning.plassar.map((p) => `${p.plass}: ${p.tal}`).join(', ')})`}
              {' – sjekk om du treng å bestille.'}
            </>
          ) : 'Ikkje på lager no.'}
        </div>
      )}
      <Field label="Lenke til produkt">
        <input value={lenke} autoCapitalize="off" onChange={(e) => endreLenke(e.target.value)} placeholder="https://…" style={inputStyle} />
      </Field>
      {bilde && (
        <img src={bilde} alt="Produktbilete" onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ width: 96, height: 96, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginTop: -4 }} />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Leverandør">
          <input value={leverandor} onChange={(e) => setLeverandor(e.target.value)} onBlur={() => setLeverandor(storFyrste)} autoCapitalize="sentences" style={inputStyle} />
        </Field>
        <Field label="Varenr">
          <input value={varenr} onChange={(e) => setVarenr(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      {kanHente && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={hentProdukt} disabled={sokar}
            style={{ alignSelf: 'flex-start', padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--surface-alt)', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: sokar ? 'default' : 'pointer', fontFamily: 'inherit', opacity: sokar ? 0.6 : 1 }}>
            {sokar ? (harLenke ? 'Hentar …' : 'Søkjer …') : (harLenke ? 'Hent bilete frå lenka' : 'Finn produktet (prøv)')}
          </button>
          {sokMelding && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{sokMelding}</div>}
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4 }}>
            {harLenke
              ? 'Hentar produktbiletet frå lenka du har lagt inn. Lenka blir ikkje endra.'
              : 'Eksperimentelt: søkjer opp produktet på mekk.no ut frå varenr, elles på nettet ut frå vare + leverandør. Kontroller alltid at lenka er rett før du lagrar.'}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Dato">
          <input type="date" value={dato} onChange={(e) => setDato(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Antal">
          <input type="number" min={1} value={antal} onChange={(e) => setAntal(Number(e.target.value))} style={inputStyle} />
        </Field>
      </div>
      <Field label="Pris per stk (kr)">
        <input inputMode="decimal" value={pris} onChange={(e) => setPris(e.target.value)} placeholder="T.d. 1199,00" autoComplete="off" style={inputStyle} />
      </Field>
      {prisFeil && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Skriv prisen som eit tal, t.d. 1199,00.</div>}
      {prisTal !== null && !prisFeil && antal > 1 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -6 }}>Totalt {fmtPris(prisTal * antal)} for {antal} stk</div>
      )}
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
          {ORDER_FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].tekst}</option>)}
        </select>
      </Field>
    </Modal>
  );
}
