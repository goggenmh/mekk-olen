import { useState } from 'react';
import { Field, inputStyle } from '../ui/Modal';
import type { UtleigeInnstillingar } from '../../lib/utleige';
import type { UtleigeData } from './useUtleige';
import { kortStil, knapp } from './stil';

const STANDARD_VILKAR = `1. Utstyret blir leigd ut til personar over 18 år mot gyldig legitimasjon.
2. Leigetakar er ansvarleg for utstyret frå henting til retur, og for skade og tap i leigeperioden.
3. Utstyret skal leverast tilbake reint og i same stand, med alt tilbehøyr.
4. Depositum blir betalt tilbake når utstyret er kontrollert. Skade, manglande tilbehøyr eller vask kan bli trekt frå.
5. Forseinka retur blir rekna per påbyrja døgn etter gjeldande pris.
6. Utstyret skal brukast etter bruksanvisninga og med påbode verneutstyr.
7. Avbestilling må skje seinast dagen før henting.`;

export function UtleigeInnstillingarSide({ data }: { data: UtleigeData }) {
  const i = data.innstillingar;
  const [skjema, setSkjema] = useState<UtleigeInnstillingar | null>(i);
  if (!i || !skjema) return <div style={kortStil}>Fann ikkje innstillingane for butikken.</div>;
  const sett = (e: Partial<UtleigeInnstillingar>) => setSkjema({ ...skjema, ...e });
  const endra = JSON.stringify(skjema) !== JSON.stringify(i);

  return (
    <div style={{ ...kortStil, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14.5, fontWeight: 700 }}>
        <input type="checkbox" checked={skjema.offentleg} onChange={(e) => sett({ offentleg: e.target.checked })} style={{ width: 20, height: 20 }} />
        Kundesida er open (kundar kan sende førespurnader)
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Field label="Vanleg hentetid"><input type="time" value={skjema.hente_tid} onChange={(e) => sett({ hente_tid: e.target.value })} style={inputStyle} /></Field>
        <Field label="Vanleg returtid"><input type="time" value={skjema.retur_tid} onChange={(e) => sett({ retur_tid: e.target.value })} style={inputStyle} /></Field>
        <Field label="Lengste leige (dagar)"><input type="number" min={1} max={90} value={skjema.maks_dagar} onChange={(e) => sett({ maks_dagar: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })} style={inputStyle} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <Field label="Telefon i e-postane"><input value={skjema.kontakt_telefon} onChange={(e) => sett({ kontakt_telefon: e.target.value })} style={inputStyle} /></Field>
        <Field label="Kontakt-e-post"><input type="email" value={skjema.kontakt_epost} onChange={(e) => sett({ kontakt_epost: e.target.value })} style={inputStyle} /></Field>
      </div>
      <Field label="Leigevilkår (kunden må godta desse)">
        <textarea value={skjema.vilkar} onChange={(e) => sett({ vilkar: e.target.value })} rows={9} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </Field>
      {!skjema.vilkar.trim() && (
        <button type="button" onClick={() => sett({ vilkar: STANDARD_VILKAR })} style={{ ...knapp(), alignSelf: 'flex-start' }}>Bruk forslag til vilkår</button>
      )}
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        E-post til kundar blir lagd i kø og sendt når ein e-postnøkkel er sett opp i Supabase (RESEND_API_KEY og UTLEIGE_EPOST_FRA). Til då ser kunden stadfestinga på skjermen, og de kan ringje eller sende SMS frå reservasjonen.
      </div>
      <button disabled={!endra} onClick={() => data.lagreInnstillingar(skjema).catch(() => {})} style={{ ...knapp(true), alignSelf: 'flex-start', opacity: endra ? 1 : 0.5 }}>Lagre innstillingar</button>
    </div>
  );
}
