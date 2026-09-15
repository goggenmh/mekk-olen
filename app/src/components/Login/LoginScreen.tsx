import { useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { pad, fullDatoTekst, today } from '../../lib/dates';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function LoginScreen() {
  const { pick, pin, feil, pickUser, back, pressDigit, backspace } = useAuth();
  const { ansatte } = useAnsatte();

  // Levande klokke
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fysisk tastatur: tal fyller PIN, Backspace slettar, Escape går tilbake
  useEffect(() => {
    if (!pick) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') { pressDigit(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { backspace(); e.preventDefault(); }
      else if (e.key === 'Escape') { back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick, pressDigit, backspace, back]);

  const dateStr = `${fullDatoTekst(today())} ${new Date().getFullYear()}`;

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        padding: 'clamp(28px, 6vh, 60px) 24px 48px', gap: 6,
        background:
          'radial-gradient(900px 500px at 50% -6%, rgba(43,182,201,0.26), transparent 60%),' +
          'radial-gradient(700px 520px at 88% 112%, rgba(198,126,30,0.18), transparent 55%),' +
          'linear-gradient(160deg,#0a1f30 0%,#0e2c42 55%,#0b2334 100%)',
        backgroundColor: '#0b2334',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 38, height: 38, borderRadius: 11 }} />
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.6px', color: '#eaf6f8' }}>MEKK ØLEN</span>
      </div>

      <div style={{ fontFamily: "'Geist Mono'", fontWeight: 700, fontSize: 'clamp(54px, 10vw, 78px)', color: '#eaf6f8', letterSpacing: '-1px', lineHeight: 1, textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
        {pad(now.getHours())}:{pad(now.getMinutes())}<span style={{ color: '#6fe0ef' }}>:{pad(now.getSeconds())}</span>
      </div>
      <div style={{ fontSize: 16, color: '#9cc0cc', fontWeight: 500, marginTop: 12, letterSpacing: '0.3px' }}>{dateStr}</div>

      <div style={{ ...glass, marginTop: 'clamp(28px, 5vh, 48px)' }}>
        {pick ? (
          <>
            <button onClick={back} style={backBtn}>‹ Byt brukar</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 58, height: 58, borderRadius: 17, background: pick.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                {pick.init}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#eaf6f8' }}>Hei, {pick.navn.split(' ')[0]}</div>
              <div style={{ fontSize: 12.5, color: '#9cc0cc', marginTop: 3, marginBottom: 20 }}>Tast PIN på tastaturet eller under</div>

              <div className={feil ? 'login-shake' : undefined} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                {[0, 1, 2, 3].map((i) => {
                  const fylt = i < pin.length;
                  const aktiv = i === pin.length;
                  return (
                    <div
                      key={i}
                      style={{
                        width: 48, height: 56, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Geist Mono'", fontSize: 24, fontWeight: 700, color: '#eaf6f8',
                        border: `1.5px solid ${fylt || aktiv ? '#2bb6c9' : 'rgba(255,255,255,0.18)'}`,
                        background: 'rgba(255,255,255,0.05)',
                        boxShadow: aktiv ? '0 0 0 3px rgba(43,182,201,0.22)' : 'none',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {fylt ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {feil ? (
                <div style={{ textAlign: 'center', maxWidth: 300, margin: '6px 0 14px' }}>
                  <div style={{ fontSize: 13, color: '#ff9b8f', fontWeight: 600 }}>Feil PIN — prøv igjen</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#7fb3c1', margin: '8px 0 16px' }}>0–9 for å taste · ⌫ for å slette</div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,72px)', gap: 11 }}>
                {PAD_KEYS.map((k) => (
                  <button key={k} className="glasskey" onClick={() => pressDigit(k)} style={padKey}>{k}</button>
                ))}
                <div />
                <button className="glasskey" onClick={() => pressDigit('0')} style={padKey}>0</button>
                <button className="glasskey" onClick={backspace} style={{ ...padKey, color: '#9cc0cc', fontSize: 17, fontFamily: "'Geist'" }}>⌫</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: '#7fb3c1', marginBottom: 18, textAlign: 'center' }}>Vel kven du er</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ansatte.map((u) => (
                <button key={u.id} className="glassrow" onClick={() => pickUser(u.id)} style={rowBtn}>
                  <div style={{ flex: 'none', width: 42, height: 42, borderRadius: 13, background: u.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    {u.init}
                  </div>
                  <div style={{ lineHeight: 1.25, textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#eaf6f8' }}>{u.navn}</div>
                    <div style={{ fontSize: 12, color: '#9cc0cc' }}>{u.rolle}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>›</span>
                </button>
              ))}
            </div>
            {ansatte.length === 0 && (
              <div style={{ marginTop: 16, padding: '10px 13px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, fontSize: 11.5, color: '#9cc0cc', lineHeight: 1.4, textAlign: 'center' }}>
                Ingen ansatte funne. Sjekk Supabase-oppsettet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const glass: CSSProperties = {
  width: '100%', maxWidth: 440, borderRadius: 22, padding: '28px 28px 32px',
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
};
const backBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9cc0cc', fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, marginBottom: 14 };
const rowBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s ease' };
const padKey: CSSProperties = { height: 54, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', borderRadius: 14, cursor: 'pointer', fontFamily: "'Geist Mono'", fontSize: 20, fontWeight: 600, color: '#eaf6f8', transition: 'all 0.12s ease' };
