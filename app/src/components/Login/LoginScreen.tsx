import type { CSSProperties } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function LoginScreen() {
  const { pick, pin, feil, pickUser, back, pressDigit, backspace } = useAuth();
  const { ansatte } = useAnsatte();

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background:
          'radial-gradient(1100px 520px at 50% -10%, rgba(43,182,201,0.22), transparent 60%),' +
          'radial-gradient(700px 500px at 85% 110%, rgba(198,126,30,0.14), transparent 55%),' +
          'linear-gradient(165deg,#0a1f30 0%,#0e2c42 55%,#0b2334 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
        <div style={{ padding: '30px 30px 22px', textAlign: 'center' }}>
          <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 56, height: 56, borderRadius: 14, display: 'block', margin: '0 auto 13px', boxShadow: '0 6px 18px rgba(12,90,105,0.28)' }} />
          <div style={{ fontFamily: "'Geist'", fontWeight: 800, fontSize: 20, letterSpacing: '0.5px', color: 'var(--text)' }}>MEKK ØLEN</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: 3 }}>
            Vakt &amp; timestyring
          </div>
        </div>

        {pick ? (
          <div style={{ padding: '2px 24px 28px' }}>
            <button onClick={back} style={backBtn}>‹ Byt brukar</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: pick.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', boxShadow: '0 8px 22px rgba(0,0,0,0.18)' }}>
                {pick.init}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{pick.navn}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Tast inn PIN-koden din</div>
              </div>
              <div style={{ display: 'flex', gap: 15, margin: '8px 0 2px' }}>
                {[0, 1, 2, 3].map((i) => {
                  const fylt = i < pin.length;
                  return (
                    <span
                      key={i}
                      style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${fylt ? 'var(--brand)' : '#d6dfe4'}`, background: fylt ? 'var(--brand)' : 'transparent', transition: 'all 0.12s ease' }}
                    />
                  );
                })}
              </div>
              {feil && (
                <div style={{ textAlign: 'center', maxWidth: 300 }}>
                  <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Feil PIN — prøv igjen</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, wordBreak: 'break-word' }}>({feil})</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,70px)', gap: 12, marginTop: 8 }}>
                {PAD_KEYS.map((k) => (
                  <button key={k} className="pinkey" onClick={() => pressDigit(k)} style={padKey}>{k}</button>
                ))}
                <div />
                <button className="pinkey" onClick={() => pressDigit('0')} style={padKey}>0</button>
                <button onClick={backspace} style={{ ...padKey, background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 19, fontFamily: "'Geist'" }}>⌫</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2px 24px 26px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', margin: '4px 0 16px' }}>Vel kven du er</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ansatte.map((u) => (
                <button key={u.id} onClick={() => pickUser(u.id)} className="hoverable" style={rowBtn}>
                  <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: u.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    {u.init}
                  </div>
                  <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{u.navn}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.rolle}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-faint2)', fontSize: 18 }}>›</span>
                </button>
              ))}
            </div>
            {ansatte.length === 0 && (
              <div style={{ marginTop: 16, padding: '10px 13px', background: 'var(--surface-soft)', borderRadius: 12, fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, textAlign: 'center' }}>
                Ingen ansatte funne. Sjekk Supabase-oppsettet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const backBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, marginBottom: 8 };
const rowBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 13, padding: '11px 13px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 12, cursor: 'pointer', textAlign: 'left' };
const padKey: CSSProperties = { height: 60, border: '1px solid var(--border)', background: 'var(--surface-alt)', borderRadius: 14, cursor: 'pointer', fontFamily: "'Geist Mono'", fontSize: 22, fontWeight: 600, color: 'var(--text)' };
