import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

interface Status { plassar: number; varer_med_beholdning: number; hendingar: number }

const STEG = [
  { tittel: 'Rydd og sorter hyllene', tekst: 'Ta eitt lager om gongen. Rydd, sorter og bestem kva som skal stå kvar.' },
  { tittel: 'Opprett lagerplassar', tekst: 'I skanne-appen lagar de ein plass per hylle/seksjon (t.d. A-01, A-02 …) som svarar til det fysiske lageret.' },
  { tittel: 'Skann, tel og plasser', tekst: 'Skann vara, tel kor mange de har, og vel lagerplassen. Registrer som mottak – éi hylle av gongen.' },
  { tittel: 'Gjenta for dei andre lagera', tekst: 'Når beholdninga er inne, viser lager-søket og «bestill til kunde» ekte tal på kva de har og kvar.' },
];

// «Kom i gang»-rettleiar på lager-sida. Lageret får berre beholdning når nokon
// skannar det inn, så dette senkar terskelen for å kome i gang – med live
// framdrift frå lager_status(). Full rettleiar når lageret er tomt; ei slank
// framdriftslinje når det er i bruk.
export function KomIGang({ onOpneSkanning }: { onOpneSkanning: () => void }) {
  const [status, setStatus] = useState<Status | 'feil' | null>(null);

  useEffect(() => {
    supabase.rpc('lager_status').then(({ data, error }) => {
      if (error) { setStatus('feil'); return; }
      setStatus(((data as Status[] | null)?.[0]) ?? { plassar: 0, varer_med_beholdning: 0, hendingar: 0 });
    });
  }, []);

  if (status === null || status === 'feil') return null;
  const iGang = status.varer_med_beholdning > 0;

  // Slank framdriftslinje når lageret alt er teke i bruk.
  if (iGang) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px', padding: '10px 14px', borderRadius: 'var(--r)', background: 'var(--surface-alt)', border: '1px solid var(--border)', fontSize: 13 }}>
        <span style={{ fontWeight: 700, color: 'var(--pill-gronn-fg)' }}>Lageret er i gang</span>
        <span style={{ color: 'var(--text-muted)' }}>{status.plassar} lagerplassar · {status.varer_med_beholdning} varer med beholdning</span>
        <button onClick={onOpneSkanning} style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Hald fram i skanninga ↗</button>
      </div>
    );
  }

  // Full rettleiar når lageret er tomt.
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--mekk-lime)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
      <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>Kom i gang med lageret</div>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '6px 0 16px', maxWidth: 620 }}>
        Varelista er importert, men lageret veit ikkje <b>kor mange</b> de har av kvar vare enno – det blir berre til når nokon skannar det inn.
        Ei ryddehelg der de sorterer hyllene og skannar inn varene er akkurat rett. Slik gjer de det:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
        {STEG.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <span style={{ flex: 'none', width: 28, height: 28, borderRadius: 999, background: 'var(--mekk-navy)', color: 'var(--mekk-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900 }}>{i + 1}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>{s.tittel}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 2 }}>{s.tekst}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', background: 'var(--pill-teal-bg)', borderRadius: 'var(--r)', padding: '9px 12px', marginBottom: 14, lineHeight: 1.45 }}>
        <b>Tips:</b> de treng ikkje gjere alt på éin gong. Alt de skannar inn blir rett med ein gong, og resten kan kome etter kvart.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <button onClick={onOpneSkanning} style={{ padding: '10px 16px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', cursor: 'pointer', fontFamily: 'inherit' }}>
          Opne lager-skanning ↗
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
          Så langt: {status.plassar} {status.plassar === 1 ? 'lagerplass' : 'lagerplassar'} · {status.varer_med_beholdning} varer med beholdning
        </span>
      </div>
    </div>
  );
}
