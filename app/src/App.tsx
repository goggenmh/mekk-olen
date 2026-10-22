import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useAppData } from './context/AppDataContext';
import { LoginScreen } from './components/Login/LoginScreen';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
// Sidene blir lasta først når dei blir opna, så oppstarten blir raskare.
const Ansatte = lazy(() => import('./components/Ansatte/Ansatte').then((m) => ({ default: m.Ansatte })));
const Timeliste = lazy(() => import('./components/Timeliste/Timeliste').then((m) => ({ default: m.Timeliste })));
const FerieSide = lazy(() => import('./components/Ferie/FerieSide').then((m) => ({ default: m.FerieSide })));
const Vaktplan = lazy(() => import('./components/Vaktplan/Vaktplan').then((m) => ({ default: m.Vaktplan })));
const Oppgaver = lazy(() => import('./components/Oppgaver/Oppgaver').then((m) => ({ default: m.Oppgaver })));
const Bestillinger = lazy(() => import('./components/Bestillinger/Bestillinger').then((m) => ({ default: m.Bestillinger })));
const Dokument = lazy(() => import('./components/Dokument/Dokument').then((m) => ({ default: m.Dokument })));
const Rapporter = lazy(() => import('./components/Rapporter/Rapporter').then((m) => ({ default: m.Rapporter })));
const Innstillinger = lazy(() => import('./components/Innstillinger/Innstillinger').then((m) => ({ default: m.Innstillinger })));
import { useIsMobile } from './lib/useIsMobile';
import { useIdleLogout } from './lib/useIdleLogout';
import { Toaster } from './components/ui/Toaster';
import { VIEWS, DEMO, harTilgang, lesSti, skrivSti, stiFor, viewFraSti, type View } from './lib/view';
import { BottomNav } from './components/Layout/BottomNav';
import { VarselTips } from './components/Layout/VarselTips';

const gyldigVis = (v: unknown): View | null =>
  typeof v === 'string' && VIEWS.some((x) => x.key === v) ? (v as View) : null;
const gyldigDato = (d: unknown): string | null =>
  typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

/** Kvar eit push-varsel vil ta brukaren: side + eventuelt dato (veka/månaden). */
interface Mal { vis: View; dato: string | null }
const lesMal = (vis: unknown, dato: unknown): Mal | null => {
  const v = gyldigVis(vis);
  return v ? { vis: v, dato: gyldigDato(dato) } : null;
};

function DashboardSkeleton() {
  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="skeleton" style={{ width: 240, height: 30 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 'var(--r)' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 82, borderRadius: 'var(--r)' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--r)' }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--r)' }} />
      </div>
    </div>
  );
}

function App() {
  const { loading: authLoading, user, logout } = useAuth();
  const { loading: dataLoading, error, refreshAll } = useAppData();
  // Sida følgjer adressa (/vaktplan, /bestillingar …), så tilbake-knappen,
  // bokmerke og oppdatering av sida tek deg til same stad.
  const [view, setView] = useState<View>(() => viewFraSti(lesSti()));
  // Dato frå eit varsel: Vaktplan/Timeliste opnar på den veka/månaden.
  const [visDato, setVisDato] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const byttSide = (v: View, dato: string | null) => {
    setView(v);
    setVisDato(dato);
    setMenuOpen(false);
    skrivSti(stiFor(v));
  };
  const go = (v: View) => byttSide(v, null);
  const gaaTil = (m: Mal) => byttSide(m.vis, m.dato);

  // Tilbake/fram i nettlesaren.
  useEffect(() => {
    const vedPop = () => { setView(viewFraSti(lesSti())); setVisDato(null); setMenuOpen(false); };
    const hending = DEMO ? 'hashchange' : 'popstate';
    window.addEventListener(hending, vedPop);
    return () => window.removeEventListener(hending, vedPop);
  }, []);

  // Sider berre for leiarar: send andre til oversikta.
  const synlegView: View = harTilgang(view, user) ? view : 'dashbord';
  useEffect(() => {
    if (user && synlegView !== view) skrivSti(stiFor(synlegView), true);
  }, [user, view, synlegView]);

  // Automatisk utlogging etter 5 minutt utan aktivitet.
  useIdleLogout(!!user, logout, 5);

  useEffect(() => {
    if (user) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Eit push-varsel kan opne appen på ei bestemt side (?vis=vaktplan). Sida
  // blir hugsa gjennom innlogginga, om økta har gått ut i mellomtida.
  const ventandeVis = useRef<Mal | null>((() => {
    const q = new URLSearchParams(window.location.search);
    return lesMal(q.get('vis'), q.get('dato'));
  })());
  useEffect(() => {
    if (ventandeVis.current) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Ved innlogging: gå til sida frå varselet, elles bli på sida i adressa.
  useEffect(() => {
    if (ventandeVis.current) gaaTil(ventandeVis.current);
    if (user?.id) ventandeVis.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Varsel trykt medan appen alt var open: service workeren ber oss byte side.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const vedMelding = (e: MessageEvent) => {
      const mal = e.data?.type === 'naviger' ? lesMal(e.data.vis, e.data.dato) : null;
      if (!mal) return;
      if (user) gaaTil(mal);
      else ventandeVis.current = mal;
    };
    navigator.serviceWorker.addEventListener('message', vedMelding);
    return () => navigator.serviceWorker.removeEventListener('message', vedMelding);
  }, [user]);

  if (authLoading) return null;
  if (!user) return <LoginScreen />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <Sidebar view={synlegView} setView={go} isMobile={isMobile} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header setView={go} isMobile={isMobile} onMenu={() => setMenuOpen(true)} />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingBottom: isMobile ? 'calc(64px + env(safe-area-inset-bottom))' : 0 }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
            {dataLoading ? (
              <DashboardSkeleton />
            ) : error ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Kunne ikkje laste data: {error}</div>
            ) : (
              <Suspense fallback={<DashboardSkeleton />}>
                {synlegView === 'dashbord' && <><VarselTips setView={go} /><Dashboard setView={go} /></>}
                {synlegView === 'ansatte' && <Ansatte />}
                {synlegView === 'timeliste' && <Timeliste key={visDato ?? 'i-dag'} startDato={visDato} />}
                {synlegView === 'vaktplan' && <Vaktplan key={visDato ?? 'i-dag'} startDato={visDato} />}
                {synlegView === 'ferie' && <FerieSide />}
                {synlegView === 'oppgaver' && <Oppgaver setView={go} />}
                {synlegView === 'bestilling' && <Bestillinger />}
                {synlegView === 'dokument' && <Dokument />}
                {synlegView === 'rapporter' && <Rapporter />}
                {synlegView === 'innstillinger' && <Innstillinger setView={go} />}
              </Suspense>
            )}
          </div>
        </main>
      </div>
      {isMobile && <BottomNav view={synlegView} setView={go} onMeir={() => setMenuOpen(true)} />}
      <Toaster />
    </div>
  );
}

export default App;
