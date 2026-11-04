import { useMemo, useState, type CSSProperties } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { Avatar } from '../ui/Avatar';

// Beskjedtavle: ei lita delt tavle for vaktoverlevering og korte beskjedar
// («Per hentar kjedesaga kl. 14»). Alle tilsette kan leggje ut og sjå.
// Byggjer på den eksisterande `meldinger`-tabellen (til = null = til alle),
// så ingen databaseendring trengst. Beskjedar eldre enn nokre dagar fell av
// tavla av seg sjølv (dei ligg framleis under Administrasjon).
const DAGAR_SYNLEG = 5;

const labelStyle: CSSProperties = { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--text-label)' };

function sidanTekst(iso: string, no: number): string {
  const min = Math.round((no - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'nett no';
  if (min < 60) return `${min} min sidan`;
  const t = Math.round(min / 60);
  if (t < 24) return `${t} ${t === 1 ? 'time' : 'timar'} sidan`;
  const d = Math.round(t / 24);
  return d === 1 ? 'i går' : `${d} dagar sidan`;
}

export function Beskjedtavle({ style }: { style?: CSSProperties }) {
  const { meldinger, sendMelding, deleteMelding, canApprove } = useAppData();
  const { user } = useAuth();
  const { findAnsatt } = useAnsatte();
  const [tekst, setTekst] = useState('');
  const [sender, setSender] = useState(false);
  const [no] = useState(() => Date.now());
  const kanSletteAlle = canApprove(user?.id);

  // Berre tavle-beskjedar (til = null) frå dei siste dagane, nyaste fyrst.
  const synlege = useMemo(() => {
    const grense = no - DAGAR_SYNLEG * 86400000;
    return meldinger
      .filter((m) => m.til === null && new Date(m.created_at).getTime() >= grense)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [meldinger, no]);

  const leggUt = async () => {
    const t = tekst.trim();
    if (!t || !user || sender) return;
    setSender(true);
    try { await sendMelding(user.id, null, t); setTekst(''); } catch { /* feilen blir vist via toast i laget under */ }
    setSender(false);
  };

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={labelStyle}>Beskjedtavle</div>
        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>til alle på jobb</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: synlege.length ? 12 : 0 }}>
        <input
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') leggUt(); }}
          placeholder="Skriv ein beskjed til dei andre …"
          aria-label="Ny beskjed"
          maxLength={280}
          style={{ flex: 1, minWidth: 0, padding: '9px 11px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text)' }}
        />
        <button
          onClick={leggUt}
          disabled={!tekst.trim() || sender}
          className="knapp-teal"
          style={{ flex: 'none', opacity: tekst.trim() && !sender ? 1 : 0.5 }}
        >
          Legg ut
        </button>
      </div>

      {synlege.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen beskjedar no. Skriv den fyrste over.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {synlege.map((m) => {
            const a = findAnsatt(m.fra);
            const kanSlette = kanSletteAlle || m.fra === user?.id;
            return (
              <div key={m.id} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                <Avatar init={a.init} farge={a.farge} size={26} fontSize={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>{m.tekst}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.navn.split(' ')[0]} · {sidanTekst(m.created_at, no)}</div>
                </div>
                {kanSlette && (
                  <button
                    onClick={() => deleteMelding(m.id)}
                    title="Fjern beskjed" aria-label="Fjern beskjed"
                    style={{ flex: 'none', alignSelf: 'flex-start', border: 'none', background: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2 }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
