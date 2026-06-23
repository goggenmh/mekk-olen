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
        background: 'linear-gradient(160deg,#0c2436 0%,#103244 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', borderRadius: 22, boxShadow: '0 30px 70px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--divider)' }}>
          <img src="/assets/mekk-logo.png" alt="MEKK Ølen" style={{ width: 58, height: 58, borderRadius: 16, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontFamily: "'Geist'", fontWeight: 700, fontSize: 21, letterSpacing: '0.4px' }}>MEKK ØLEN</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2 }}>
            Vakt &amp; timestyring
          </div>
        </div>

        {pick ? (
          <div style={{ padding: '24px 28px 26px' }}>
            <button
              onClick={back}
              style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: "'Geist'", fontSize: 13, fontWeight: 600, marginBottom: 14 }}
            >
              ‹ Byt brukar
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: pick.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 700, color: '#fff' }}>
                {pick.init}
              </div>
              <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{pick.navn}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Tast inn PIN</div>
              </div>
              <div style={{ display: 'flex', gap: 13, margin: '6px 0 4px' }}>
                {[0, 1, 2, 3].map((i) => {
                  const fylt = i < pin.length;
                  return (
                    <span
                      key={i}
                      style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${fylt ? 'var(--brand)' : '#d6dfe4'}`, background: fylt ? 'var(--brand)' : 'transparent' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,64px)', gap: 11, marginTop: 6 }}>
                {PAD_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => pressDigit(k)}
                    style={{ height: 56, border: '1px solid var(--border)', background: 'var(--surface-alt)', borderRadius: 16, cursor: 'pointer', fontFamily: "'Geist Mono'", fontSize: 21, fontWeight: 600, color: 'var(--text)' }}
                  >
                    {k}
                  </button>
                ))}
                <div />
                <button
                  onClick={() => pressDigit('0')}
                  style={{ height: 56, border: '1px solid var(--border)', background: 'var(--surface-alt)', borderRadius: 16, cursor: 'pointer', fontFamily: "'Geist Mono'", fontSize: 21, fontWeight: 600, color: 'var(--text)' }}
                >
                  0
                </button>
                <button
                  onClick={backspace}
                  style={{ height: 56, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 16, cursor: 'pointer', fontSize: 19, color: 'var(--text-muted)' }}
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '22px 24px 26px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', marginBottom: 14 }}>Vel kven du er</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ansatte.map((u) => (
                <button
                  key={u.id}
                  onClick={() => pickUser(u.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 16, cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ flex: 'none', width: 42, height: 42, borderRadius: '50%', background: u.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    {u.init}
                  </div>
                  <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 600 }}>{u.navn}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.rolle}</div>
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
