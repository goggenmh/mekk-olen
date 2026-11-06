import { useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from '../../lib/toast';
import { MODULAR } from '../../lib/view';

// Eigar-/utviklar-side: kryss-butikk styring. Berre konsern-admin (gated i App +
// i databasen via admin_*-funksjonane). Steg 1: oversikt, butikkar og
// tilgangsstyring. (Modular per butikk + globale innstillingar kjem seinare.)
interface Oversikt { butikkar: number; butikkar_aktive: number; tilsette: number; tilsette_aktive: number; leiarar: number }
interface Butikk { id: string; namn: string; farge: string | null; aktiv: boolean; moduler: string[] | null }
interface AdminTilsett { id: string; navn: string; rolle: string; butikk_id: string | null; butikk: string | null; leder: boolean; konsern_admin: boolean; aktiv: boolean }
interface Innsikt { butikk_id: string; butikk: string; aktiv: boolean; tilsette: number; bestillingar: number; utleige: number }

const kort: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-card)' };

export function Utviklar() {
  const [oversikt, setOversikt] = useState<Oversikt | null>(null);
  const [butikkar, setButikkar] = useState<Butikk[]>([]);
  const [tilsette, setTilsette] = useState<AdminTilsett[]>([]);
  const [innsikt, setInnsikt] = useState<Innsikt[]>([]);
  const [feil, setFeil] = useState<string | null>(null);
  const [lastar, setLastar] = useState(true);
  const [nyButikk, setNyButikk] = useState('');

  const last = async () => {
    const [o, b, t, i] = await Promise.all([
      supabase.rpc('admin_oversikt'),
      supabase.from('butikkar').select('id, namn, farge, aktiv, moduler').order('namn'),
      supabase.rpc('admin_tilsette'),
      supabase.rpc('admin_butikk_innsikt'),
    ]);
    const err = o.error || b.error || t.error || i.error;
    if (err) { setFeil(err.message); setLastar(false); return; }
    setOversikt(((o.data as Oversikt[]) ?? [])[0] ?? null);
    setButikkar((b.data ?? []) as Butikk[]);
    setTilsette((t.data ?? []) as AdminTilsett[]);
    setInnsikt((i.data ?? []) as Innsikt[]);
    setFeil(null);
    setLastar(false);
  };
  useEffect(() => { void last(); }, []);

  const opprettButikk = async () => {
    const namn = nyButikk.trim();
    if (!namn) return;
    const { error } = await supabase.from('butikkar').insert({ namn });
    if (error) { toast(`Kunne ikkje opprette butikk: ${error.message}`); return; }
    setNyButikk(''); toast('Butikk oppretta'); void last();
  };
  const toggleAktiv = async (bu: Butikk) => {
    const { error } = await supabase.from('butikkar').update({ aktiv: !bu.aktiv }).eq('id', bu.id);
    if (error) { toast(`Kunne ikkje endre: ${error.message}`); return; }
    void last();
  };
  const settRolle = async (a: AdminTilsett, leder: boolean, konsern: boolean) => {
    const { error } = await supabase.rpc('admin_sett_rolle', { p_id: a.id, p_leder: leder, p_konsern: konsern });
    if (error) { toast(error.message); return; }
    void last();
  };
  const flytt = async (a: AdminTilsett, butikkId: string) => {
    const { error } = await supabase.rpc('admin_flytt_butikk', { p_id: a.id, p_butikk: butikkId || null });
    if (error) { toast(error.message); return; }
    toast('Flytta'); void last();
  };
  // null-liste = alle modular på. Slår vi av éin, skriv vi ned heile lista.
  const modulPa = (bu: Butikk, key: string) => !bu.moduler || bu.moduler.includes(key);
  const settModul = async (bu: Butikk, key: string, paa: boolean) => {
    const alle = MODULAR.map((m) => m.key as string);
    const naa = bu.moduler ?? alle;
    const neste = paa ? [...new Set([...naa, key])] : naa.filter((k) => k !== key);
    const { error } = await supabase.from('butikkar').update({ moduler: neste }).eq('id', bu.id);
    if (error) { toast(`Kunne ikkje lagre: ${error.message}`); return; }
    void last();
  };
  const endreNamn = async (bu: Butikk) => {
    const namn = window.prompt('Nytt namn på butikken:', bu.namn)?.trim();
    if (!namn || namn === bu.namn) return;
    const { error } = await supabase.from('butikkar').update({ namn }).eq('id', bu.id);
    if (error) { toast(`Kunne ikkje endre: ${error.message}`); return; }
    toast('Namn endra'); void last();
  };
  const tilsetteI = (buId: string) => tilsette.filter((a) => a.butikk_id === buId && a.aktiv).length;
  const settFarge = async (bu: Butikk, farge: string) => {
    const { error } = await supabase.from('butikkar').update({ farge }).eq('id', bu.id);
    if (error) { toast(`Kunne ikkje endre farge: ${error.message}`); return; }
    void last();
  };

  const statar: { tal: number; lab: string }[] = oversikt ? [
    { tal: oversikt.butikkar, lab: 'Butikkar' },
    { tal: oversikt.butikkar_aktive, lab: 'Aktive butikkar' },
    { tal: oversikt.tilsette_aktive, lab: 'Aktive tilsette' },
    { tal: oversikt.leiarar, lab: 'Leiarar' },
  ] : [];

  return (
    <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1000 }}>
      <div>
        <h1 className="sidetittel">Utviklar</h1>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Eigarstyring på tvers av butikkar. Berre du (konsern-admin) ser denne sida.</div>
      </div>

      {lastar ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lastar…</div>
      ) : feil ? (
        <div style={{ ...kort, padding: '14px 16px', color: 'var(--danger)', fontSize: 13.5 }}>Kunne ikkje laste: {feil}</div>
      ) : (
        <>
          {/* Oversikt */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            {statar.map((s) => (
              <div key={s.lab} style={{ ...kort, padding: '16px 18px' }}>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Geist Mono Variable'", letterSpacing: '-0.5px' }}>{s.tal}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 3 }}>{s.lab}</div>
              </div>
            ))}
          </div>

          {/* Butikkar */}
          <div style={{ ...kort, padding: '18px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Butikkar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              {butikkar.map((bu) => (
                <div key={bu.id} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input type="color" value={bu.farge || '#11788a'} onChange={(e) => settFarge(bu, e.target.value)} title="Butikk-farge" aria-label={`Farge for ${bu.namn}`} style={{ width: 24, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: '50%', background: 'none', cursor: 'pointer', flex: 'none' }} />
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{bu.namn}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{tilsetteI(bu.id)} tilsette</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: bu.aktiv ? 'var(--pill-gronn-fg)' : 'var(--text-faint)' }}>{bu.aktiv ? '● Aktiv' : '○ Inaktiv'}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button onClick={() => endreNamn(bu)} title="Endre namn" style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>✏ Namn</button>
                      <button onClick={() => toggleAktiv(bu)} style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {bu.aktiv ? 'Deaktiver' : 'Aktiver'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Modular (sider butikken har)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {MODULAR.map((m) => {
                        const paa = modulPa(bu, m.key);
                        return (
                          <label key={m.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: paa ? 'var(--pill-teal-bg)' : 'var(--surface)', color: paa ? 'var(--pill-teal-fg)' : 'var(--text-muted)' }}>
                            <input type="checkbox" checked={paa} onChange={(e) => settModul(bu, m.key, e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                            {m.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {butikkar.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingen butikkar enno.</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={nyButikk}
                onChange={(e) => setNyButikk(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') opprettButikk(); }}
                placeholder="Namn på ny butikk, t.d. «MEKK Haugesund»"
                style={{ flex: 1, minWidth: 0, padding: '9px 12px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text)' }}
              />
              <button onClick={opprettButikk} disabled={!nyButikk.trim()} style={{ flex: 'none', padding: '9px 16px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: nyButikk.trim() ? 1 : 0.5 }}>
                + Ny butikk
              </button>
            </div>
          </div>

          {/* Tilgangsstyring */}
          <div style={{ ...kort, padding: '18px 20px', overflow: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Tilgangsstyring</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>Set rolle og butikk for kvar tilsett, på tvers av butikkar.</div>
            <div style={{ minWidth: 640 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.7fr 0.9fr 0.6fr', gap: 10, padding: '0 6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--divider)' }}>
                <span>Tilsett</span><span>Butikk</span><span>Leiar</span><span>Konsern-admin</span><span>Aktiv</span>
              </div>
              {tilsette.map((a) => (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.7fr 0.9fr 0.6fr', gap: 10, alignItems: 'center', padding: '10px 6px', borderBottom: '1px solid var(--divider)', fontSize: 13.5, opacity: a.aktiv ? 1 : 0.55 }}>
                  <span style={{ fontWeight: 600 }}>{a.navn}<div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{a.rolle}</div></span>
                  <select value={a.butikk_id ?? ''} onChange={(e) => flytt(a, e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--r)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)' }}>
                    <option value="">(ingen butikk)</option>
                    {butikkar.map((bu) => <option key={bu.id} value={bu.id}>{bu.namn}</option>)}
                  </select>
                  <input type="checkbox" checked={a.leder} onChange={(e) => settRolle(a, e.target.checked, a.konsern_admin)} style={{ width: 18, height: 18, cursor: 'pointer' }} aria-label={`Leiar: ${a.navn}`} />
                  <input type="checkbox" checked={a.konsern_admin} onChange={(e) => settRolle(a, a.leder, e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} aria-label={`Konsern-admin: ${a.navn}`} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: a.aktiv ? 'var(--pill-gronn-fg)' : 'var(--text-faint)' }}>{a.aktiv ? 'Ja' : 'Nei'}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              Oppretting og deaktivering av tilsette gjer du under <b>Tilsette</b> (per butikk). Her styrer du roller og butikk-tilhøyr på tvers.
            </div>
          </div>

          {/* Innsikt på tvers */}
          <div style={{ ...kort, padding: '18px 20px', overflow: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Innsikt på tvers</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>Nøkkeltal per butikk, side om side.</div>
            <div style={{ minWidth: 520 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.9fr 1fr 1fr', gap: 10, padding: '0 6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--divider)' }}>
                <span>Butikk</span><span>Tilsette</span><span>Aktive bestillingar</span><span>Aktiv utleige</span>
              </div>
              {innsikt.map((r) => (
                <div key={r.butikk_id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.9fr 1fr 1fr', gap: 10, alignItems: 'center', padding: '11px 6px', borderBottom: '1px solid var(--divider)', fontSize: 13.5, opacity: r.aktiv ? 1 : 0.55 }}>
                  <span style={{ fontWeight: 600 }}>{r.butikk}{!r.aktiv && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 400 }}> · inaktiv</span>}</span>
                  <span style={{ fontFamily: "'Geist Mono Variable'", fontWeight: 700 }}>{r.tilsette}</span>
                  <span style={{ fontFamily: "'Geist Mono Variable'", fontWeight: 700 }}>{r.bestillingar}</span>
                  <span style={{ fontFamily: "'Geist Mono Variable'", fontWeight: 700 }}>{r.utleige}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
            Modular per butikk styrer kva sider butikken har (kjernesider som oversikt er alltid på, og du som eigar ser alltid alt).
          </div>
        </>
      )}
    </div>
  );
}
