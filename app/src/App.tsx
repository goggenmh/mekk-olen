import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useAppData } from './context/AppDataContext';
import { LoginScreen } from './components/Login/LoginScreen';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Ansatte } from './components/Ansatte/Ansatte';
import { Timeliste } from './components/Timeliste/Timeliste';
import { Vaktplan } from './components/Vaktplan/Vaktplan';
import { Oppgaver } from './components/Oppgaver/Oppgaver';
import { Bestillinger } from './components/Bestillinger/Bestillinger';
import { Dokument } from './components/Dokument/Dokument';
import { Rapporter } from './components/Rapporter/Rapporter';
import { Innstillinger } from './components/Innstillinger/Innstillinger';
import { useIsMobile } from './lib/useIsMobile';
import { Toaster } from './components/ui/Toaster';
import type { View } from './lib/view';

function DashboardSkeleton() {
  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="skeleton" style={{ width: 240, height: 30 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 16 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 82, borderRadius: 16 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
      </div>
    </div>
  );
}

function App() {
  const { loading: authLoading, user } = useAuth();
  const { loading: dataLoading, error, refreshAll } = useAppData();
  const [view, setView] = useState<View>('dashbord');
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (v: View) => { setView(v); setMenuOpen(false); };

  useEffect(() => {
    if (user) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading) return null;
  if (!user) return <LoginScreen />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <Sidebar view={view} setView={go} isMobile={isMobile} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header setView={go} isMobile={isMobile} onMenu={() => setMenuOpen(true)} />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
            {dataLoading ? (
              <DashboardSkeleton />
            ) : error ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Kunne ikkje laste data: {error}</div>
            ) : (
              <>
                {view === 'dashbord' && <Dashboard setView={go} />}
                {view === 'ansatte' && <Ansatte />}
                {view === 'timeliste' && <Timeliste />}
                {view === 'vaktplan' && <Vaktplan />}
                {view === 'oppgaver' && <Oppgaver />}
                {view === 'bestilling' && <Bestillinger />}
                {view === 'dokument' && <Dokument />}
                {view === 'rapporter' && <Rapporter />}
                {view === 'innstillinger' && <Innstillinger setView={go} />}
              </>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
