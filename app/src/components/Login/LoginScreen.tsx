import { useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { pad, fullDatoTekst, today } from '../../lib/dates';
import { tekstPaFarge } from '../../lib/farge';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
// Kategoriane frå toppstripa på mekk.no, med chevronen frå logoen.
const STRIPE = ['BIL', 'BÅT', 'HJEM', 'FRITID', 'VERKTØY'];

// Innlogginga ser lik ut i lys og mørk modus: marine flate og kvitt kort,
// som toppstripa og produktkorta på mekk.no.
export function LoginScreen() {
  const { pick, pin, feil, pickUser, back, pressDigit, backspace } = useAuth();
  const { loginAnsatte, butikkar, finnButikk, loading } = useAnsatte();
  // Innloggings-skjermen brukar den økt-uavhengige lista (upåverka av ei
  // gammal økt som elles ville gitt «0 tilsette»).
  const ansatte = loginAnsatte;

  // Butikk-val (berre synleg viss det finst meir enn éin aktiv butikk).
  const [valdButikk, setValdButikk] = useState<string | null>(null);
  const effektivButikk = valdButikk ?? (butikkar.length === 1 ? butikkar[0].id : null);
  const maaVeljeButikk = butikkar.length > 1 && !valdButikk;
  const synlege = effektivButikk ? ansatte.filter((a) => a.butikk_id === effektivButikk) : ansatte;
  const merke = finnButikk(effektivButikk ?? undefined)?.namn?.toUpperCase() || 'MEKK';

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--mekk-navy)', color: '#ffffff', fontFamily: 'var(--font-sans)' }}>
      {/* Toppstripe som på mekk.no */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 24px', height: 40, borderBottom: '1px solid var(--mekk-navy-700)', fontSize: 13, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {STRIPE.map((s) => (
          <span key={s}><span style={{ color: 'var(--mekk-teal)', fontWeight: 900 }}>‹</span> {s}</span>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(24px, 5vh, 52px) 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/mekk-logo.png" alt="MEKK" style={{ width: 44, height: 44 }} />
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.01em' }}>{merke}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#b9cbd8' }}>
              Skikkelig bra jernvare <span style={{ color: 'var(--mekk-teal)', fontWeight: 900 }}>‹</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'clamp(22px, 4vh, 36px)', fontWeight: 900, fontSize: 'clamp(56px, 11vw, 88px)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </div>
        {/* Den skjeve lime-lappen frå prislappane på mekk.no */}
        <div style={{ marginTop: 14, background: 'var(--mekk-lime)', color: 'var(--mekk-ink)', padding: '6px 12px', fontSize: 14, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.01em', transform: 'rotate(-3deg)' }}>
          {dateStr}
        </div>

        <div style={{ ...kort, marginTop: 'clamp(26px, 5vh, 44px)' }}>
          {pick ? (
            <>
              <button onClick={back} style={backBtn}><span style={{ color: 'var(--mekk-teal-700)', fontWeight: 900 }}>‹</span> Byt brukar</button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 60, height: 60, background: pick.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: tekstPaFarge(pick.farge), marginBottom: 12 }}>
                  {pick.init}
                </div>
                <div style={tittel}>Hei, {pick.navn.split(' ')[0]}</div>
                <div style={{ fontSize: 13, color: 'var(--mekk-text-muted)', marginTop: 4, marginBottom: 20 }}>Tast PIN på tastaturet eller under</div>

                <div className={feil ? 'login-shake' : undefined} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  {[0, 1, 2, 3].map((i) => {
                    const fylt = i < pin.length;
                    const aktiv = i === pin.length;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 52, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28, fontWeight: 900, color: 'var(--mekk-ink)',
                          border: `2px solid ${aktiv ? 'var(--mekk-navy)' : fylt ? 'var(--mekk-lime)' : 'var(--mekk-line)'}`,
                          background: fylt ? 'var(--mekk-lime)' : '#ffffff',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {fylt ? '•' : ''}
                      </div>
                    );
                  })}
                </div>

                {feil ? (
                  <div style={{ textAlign: 'center', maxWidth: 300, margin: '6px 0 14px', fontSize: 13, color: 'var(--mekk-danger)', fontWeight: 700 }}>{feil}</div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--mekk-text-subtle)', margin: '8px 0 16px' }}>0–9 for å taste · ⌫ for å slette</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,76px)', gap: 8 }}>
                  {PAD_KEYS.map((k) => (
                    <button key={k} className="mk-tast" onClick={() => pressDigit(k)} style={padKey}>{k}</button>
                  ))}
                  <div />
                  <button className="mk-tast" onClick={() => pressDigit('0')} style={padKey}>0</button>
                  <button className="mk-tast" onClick={backspace} aria-label="Slett" style={{ ...padKey, fontSize: 18 }}>⌫</button>
                </div>
              </div>
            </>
          ) : loading ? (
            <div style={{ padding: '30px 0 18px', textAlign: 'center' }}>
              <div className="loginspinner" />
              <div style={{ fontSize: 13, color: 'var(--mekk-text-muted)', marginTop: 14 }}>Lastar…</div>
            </div>
          ) : maaVeljeButikk ? (
            <>
              <div style={{ ...tittel, marginBottom: 16 }}>Vel butikk</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {butikkar.map((b) => {
                  const antal = ansatte.filter((a) => a.butikk_id === b.id).length;
                  return (
                    <button key={b.id} className="mk-rad" onClick={() => setValdButikk(b.id)} style={{ ...radBtn, borderLeft: `4px solid ${b.farge}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--mekk-ink)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.namn}</div>
                        <div style={{ fontSize: 12, color: 'var(--mekk-text-muted)', marginTop: 2 }}>{antal} {antal === 1 ? 'tilsett' : 'tilsette'}</div>
                      </div>
                      <span className="mk-chev">‹</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {butikkar.length > 1 && (
                <button onClick={() => setValdButikk(null)} style={backBtn}><span style={{ color: 'var(--mekk-teal-700)', fontWeight: 900 }}>‹</span> Byt butikk</button>
              )}
              <div style={{ ...tittel, marginBottom: 16 }}>Vel kven du er</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {synlege.map((u) => (
                  <button key={u.id} className="mk-rad" onClick={() => pickUser(u.id)} style={radBtn}>
                    <div style={{ flex: 'none', width: 42, height: 42, background: u.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: tekstPaFarge(u.farge) }}>
                      {u.init}
                    </div>
                    <div style={{ lineHeight: 1.25, textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--mekk-ink)', letterSpacing: '-0.01em' }}>{u.navn}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--mekk-text-muted)' }}>{u.rolle}</div>
                    </div>
                    <span className="mk-chev" style={{ marginLeft: 'auto' }}>‹</span>
                  </button>
                ))}
              </div>
              {synlege.length === 0 && (
                <div style={{ marginTop: 16, padding: '10px 13px', background: 'var(--mekk-surface-alt)', fontSize: 12, color: 'var(--mekk-text-muted)', lineHeight: 1.4, textAlign: 'center' }}>
                  Ingen tilsette i denne butikken enno.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const kort: CSSProperties = { width: '100%', maxWidth: 440, padding: '26px 26px 30px', background: '#ffffff', color: 'var(--mekk-ink)', borderTop: '4px solid var(--mekk-lime)' };
const tittel: CSSProperties = { fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em', textTransform: 'uppercase', color: 'var(--mekk-ink)', textAlign: 'center' };
const backBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mekk-ink)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, marginBottom: 14, padding: 0 };
const radBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 13, padding: '11px 14px', border: '1px solid var(--mekk-line)', background: '#ffffff', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' };
const padKey: CSSProperties = { height: 56, border: '1px solid var(--mekk-line)', background: 'var(--mekk-surface-alt)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 900, color: 'var(--mekk-ink)' };
