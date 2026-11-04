import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { lesSti } from '../../lib/view';
import { datoKort } from '../../lib/dates';

// Offentleg sporing av bestilling (/spor/<id>): ingen innlogging. Snakkar berre
// med den trygge funksjonen bestilling_status(p_id), som gjev eit minimum av
// ikkje-sensitive felt. Kunden kjem hit frå lenkja i SMS-en.

interface Status { vare: string; status: string; dato: string; butikk: string | null }

// Kundevenlege steg (internt: ny → tinga → komen → henta).
const STEG: { kode: string; tittel: string; tekst: string }[] = [
  { kode: 'ny', tittel: 'Registrert', tekst: 'Vi har teke imot bestillinga.' },
  { kode: 'tinga', tittel: 'Bestilt', tekst: 'Vara er tinga frå leverandør.' },
  { kode: 'komen', tittel: 'Komen i butikk', tekst: 'Vara er klar for henting.' },
  { kode: 'henta', tittel: 'Henta', tekst: 'Vara er henta. Takk!' },
];

function idFraSti(): string | null {
  const m = lesSti().match(/\/spor\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function SporBestilling() {
  const [svar, setSvar] = useState<Status | null>(null);
  const [tilstand, setTilstand] = useState<'lastar' | 'ok' | 'ikkje-funne' | 'feil'>('lastar');

  useEffect(() => {
    let avbroten = false;
    // All state-endring skjer inne i den asynkrone funksjonen (ikkje synkront i
    // effekt-kroppen).
    (async () => {
      const id = idFraSti();
      if (!id) { if (!avbroten) setTilstand('ikkje-funne'); return; }
      try {
        const { data, error } = await supabase.rpc('bestilling_status', { p_id: id });
        if (avbroten) return;
        if (error) { setTilstand('feil'); return; }
        const rad = (data as Status[] | null)?.[0];
        if (!rad) { setTilstand('ikkje-funne'); return; }
        setSvar(rad);
        setTilstand('ok');
      } catch { if (!avbroten) setTilstand('feil'); }
    })();
    return () => { avbroten = true; };
  }, []);

  const naaIdx = svar ? STEG.findIndex((s) => s.kode === svar.status) : -1;
  const butikk = svar?.butikk || 'MEKK';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ background: 'var(--mekk-navy)', color: '#ffffff' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/mekk-logo.png" alt="MEKK" style={{ width: 38, height: 38 }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>{butikk}</div>
            <div style={{ fontSize: 12.5, color: '#b9cbd8', fontWeight: 700 }}>Status på bestillinga di</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' }}>
        {tilstand === 'lastar' && <div style={{ color: 'var(--text-muted)' }}>Hentar status …</div>}

        {(tilstand === 'ikkje-funne' || tilstand === 'feil') && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '20px 18px', fontSize: 14.5, lineHeight: 1.5 }}>
            {tilstand === 'feil'
              ? 'Klarte ikkje hente status akkurat no. Prøv igjen om litt.'
              : 'Fann inga bestilling på denne lenkja. Sjekk at du opna heile lenkja frå meldinga, eller ta kontakt med butikken.'}
          </div>
        )}

        {tilstand === 'ok' && svar && (
          <>
            <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 4px' }}>{svar.vare}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 22 }}>Registrert {datoKort(svar.dato)}</div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 18px' }}>
              {STEG.map((s, i) => {
                const gjort = i <= naaIdx;
                const naa = i === naaIdx;
                const sisteSteg = i === STEG.length - 1;
                return (
                  <div key={s.kode} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
                      <div style={{ width: 26, height: 26, flex: 'none', borderRadius: '50%', marginTop: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900,
                        background: gjort ? 'var(--mekk-navy)' : 'var(--surface-alt)',
                        color: gjort ? 'var(--mekk-lime)' : 'var(--text-faint)',
                        border: naa ? '2px solid var(--mekk-lime)' : gjort ? 'none' : '1px solid var(--border)' }}>
                        {i < naaIdx ? '✓' : i + 1}
                      </div>
                      {!sisteSteg && <div style={{ width: 2, flex: 1, minHeight: 26, background: i < naaIdx ? 'var(--mekk-navy)' : 'var(--border)', margin: '2px 0' }} />}
                    </div>
                    <div style={{ padding: '14px 0', flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: gjort ? 'var(--text)' : 'var(--text-faint)' }}>
                        {s.tittel}{naa && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--pill-gronn-fg)', background: 'var(--pill-gronn-bg)', padding: '2px 8px', borderRadius: 999 }}>No her</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{s.tekst}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {svar.status === 'komen' && (
              <div style={{ marginTop: 16, background: 'var(--pill-gronn-bg)', color: 'var(--pill-gronn-fg)', borderRadius: 'var(--r)', padding: '14px 16px', fontSize: 14.5, fontWeight: 700, lineHeight: 1.45 }}>
                Vara er klar for henting hos {butikk}. Du betaler når du hentar.
              </div>
            )}

            <div style={{ marginTop: 22, fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>
              Statusen oppdaterer seg når butikken flyttar bestillinga vidare. Last sida på nytt for siste status.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
