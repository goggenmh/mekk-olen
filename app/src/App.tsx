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
import type { View } from './lib/view';

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

  if (dataLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Lastar…</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Kunne ikkje laste data: {error}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <Sidebar view={view} setView={go} isMobile={isMobile} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header setView={go} isMobile={isMobile} onMenu={() => setMenuOpen(true)} />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
            {view === 'dashbord' && <Dashboard setView={go} />}
            {view === 'ansatte' && <Ansatte />}
            {view === 'timeliste' && <Timeliste />}
            {view === 'vaktplan' && <Vaktplan />}
            {view === 'oppgaver' && <Oppgaver />}
            {view === 'bestilling' && <Bestillinger />}
            {view === 'dokument' && <Dokument />}
            {view === 'rapporter' && <Rapporter />}
            {view === 'innstillinger' && <Innstillinger setView={go} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
