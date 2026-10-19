import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAnsatte } from '../../context/AnsatteContext';
import { useAppData } from '../../context/AppDataContext';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { AdminPanel } from '../Admin/AdminPanel';
import { weekDates, mondayOf, today } from '../../lib/dates';
import { erLeiar, type View } from '../../lib/view';
import { alder } from '../../lib/bestilling';
import { ustadfesta } from '../../lib/dokument';
import { tal } from '../../lib/tekst';

interface Varsel {
  key: string;
  tekst: string;
  view: View;
}

interface SearchHit {
  key: string;
  tittel: string;
  sub: string;
  view: View;
  ikon: string;
}

export function Header({ setView, isMobile = false, onMenu }: { setView: (v: View) => void; isMobile?: boolean; onMenu?: () => void }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { isLeder, ansatte, findAnsatt } = useAnsatte();
  const { docs, tasks, swaps, entries, orders, stadfestingar } = useAppData();
  const [adminOpen, setAdminOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  // På mobil blir lista lagd under toppen i full breidd (sjå under), målt frå klokka.
  const klokkeRef = useRef<HTMLButtonElement>(null);
  const [listeTopp, setListeTopp] = useState(64);

  const varsler = useMemo<Varsel[]>(() => {
    const t = today();
    const weekDays = weekDates(mondayOf(t));
    const pendingSwaps = swaps.filter((s) => s.status === 'pending');
    const ventandeTimar = entries.filter((e) => weekDays.includes(e.date) && e.status === 'venter').length;
    const ufordelte = tasks.filter((x) => x.ansatt === 'ufordelt').length;
    const ankomne = orders.filter((o) => o.status === 'komen' && !o.varsla);
    const gamle = orders.filter((o) => alder(o, t).gammal).length;
    const ulesne = ustadfesta(docs, stadfestingar, user?.id);
    return [
      ...pendingSwaps.map((s) => ({ key: `swap-${s.id}`, tekst: `${findAnsatt(s.fra).navn} ønskjer å bytte vakt ${s.dag}`, view: 'vaktplan' as View })),
      ...(ventandeTimar > 0 ? [{ key: 'timar', tekst: `${tal(ventandeTimar, 'timeføring', 'timeføringar')} ventar på godkjenning`, view: 'timeliste' as View }] : []),
      ...ankomne.map((o) => ({ key: `order-${o.id}`, tekst: `Bestilling til ${o.kunde} har kome`, view: 'bestilling' as View })),
      ...(gamle > 0 ? [{ key: 'gamle', tekst: `${tal(gamle, 'bestilling', 'bestillingar')} har stått lenge – sjekk ${gamle === 1 ? 'henne' : 'dei'}`, view: 'bestilling' as View }] : []),
      ...(ulesne > 0 ? [{ key: 'hms', tekst: `${ulesne} HMS-dokument ventar på at du stadfestar at du har lese ${ulesne === 1 ? 'det' : 'dei'}`, view: 'dokument' as View }] : []),
      ...(ufordelte > 0 ? [{ key: 'oppgaver', tekst: tal(ufordelte, 'ufordelt oppgåve', 'ufordelte oppgåver'), view: 'oppgaver' as View }] : []),
    ].slice(0, 8);
  }, [swaps, entries, tasks, orders, docs, stadfestingar, user?.id, findAnsatt]);

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // Tilsett-sida er berre for leiarar, så berre dei får treff der.
    const fraAnsatte: SearchHit[] = !erLeiar(user) ? [] : ansatte
      .filter((a) => a.navn.toLowerCase().includes(q) || a.rolle.toLowerCase().includes(q))
      .map((a) => ({ key: `a-${a.id}`, tittel: a.navn, sub: a.rolle, view: 'ansatte' as View, ikon: 'user' }));
    const fraBestillingar: SearchHit[] = orders
      .filter((o) => [o.kunde, o.vare, o.varenr, o.telefon].some((f) => (f || '').toLowerCase().includes(q)))
      .map((o) => ({ key: `o-${o.id}`, tittel: o.kunde, sub: `Bestilling · ${o.vare}`, view: 'bestilling' as View, ikon: 'bestilling' }));
    const fraDoks: SearchHit[] = docs
      .filter((d) => d.tittel.toLowerCase().includes(q))
      .map((d) => ({ key: `d-${d.id}`, tittel: d.tittel, sub: d.kategori, view: 'dokument' as View, ikon: 'dokument' }));
    const fraOppgaver: SearchHit[] = tasks
      .filter((t) => t.tittel.toLowerCase().includes(q))
      .map((t) => ({ key: `t-${t.id}`, tittel: t.tittel, sub: 'Oppgåve', view: 'oppgaver' as View, ikon: 'oppgaver' }));
    return [...fraAnsatte, ...fraBestillingar, ...fraDoks, ...fraOppgaver].slice(0, 8);
  }, [query, ansatte, docs, tasks, orders, user]);

  if (!user) return null;

  return (
    <div
      className="no-print"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '9px 14px' : '10px 20px',
        background: 'var(--topbar-bg)', borderBottom: '1px solid var(--rail-border)', minHeight: isMobile ? 56 : 62,
      }}
    >
      {isMobile && (
        <button
          onClick={onMenu}
          title="Meny" aria-label="Opne meny"
          style={{
            width: 36, height: 36, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}
        >
          <Icon name="menu" size={20} />
        </button>
      )}
      <div style={{ position: 'relative', flex: 1, maxWidth: 380, display: isMobile ? 'none' : 'block' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk etter bestilling, dokument, oppgåve…"
          aria-label="Søk"
          style={{
            width: '100%', padding: '8px 13px', border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, fontFamily: "'Geist Variable'", fontSize: 13, color: 'var(--topbar-ctl-fg)',
          }}
        />
        {hits.length > 0 && (
          <div
            style={{
              position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 50,
            }}
          >
            {hits.map((h) => (
              <button
                key={h.key}
                onClick={() => { setView(h.view); setQuery(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: 'none',
                  cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--divider)',
                }}
              >
                <span style={{ display: 'flex', color: 'var(--text-muted)' }}><Icon name={h.ikon} size={16} /></span>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{h.tittel}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <button
            ref={klokkeRef}
            onClick={() => {
              const r = klokkeRef.current?.getBoundingClientRect();
              if (r) setListeTopp(Math.round(r.bottom + 8));
              setNotifOpen((o) => !o);
            }}
            title="Varsel" aria-label={`Varsel (${varsler.length})`} aria-expanded={notifOpen}
            style={{
              position: 'relative', width: 34, height: 34, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
              borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="bell" size={18} />
            {varsler.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: 'var(--accent)', color: 'var(--on-brand)', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--topbar-bg)' }}>
                {varsler.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{
                // Mobil: full breidd under toppen, så lista aldri går ut over skjermkanten.
                ...(isMobile
                  ? { position: 'fixed', top: listeTopp, left: 12, right: 12, maxHeight: `calc(100dvh - ${listeTopp + 90}px)` }
                  : { position: 'absolute', top: '130%', right: 0, width: 320, maxHeight: '70vh' }),
                overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                boxShadow: '0 12px 30px rgba(0,0,0,0.18)', zIndex: 50,
              }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--divider)', fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-label)' }}>Varsel</div>
                {varsler.length === 0 ? (
                  <div style={{ padding: '18px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Ingen nye varsel</div>
                ) : (
                  varsler.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => { setView(v.view); setNotifOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--divider)' }}
                    >
                      <span style={{ display: 'flex', color: 'var(--brand-strong)', flex: 'none' }}><Icon name="bell" size={15} /></span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{v.tekst}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        {isLeder(user.id) && (
          <button
            onClick={() => setAdminOpen(true)}
            title="Administrasjon" aria-label="Administrasjon"
            style={{
              width: 34, height: 34, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
              borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="innstillinger" size={18} />
          </button>
        )}
        <button
          onClick={toggle}
          title={dark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
          aria-label={dark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
          style={{
            width: 34, height: 34, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, cursor: 'pointer', color: 'var(--topbar-ctl-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={18} />
        </button>
        <Avatar init={user.init} farge={user.farge} size={32} fontSize={12} />
        {!isMobile && (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--topbar-name)' }}>{user.navn}</div>
            <div style={{ fontSize: 11.5, color: 'var(--topbar-role)' }}>{user.rolle}</div>
          </div>
        )}
        <button
          onClick={logout}
          title="Logg ut" aria-label="Logg ut"
          style={{
            marginLeft: 6, border: '1px solid var(--topbar-ctl-border)', background: 'var(--topbar-ctl-bg)',
            borderRadius: 9, cursor: 'pointer', fontFamily: "'Geist Variable'", fontSize: 13, fontWeight: 600, color: 'var(--topbar-ctl-fg)',
            ...(isMobile
              ? { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }
              : { padding: '8px 14px' }),
          }}
        >
          {isMobile ? <Icon name="logout" size={18} /> : 'Logg ut'}
        </button>
      </div>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
