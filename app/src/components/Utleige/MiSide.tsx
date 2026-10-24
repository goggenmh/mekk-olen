import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '../../supabaseClient';
import { DEMO } from '../../lib/view';
import { lastNedUtleigeKontraktPdf } from '../../lib/utleigeKontraktPdf';
import { RES_STATUS, kr, nr, tidKort, feilTekst, type ResStatus,
  type UtleigeReservasjon, type UtleigeProdukt, type UtleigeEining, type UtleigeKunde, type UtleigeInnstillingar } from '../../lib/utleige';

// «Mi side» for utleigekundar: innlogging med eingongskode på e-post (Supabase
// Auth), og oversikt over eigne reservasjonar. Ligg på /utleige/mi-side, utanfor
// tilsett-innlogginga. Data kjem frå den trygge funksjonen utleige_mine_leige().

interface MineLeige {
  id: string; nummer: number; status: ResStatus; start: string; slutt: string;
  pris_leige: number; gebyr: number; depositum: number; pris_total: number;
  produkt_namn: string; produkt_tilbehor: string[]; eining_kode: string | null;
  butikk: string; vilkar: string; kontakt_telefon: string; kontakt_epost: string;
  avbestillingsfrist_timar: number;
  maks_dagar: number; forleng_til: string | null;
  kunde_namn: string; kunde_telefon: string; kunde_epost: string;
}

const KAN_AVBESTILLE: ResStatus[] = ['ny', 'stadfesta', 'klar'];
const KAN_FORLENGE: ResStatus[] = ['stadfesta', 'klar', 'utleigd', 'forseinka'];

const kort: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-card)' };
const label: CSSProperties = { fontSize: 11.5, fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--kort-label)', marginBottom: 6, display: 'block' };
const felt: CSSProperties = { width: '100%', padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-input)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 15 };
const cta: CSSProperties = { padding: '12px 18px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 900, cursor: 'pointer' };
const sekundaer: CSSProperties = { padding: '8px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' };

export function MiSide({ naviger }: { naviger: (sti: string) => void }) {
  const [klar, setKlar] = useState(false);
  const [innlogga, setInnlogga] = useState(false);
  const [leige, setLeige] = useState<MineLeige[] | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [bekreft, setBekreft] = useState<string | null>(null);
  const [jobbar, setJobbar] = useState<string | null>(null);
  const [kortFeil, setKortFeil] = useState<{ id: string; tekst: string } | null>(null);
  const [no] = useState(() => Date.now());
  const [forlengFor, setForlengFor] = useState<string | null>(null);
  const [forlengDato, setForlengDato] = useState('');

  const hentLeige = useCallback(async () => {
    const { data, error } = await supabase.rpc('utleige_mine_leige');
    if (error) { setFeil(feilTekst(error)); return; }
    setLeige((data as MineLeige[]) ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) { setInnlogga(true); await hentLeige(); }
      setKlar(true);
    });
  }, [hentLeige]);

  const loggUt = async () => {
    await supabase.auth.signOut().catch(() => {});
    setInnlogga(false); setLeige(null); setFeil(null);
  };

  const lastNedKontrakt = (r: MineLeige) => lastNedUtleigeKontraktPdf({
    reservasjon: { nummer: r.nummer, start: r.start, slutt: r.slutt, pris_leige: r.pris_leige, gebyr: r.gebyr, depositum: r.depositum, pris_total: r.pris_total } as UtleigeReservasjon,
    produkt: { namn: r.produkt_namn, tilbehor: r.produkt_tilbehor ?? [] } as UtleigeProdukt,
    eining: r.eining_kode ? ({ kode: r.eining_kode } as UtleigeEining) : undefined,
    kunde: { namn: r.kunde_namn, telefon: r.kunde_telefon, epost: r.kunde_epost } as UtleigeKunde,
    innstillingar: { vilkar: r.vilkar, kontakt_telefon: r.kontakt_telefon, kontakt_epost: r.kontakt_epost } as UtleigeInnstillingar,
    butikk: r.butikk,
  });

  // Kunden kan avbestille sjølv fram til avbestillingsfristen før henting.
  // Serveren handhevar regelen uansett; dette styrer berre kva knappen viser.
  const kanAvbestille = (r: MineLeige) =>
    KAN_AVBESTILLE.includes(r.status) && no < new Date(r.start).getTime() - r.avbestillingsfrist_timar * 3600e3;

  const avbestill = async (r: MineLeige) => {
    setJobbar(r.id); setKortFeil(null);
    const { error } = await supabase.rpc('utleige_kunde_avbestill', { p_res: r.id });
    setJobbar(null); setBekreft(null);
    if (error) { setKortFeil({ id: r.id, tekst: feilTekst(error) }); return; }
    await hentLeige();
  };

  // «ÅÅÅÅ-MM-DD» i lokal tid, og tidlegaste nye returdato (dagen etter noverande).
  const datoDel = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const minForleng = (r: MineLeige) => datoDel(new Date(new Date(r.slutt).getTime() + 864e5).toISOString());

  const sendForleng = async (r: MineLeige) => {
    if (!forlengDato) return;
    setJobbar(r.id); setKortFeil(null);
    const slutt = new Date(r.slutt);
    const [y, m, d] = forlengDato.split('-').map(Number);
    slutt.setFullYear(y, m - 1, d);
    const { error } = await supabase.rpc('utleige_kunde_forleng', { p_res: r.id, p_til: slutt.toISOString() });
    setJobbar(null);
    if (error) { setKortFeil({ id: r.id, tekst: feilTekst(error) }); return; }
    setForlengFor(null); setForlengDato('');
    await hentLeige();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ background: 'var(--mekk-navy)', color: '#ffffff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/mekk-logo.png" alt="MEKK" style={{ width: 38, height: 38 }} />
          <div style={{ lineHeight: 1.1, flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>Mi side</div>
            <div style={{ fontSize: 12.5, color: '#b9cbd8', fontWeight: 700 }}>Utleige – dine reservasjonar</div>
          </div>
          {innlogga && <button onClick={loggUt} style={{ background: 'none', border: '1px solid #ffffff55', color: '#fff', borderRadius: 'var(--r)', padding: '7px 12px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Logg ut</button>}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '22px 16px 60px' }}>
        <button onClick={() => naviger('/utleige')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--text)', padding: 0, marginBottom: 16 }}>
          <span style={{ color: 'var(--mekk-teal-700)', fontWeight: 900 }}>‹</span> Til utleige
        </button>

        {!klar ? (
          <div style={{ color: 'var(--text-muted)' }}>Lastar …</div>
        ) : !innlogga ? (
          <Innlogging onInn={async () => { setInnlogga(true); await hentLeige(); }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Reservasjonane dine</h1>
            {feil && <Boks tone="feil">{feil}</Boks>}
            {leige && leige.length === 0 && <Boks>Vi fann ingen reservasjonar på denne e-posten. Har du brukt ei anna adresse hos butikken, kan du logge ut og prøve den.</Boks>}
            {(leige ?? []).map((r) => {
              const s = RES_STATUS[r.status];
              return (
                <div key={r.id} style={{ ...kort, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, flex: 1, minWidth: 0 }}>{r.produkt_namn}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 999, color: s.fg, background: s.bg }}>{s.tekst}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Referanse</span><strong>{nr(r)}{r.eining_kode ? ` · ${r.eining_kode}` : ''}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>Henting</span><span>{tidKort(r.start)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Retur</span><span>{tidKort(r.slutt)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Å betale</span><span><strong>{kr(r.pris_total)}</strong>{r.depositum > 0 && <span style={{ color: 'var(--text-muted)' }}> · depositum {kr(r.depositum)}</span>}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => lastNedKontrakt(r)} style={sekundaer}>Last ned leigekontrakt (PDF)</button>
                    {kanAvbestille(r) && bekreft !== r.id && (
                      <button onClick={() => { setBekreft(r.id); setKortFeil(null); }} style={{ ...sekundaer, color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>Avbestill</button>
                    )}
                    {KAN_FORLENGE.includes(r.status) && !r.forleng_til && forlengFor !== r.id && (
                      <button onClick={() => { setForlengFor(r.id); setForlengDato(minForleng(r)); setKortFeil(null); }} style={sekundaer}>Be om forlenging</button>
                    )}
                  </div>
                  {bekreft === r.id && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5 }}>
                      <span>Avbestille {nr(r)}?</span>
                      <button disabled={jobbar === r.id} onClick={() => avbestill(r)} style={{ padding: '7px 12px', borderRadius: 'var(--r)', border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{jobbar === r.id ? 'Avbestiller …' : 'Ja, avbestill'}</button>
                      <button onClick={() => setBekreft(null)} style={{ padding: '7px 12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Avbryt</button>
                    </div>
                  )}
                  {forlengFor === r.id && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5 }}>
                      <span>Ny returdato:</span>
                      <input type="date" value={forlengDato} min={minForleng(r)} onChange={(e) => setForlengDato(e.target.value)} style={{ ...felt, width: 'auto', padding: '8px 10px', fontSize: 14 }} />
                      <button disabled={jobbar === r.id || !forlengDato} onClick={() => sendForleng(r)} style={{ ...cta, padding: '8px 14px', fontSize: 14 }}>{jobbar === r.id ? 'Sender …' : 'Send førespurnad'}</button>
                      <button onClick={() => { setForlengFor(null); setForlengDato(''); }} style={sekundaer}>Avbryt</button>
                    </div>
                  )}
                  {r.forleng_til && (
                    <Boks>Du har bedt om forlenging til {tidKort(r.forleng_til)}. Butikken må godkjenne før det gjeld.</Boks>
                  )}
                  {KAN_AVBESTILLE.includes(r.status) && !kanAvbestille(r) && (
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>For nær hentetida til å avbestille sjølv – ta kontakt med butikken{r.kontakt_telefon ? ` (tlf. ${r.kontakt_telefon})` : ''}.</div>
                  )}
                  {kortFeil?.id === r.id && <Boks tone="feil">{kortFeil.tekst}</Boks>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Innlogging({ onInn }: { onInn: () => void }) {
  const [steg, setSteg] = useState<'epost' | 'kode'>('epost');
  const [epost, setEpost] = useState(DEMO ? 'per@demo.local' : '');
  const [kode, setKode] = useState('');
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  const gyldigEpost = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(epost.trim());

  const sendKode = async () => {
    if (!gyldigEpost || sender) return;
    setSender(true); setFeil(null);
    const { error } = await supabase.auth.signInWithOtp({ email: epost.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setSender(false);
    if (error) { setFeil(feilTekst(error)); return; }
    setSteg('kode');
  };

  const verifiser = async () => {
    if (kode.trim().length < 6 || sender) return;
    setSender(true); setFeil(null);
    const { error } = await supabase.auth.verifyOtp({ email: epost.trim().toLowerCase(), token: kode.trim(), type: 'email' });
    setSender(false);
    if (error) { setFeil('Feil eller utgått kode. Prøv igjen.'); return; }
    onInn();
  };

  return (
    <div style={{ ...kort, maxWidth: 440, margin: '0 auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 4px' }}>Logg inn</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
          {steg === 'epost' ? 'Skriv e-posten du brukte då du sende førespurnaden, så sender vi deg ein eingongskode.' : `Vi sende ein kode til ${epost}. Skriv han inn under.`}
        </p>
      </div>

      {steg === 'epost' ? (
        <>
          <label><span style={label}>E-post</span><input type="email" value={epost} autoComplete="email" onChange={(e) => setEpost(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendKode()} style={felt} /></label>
          {feil && <Boks tone="feil">{feil}</Boks>}
          <button onClick={sendKode} disabled={!gyldigEpost || sender} style={{ ...cta, opacity: gyldigEpost && !sender ? 1 : 0.5, cursor: gyldigEpost && !sender ? 'pointer' : 'not-allowed' }}>
            {sender ? 'Sender …' : 'Send kode'}
          </button>
        </>
      ) : (
        <>
          <label><span style={label}>Eingongskode</span><input inputMode="numeric" autoComplete="one-time-code" value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && verifiser()} style={{ ...felt, letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }} /></label>
          {feil && <Boks tone="feil">{feil}</Boks>}
          <button onClick={verifiser} disabled={kode.length < 6 || sender} style={{ ...cta, opacity: kode.length >= 6 && !sender ? 1 : 0.5, cursor: kode.length >= 6 && !sender ? 'pointer' : 'not-allowed' }}>
            {sender ? 'Loggar inn …' : 'Logg inn'}
          </button>
          <button onClick={() => { setSteg('epost'); setKode(''); setFeil(null); }} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', padding: 0 }}>Byt e-post</button>
        </>
      )}
      {DEMO && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', borderTop: '1px solid var(--divider)', paddingTop: 10 }}>Demo: bruk <strong>per@demo.local</strong> og kva som helst 6-sifra kode.</div>}
    </div>
  );
}

function Boks({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'feil' }) {
  const s = tone === 'feil' ? { fg: 'var(--pill-raud-fg)', bg: 'var(--pill-raud-bg)' } : { fg: 'var(--text-secondary)', bg: 'var(--surface-alt)' };
  return <div style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: s.bg, color: s.fg, fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{children}</div>;
}
