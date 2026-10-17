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
const Vaktplan = lazy(() => import('./components/Vaktplan/Vaktplan').then((m) => ({ default: m.Vaktplan })));
const Oppgaver = lazy(() => import('./components/Oppgaver/Oppgaver').then((m) => ({ default: m.Oppgaver })));
const Bestillinger = lazy(() => import('./components/Bestillinger/Bestillinger').then((m) => ({ default: m.Bestillinger })));
const Dokument = lazy(() => import('./components/Dokument/Dokument').then((m) => ({ default: m.Dokument })));
const Rapporter = lazy(() => import('./components/Rapporter/Rapporter').then((m) => ({ default: m.Rapporter })));
const Innstillinger = lazy(() => import('./components/Innstillinger/Innstillinger').then((m) => ({ default: m.Innstillinger })));
import { useIsMobile } from './lib/useIsMobile';
import { useIdleLogout } from './lib/useIdleLogout';
import { Toaster } from './components/ui/Toaster';
import { VIEWS, type View } from './lib/view';

const gyldigVis = (v: unknown): View | null =>
  typeof v === 'string' && VIEWS.some((x) => x.key === v) ? (v as View) : null;

function DashboardSkeleton() {
  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="skeleton" style={{ width: 240, height: 30 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 12 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 82, borderRadius: 12 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
      </div>
    </div>
  );
}

function App() {
  const { loading: authLoading, user, logout } = useAuth();
  const { loading: dataLoading, error, refreshAll } = useAppData();
  const [view, setView] = useState<View>('dashbord');
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (v: View) => { setView(v); setMenuOpen(false); };

  // Automatisk utlogging etter 5 minutt utan aktivitet.
  useIdleLogout(!!user, logout, 5);

  useEffect(() => {
    if (user) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Eit push-varsel kan opne appen på ei bestemt side (?vis=vaktplan). Sida
  // blir hugsa gjennom innlogginga, om økta har gått ut i mellomtida.
  const ventandeVis = useRef<View | null>(gyldigVis(new URLSearchParams(window.location.search).get('vis')));
  useEffect(() => {
    if (ventandeVis.current) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Ved innlogging: gå til sida frå varselet, elles til dashbordet.
  useEffect(() => {
    setView(ventandeVis.current ?? 'dashbord');
    if (user?.id) ventandeVis.current = null;
  }, [user?.id]);

  // Varsel trykt medan appen alt var open: service workeren ber oss byte side.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const vedMelding = (e: MessageEvent) => {
      const vis = e.data?.type === 'naviger' ? gyldigVis(e.data.vis) : null;
      if (!vis) return;
      if (user) { setView(vis); setMenuOpen(false); }
      else ventandeVis.current = vis;
    };
    navigator.serviceWorker.addEventListener('message', vedMelding);
    return () => navigator.serviceWorker.removeEventListener('message', vedMelding);
  }, [user]);

  if (authLoading) return null;
  if (!user) return <LoginScreen />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <Sidebar view={view} setView={go} isMobile={isMobile} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header setView={go} isMobile={isMobile} onMenu={() => setMenuOpen(true)} />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
            {dataLoading ? (
              <DashboardSkeleton />
            ) : error ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Kunne ikkje laste data: {error}</div>
            ) : (
              <Suspense fallback={<DashboardSkeleton />}>
                {view === 'dashbord' && <Dashboard setView={go} />}
                {view === 'ansatte' && <Ansatte />}
                {view === 'timeliste' && <Timeliste />}
                {view === 'vaktplan' && <Vaktplan />}
                {view === 'oppgaver' && <Oppgaver />}
                {view === 'bestilling' && <Bestillinger />}
                {view === 'dokument' && <Dokument />}
                {view === 'rapporter' && <Rapporter />}
                {view === 'innstillinger' && <Innstillinger setView={go} />}
              </Suspense>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
