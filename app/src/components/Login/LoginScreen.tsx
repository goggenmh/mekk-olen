import { useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { pad, fullDatoTekst, today, weekdayIdx, mins } from '../../lib/dates';
import { DAGER_VAKTPLAN, type Employee } from '../../constants';
import { tekstPaFarge } from '../../lib/farge';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Innlogginga ser lik ut i lys og mørk modus: MEKK-marine,
// mjuk turkis/lime-glød og eit glaskort.
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

  // Dagens vaktstatus blir med vilje IKKJE henta her. Innloggings-skjermen er
  // open (før pålogging), så vaktlista ville då vore offentleg på internett.
  // Den står difor berre inne i appen; her degraderer visninga til opningstid.
  const [vakter] = useState<{ id: string; start: string; slutt: string }[] | null>(null);

  // «Sist brukt» på denne eininga – hjelper på ein delt terminal i butikken.
  const [sist] = useState<{ id: string; at: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(SIST_NOKKEL) || 'null'); } catch { return null; }
  });

  // «Velkomen, Georg» kjem etter rett PIN (sjå Velkomst i App).
  const vel = (u: Employee) => {
    try { localStorage.setItem(SIST_NOKKEL, JSON.stringify({ id: u.id, at: new Date().toISOString() })); } catch { /* privat modus */ }
    pickUser(u.id);
  };

  const [sok, setSok] = useState('');

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

  // Status ut frå vaktplanen og klokka: på vakt no / vakt seinare / ferdig / fri.
  const minNo = now.getHours() * 60 + now.getMinutes();
  const statusFor = (id: string) => {
    if (!vakter) return null;
    const mine = vakter.filter((v) => v.id === id);
    if (mine.some((v) => mins(v.start) <= minNo && minNo < mins(v.slutt))) return { tekst: 'På vakt no', farge: '#22c55e', fylt: true };
    const neste = mine.find((v) => mins(v.start) > minNo);
    if (neste) return { tekst: `Vakt ${neste.start}–${neste.slutt}`, farge: 'var(--mekk-teal)', fylt: true };
    if (mine.length) return { tekst: 'Ferdig for i dag', farge: FAINT, fylt: false };
    return { tekst: 'Fri i dag', farge: FAINT, fylt: false };
  };

  // Linja under klokka: opningstid før/etter, elles kven som er på vakt.
  const dagDef = DAGER_VAKTPLAN[weekdayIdx(today())];
  const [opnar, stengjer] = (dagDef?.open || '').split('–').map((x) => Number(x) * 60);
  const paVakt = synlege.filter((u) => statusFor(u.id)?.tekst === 'På vakt no').length;
  const kjemSeinare = synlege.filter((u) => statusFor(u.id)?.tekst.startsWith('Vakt')).length;
  const omTid = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} t ${pad(m % 60)} min` : `${m} min`);
  const dagsLinje = !dagDef ? 'Butikken er stengd i dag'
    : minNo < opnar ? `Butikken opnar om ${omTid(opnar - minNo)}`
    : minNo >= stengjer ? 'Butikken er stengd for i dag'
    : vakter ? [`${paVakt} på vakt no`, kjemSeinare ? `${kjemSeinare} kjem seinare` : ''].filter(Boolean).join(' · ')
    : `Ope til ${pad(stengjer / 60)}:00`;

  // Sist brukt øvst, og søk når lista blir lang.
  const sortert = [...synlege].sort((a, b) => Number(b.id === sist?.id) - Number(a.id === sist?.id));
  const filtrert = sok.trim() ? sortert.filter((u) => u.navn.toLowerCase().includes(sok.trim().toLowerCase())) : sortert;
  const sistTekst = (iso: string) => {
    const d = new Date(iso);
    const dag = d.toDateString() === now.toDateString() ? 'i dag' : d.toDateString() === new Date(now.getTime() - 864e5).toDateString() ? 'i går' : `${d.getDate()}.${d.getMonth() + 1}.`;
    return `Sist brukt her ${dag} kl. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: BAKGRUNN, color: '#ffffff', fontFamily: 'var(--font-sans)' }}>
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

        <div style={{ marginTop: 'clamp(22px, 4vh, 36px)', fontFamily: "'Geist Mono Variable'", fontWeight: 700, fontSize: 'clamp(54px, 10vw, 78px)', letterSpacing: '-1px', lineHeight: 1 }}>
          {pad(now.getHours())}:{pad(now.getMinutes())}<span style={{ color: 'var(--mekk-teal)' }}>:{pad(now.getSeconds())}</span>
        </div>
        <div style={{ fontSize: 16, color: SUB, fontWeight: 500, marginTop: 12, letterSpacing: '0.3px' }}>{dateStr}</div>
        <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: GLAS, border: '1px solid ' + GLAS_KANT, fontSize: 13.5, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dagDef && minNo >= opnar && minNo < stengjer ? '#22c55e' : FAINT }} />
          {dagsLinje}
        </div>

        <div style={{ ...kort, marginTop: 'clamp(26px, 5vh, 44px)' }}>
          {pick ? (
            <>
              <button onClick={back} style={backBtn}><span style={{ color: 'var(--mekk-teal)', fontWeight: 900 }}>‹</span> Byt brukar</button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: R, background: pick.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: tekstPaFarge(pick.farge), marginBottom: 12 }}>
                  {pick.init}
                </div>
                <div style={tittel}>Hei, {pick.navn.split(' ')[0]}</div>
                <div style={{ fontSize: 13, color: SUB, marginTop: 4, marginBottom: 20 }}>Tast PIN på tastaturet eller under</div>

                <div className={feil ? 'login-shake' : undefined} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  {[0, 1, 2, 3].map((i) => {
                    const fylt = i < pin.length;
                    const aktiv = i === pin.length;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 52, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28, fontWeight: 900,
                          borderRadius: R, color: fylt ? 'var(--mekk-ink)' : '#ffffff',
                          border: `2px solid ${aktiv ? 'var(--mekk-teal)' : fylt ? 'var(--mekk-lime)' : GLAS_KANT}`,
                          background: fylt ? 'var(--mekk-lime)' : GLAS,
                          boxShadow: aktiv ? '0 0 0 3px rgba(93, 203, 204, 0.3)' : 'none',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {fylt ? '•' : ''}
                      </div>
                    );
                  })}
                </div>

                {feil ? (
                  <div style={{ textAlign: 'center', maxWidth: 300, margin: '6px 0 14px', fontSize: 13, color: '#ff9b8f', fontWeight: 700 }}>{feil}</div>
                ) : (
                  <div style={{ fontSize: 12, color: FAINT, margin: '8px 0 16px' }}>0–9 for å taste · ⌫ for å slette</div>
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
              <div style={{ fontSize: 13, color: SUB, marginTop: 14 }}>Lastar…</div>
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
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.namn}</div>
                        <div style={{ fontSize: 12, color: SUB, marginTop: 2 }}>{antal} {antal === 1 ? 'tilsett' : 'tilsette'}</div>
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
                <button onClick={() => setValdButikk(null)} style={backBtn}><span style={{ color: 'var(--mekk-teal)', fontWeight: 900 }}>‹</span> Byt butikk</button>
              )}
              <div style={{ ...tittel, textTransform: 'none', marginBottom: 16 }}>Kven er du?</div>
              {synlege.length > 10 && (
                <input
                  value={sok}
                  onChange={(e) => setSok(e.target.value)}
                  placeholder="Søk etter brukar"
                  aria-label="Søk etter brukar"
                  style={{ width: '100%', marginBottom: 10, padding: '10px 13px', borderRadius: R, border: '1px solid ' + GLAS_KANT, background: GLAS, color: '#ffffff', fontFamily: 'var(--font-sans)', fontSize: 14 }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtrert.map((u) => {
                  const st = statusFor(u.id);
                  const erSist = u.id === sist?.id;
                  return (
                  <button key={u.id} className="mk-rad" onClick={() => vel(u)} style={radBtn}>
                    <div style={{ flex: 'none', width: 42, height: 42, borderRadius: R, background: u.farge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: tekstPaFarge(u.farge) }}>
                      {u.init}
                    </div>
                    <div style={{ lineHeight: 1.25, textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>{u.navn}</div>
                      <div style={{ fontSize: 12.5, color: SUB }}>{u.rolle}</div>
                      {st && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, fontWeight: 700, color: st.fylt ? '#ffffff' : SUB }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: st.fylt ? st.farge : 'transparent', border: st.fylt ? 'none' : `1.5px solid ${st.farge}` }} />
                          {st.tekst}
                        </div>
                      )}
                      {erSist && sist && <div style={{ fontSize: 11.5, color: FAINT, marginTop: 2 }}>{sistTekst(sist.at)}</div>}
                    </div>
                    {erSist && (
                      <span style={{ marginLeft: 'auto', flex: 'none', fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '3px 8px', borderRadius: 999, background: 'var(--mekk-lime)', color: 'var(--mekk-ink)' }}>Sist brukt</span>
                    )}
                    <span className="mk-chev" style={{ marginLeft: erSist ? 4 : 'auto' }}>‹</span>
                  </button>
                  );
                })}
              </div>
              {synlege.length === 0 && (
                <div style={{ marginTop: 16, padding: '10px 13px', background: GLAS, borderRadius: R, fontSize: 12, color: SUB, lineHeight: 1.4, textAlign: 'center' }}>
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

const SIST_NOKKEL = 'mekk-sist-brukt';

// Glas-flater frå den førre innlogginga, på MEKK-marine.
const R = 8;
const SUB = '#b9cbd8';
const FAINT = '#8fb0c2';
const GLAS = 'rgba(255, 255, 255, 0.06)';
const GLAS_KANT = 'rgba(255, 255, 255, 0.16)';
const BAKGRUNN = [
  'radial-gradient(900px 500px at 50% -8%, rgba(93, 203, 204, 0.22), transparent 60%)',
  'radial-gradient(700px 520px at 88% 112%, rgba(196, 226, 18, 0.10), transparent 55%)',
  'linear-gradient(165deg, #0a2335 0%, #0e2c42 55%, #0a2335 100%)',
].join(', ');

const kort: CSSProperties = {
  width: '100%', maxWidth: 440, padding: '26px 26px 30px', borderRadius: 14, color: '#ffffff',
  background: 'rgba(255, 255, 255, 0.07)', border: '1px solid ' + GLAS_KANT, borderTop: '3px solid var(--mekk-lime)',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
};
const tittel: CSSProperties = { fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em', textTransform: 'uppercase', color: '#ffffff', textAlign: 'center' };
const backBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: SUB, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, marginBottom: 14, padding: 0 };
const radBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 13, padding: '11px 14px', border: '1px solid ' + GLAS_KANT, background: GLAS, borderRadius: R, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' };
const padKey: CSSProperties = { height: 56, border: '1px solid ' + GLAS_KANT, background: GLAS, borderRadius: R, cursor: 'pointer', fontFamily: "'Geist Mono Variable'", fontSize: 21, fontWeight: 600, color: '#ffffff' };
