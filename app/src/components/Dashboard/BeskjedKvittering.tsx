import { useMemo, useState } from 'react';
import { useAppData } from '../../context/appData';
import { useAuth } from '../../context/auth';
import { useAnsatte } from '../../context/ansatte';
import { Avatar } from '../ui/Avatar';

// Blokkerande kvittering på nye beskjedtavle-beskjedar. Når nokon legg ut ein
// beskjed, får dei andre han som fyrste ting på skjermen neste gong dei opnar
// appen – dei må trykkje «Mottatt» på kvar beskjed før dei kan halde fram, så
// beskjeden faktisk blir sett. Viser null når det ikkje er noko å kvittere på.
const DAGAR = 14;

export function BeskjedKvittering() {
  const { meldinger, meldingarMottatt, kvitterMelding, kvitteringKlar } = useAppData();
  const { user } = useAuth();
  const { findAnsatt } = useAnsatte();
  const [no] = useState(() => Date.now());
  const [kvitterar, setKvitterar] = useState<string | null>(null);

  const uakka = useMemo(() => {
    if (!user || !kvitteringKlar) return [];
    const grense = no - DAGAR * 86400000;
    return meldinger
      .filter((m) => m.til === null && m.fra !== user.id
        && new Date(m.created_at).getTime() >= grense
        && !meldingarMottatt.some((k) => k.meldingId === m.id && k.ansatt === user.id))
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }, [meldinger, meldingarMottatt, user, no, kvitteringKlar]);

  if (!user || uakka.length === 0) return null;

  const kvitter = async (id: string) => {
    if (kvitterar) return;
    setKvitterar(id);
    try { await kvitterMelding(id, user.id); } catch { /* feil blir vist via toast */ }
    setKvitterar(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nye beskjedar"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,35,53,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', borderTop: '4px solid var(--mekk-lime)' }}>
        <div style={{ padding: '20px 22px 8px' }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            {uakka.length === 1 ? 'Ny beskjed' : `${uakka.length} nye beskjedar`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Trykk «Mottatt» på kvar beskjed for å halde fram.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 18px 20px' }}>
          {uakka.map((m) => {
            const a = findAnsatt(m.fra);
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 15px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar init={a.init} farge={a.farge} size={30} fontSize={11} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.45, wordBreak: 'break-word', fontWeight: 600 }}>{m.tekst}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Frå {a.navn.split(' ')[0]}</div>
                  </div>
                </div>
                <button
                  onClick={() => kvitter(m.id)}
                  disabled={!!kvitterar}
                  className="knapp-gronn"
                  style={{ alignSelf: 'flex-end', padding: '9px 20px', fontSize: 14, opacity: kvitterar ? 0.6 : 1 }}
                >
                  {kvitterar === m.id ? 'Lagrar…' : '✓ Mottatt'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
