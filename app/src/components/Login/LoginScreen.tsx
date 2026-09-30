import { useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { pad, fullDatoTekst, today } from '../../lib/dates';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function LoginScreen() {
  const { pick, pin, feil, pickUser, back, pressDigit, backspace } = useAuth();
  const { ansatte, butikkar, finnButikk, loading } = useAnsatte();

  // Butikk-val + eige admin-modus (konsern-admin er ikkje del av nokon butikk).
  const [valdButikk, setValdButikk] = useState<string | null>(null);
  const [adminModus, setAdminModus] = useState(false);
  const konsernLeiarar = ansatte.filter((a) => a.konsern_admin && !a.butikk_id);
  const effektivButikk = valdButikk ?? (butikkar.length === 1 ? butikkar[0].id : null);
  const maaVeljeButikk = butikkar.length > 1 && !valdButikk && !adminModus;
  const synlege = adminModus
    ? konsernLeiarar
    : effektivButikk ? ansatte.filter((a) => a.butikk_id === effektivButikk) : ansatte;
  const merke = adminModus ? 'MEKK ADMIN' : (finnButikk(effektivButikk ?? undefined)?.namn?.toUpperCase() || 'MEKK');
  const visAdminKnapp = !pick && !loading && !adminModus && konsernLeiarar.length > 0;

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
        position: 'relative',
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        padding: 'clamp(28px, 6vh, 60px) 24px 48px', gap: 6,
        background: 'var(--login-bg)', color: 'var(--login-text)',
      }}
    >
      {visAdminKnapp && (
        <button
          onClick={() => { setAdminModus(true); setValdButikk(null); }}
          title="Konsern-admin"
          style={{
            position: 'absolute', top: 'clamp(18px, 4vh, 32px)', right: 'clamp(18px, 4vw, 34px)',
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 12,
            border: '1px solid var(--login-surface-border)', background: 'var(--login-surface)',
            color: 'var(--login-sub)', fontFamily: "'Geist'", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--login-accent)' }} />
          Admin
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <img src="/assets/mekk-logo.png" alt="MEKK" style={{ width: 38, height: 38, borderRadius: 11 }} />
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.6px', color: 'var(--login-text)' }}>{merke}</span>
      </div>

      <div style={{ fontFamily: "'Geist Mono'", fontWeight: 700, fontSize: 'clamp(54px, 10vw, 78px)', color: 'var(--login-text)', letterSpacing: '-1px', lineHeight: 1 }}>
        {pad(now.getHours())}:{pad(now.getMinutes())}<span style={{ color: 'var(--login-accent-2)' }}>:{pad(now.getSeconds())}</span>
      </div>
      <div style={{ fontSize: 16, color: 'var(--login-sub)', fontWeight: 500, marginTop: 12, letterSpacing: '0.3px' }}>{dateStr}</div>

      <div style={{ ...glass, marginTop: 'clamp(28px, 5vh, 48px)' }}>
        {pick ? (
          <>
            <button onClick={back} style={backBtn}>‹ Byt brukar</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 58, height: 58, borderRadius: 17, background: pick.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                {pick.init}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--login-text)' }}>Hei, {pick.navn.split(' ')[0]}</div>
              <div style={{ fontSize: 12.5, color: 'var(--login-sub)', marginTop: 3, marginBottom: 20 }}>Tast PIN på tastaturet eller under</div>

              <div className={feil ? 'login-shake' : undefined} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                {[0, 1, 2, 3].map((i) => {
                  const fylt = i < pin.length;
                  const aktiv = i === pin.length;
                  return (
                    <div
                      key={i}
                      style={{
                        width: 48, height: 56, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Geist Mono'", fontSize: 24, fontWeight: 700, color: 'var(--login-text)',
                        border: `1.5px solid ${fylt || aktiv ? 'var(--login-accent)' : 'var(--login-surface-border)'}`,
                        background: 'var(--login-pin-bg)',
                        boxShadow: aktiv ? '0 0 0 3px var(--ring)' : 'none',
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
                  <div style={{ fontSize: 13, color: 'var(--login-error)', fontWeight: 600 }}>{feil}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--login-faint)', margin: '8px 0 16px' }}>0–9 for å taste · ⌫ for å slette</div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,72px)', gap: 11 }}>
                {PAD_KEYS.map((k) => (
                  <button key={k} className="glasskey" onClick={() => pressDigit(k)} style={padKey}>{k}</button>
                ))}
                <div />
                <button className="glasskey" onClick={() => pressDigit('0')} style={padKey}>0</button>
                <button className="glasskey" onClick={backspace} style={{ ...padKey, color: 'var(--login-sub)', fontSize: 17, fontFamily: "'Geist'" }}>⌫</button>
              </div>
            </div>
          </>
        ) : loading ? (
          <div style={{ padding: '30px 0 18px', textAlign: 'center' }}>
            <div className="loginspinner" />
            <div style={{ fontSize: 13, color: 'var(--login-sub)', marginTop: 14 }}>Lastar…</div>
          </div>
        ) : maaVeljeButikk ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--login-faint)', marginBottom: 16, textAlign: 'center' }}>Vel butikk</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {butikkar.map((b) => {
                const antal = ansatte.filter((a) => a.butikk_id === b.id).length;
                return (
                  <button key={b.id} className="glassrow" onClick={() => setValdButikk(b.id)} style={{ ...tileBtn, borderLeft: `3px solid ${b.farge}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--login-text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.namn}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--login-sub)', fontWeight: 500, marginTop: 2 }}>{antal} {antal === 1 ? 'tilsett' : 'tilsette'}</div>
                    </div>
                    <span style={{ color: 'var(--login-faint)', fontSize: 18, flex: 'none' }}>›</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {adminModus ? (
              <button onClick={() => setAdminModus(false)} style={backBtn}>‹ Tilbake</button>
            ) : butikkar.length > 1 ? (
              <button onClick={() => setValdButikk(null)} style={backBtn}>‹ Byt butikk</button>
            ) : null}
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--login-faint)', marginBottom: 18, textAlign: 'center' }}>{adminModus ? 'Vel konsern-admin' : 'Vel kven du er'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {synlege.map((u) => (
                <button key={u.id} className="glassrow" onClick={() => pickUser(u.id)} style={rowBtn}>
                  <div style={{ flex: 'none', width: 42, height: 42, borderRadius: 13, background: u.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    {u.init}
                  </div>
                  <div style={{ lineHeight: 1.25, textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--login-text)' }}>{u.navn}</div>
                    <div style={{ fontSize: 12, color: 'var(--login-sub)' }}>{u.rolle}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--login-faint)', fontSize: 18 }}>›</span>
                </button>
              ))}
            </div>
            {synlege.length === 0 && (
              <div style={{ marginTop: 16, padding: '10px 13px', background: 'var(--login-surface)', borderRadius: 12, fontSize: 11.5, color: 'var(--login-sub)', lineHeight: 1.4, textAlign: 'center' }}>
                {adminModus ? 'Ingen konsern-admin enno.' : 'Ingen tilsette i denne butikken enno.'}
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
  background: 'var(--login-card-bg)', border: '1px solid var(--login-card-border)',
  boxShadow: 'var(--login-card-shadow)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
};
const backBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--login-sub)', fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, marginBottom: 14 };
const rowBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', border: '1px solid var(--login-surface-border)', background: 'var(--login-surface)', borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s ease' };
const tileBtn: CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '14px 15px', border: '1px solid var(--login-surface-border)', background: 'var(--login-surface)', borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left' };
const padKey: CSSProperties = { height: 54, border: '1px solid var(--login-surface-border)', background: 'var(--login-surface)', borderRadius: 14, cursor: 'pointer', fontFamily: "'Geist Mono'", fontSize: 20, fontWeight: 600, color: 'var(--login-text)', transition: 'all 0.12s ease' };
