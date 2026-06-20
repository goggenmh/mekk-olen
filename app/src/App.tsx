import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useAppData } from './context/AppDataContext';
import { LoginScreen } from './components/Login/LoginScreen';
import { Header } from './components/Layout/Header';
import { Nav } from './components/Layout/Nav';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Timeliste } from './components/Timeliste/Timeliste';
import { Vaktplan } from './components/Vaktplan/Vaktplan';
import { Oppgaver } from './components/Oppgaver/Oppgaver';
import { Bestillinger } from './components/Bestillinger/Bestillinger';
import { Dokument } from './components/Dokument/Dokument';
import type { View } from './lib/view';

function App() {
  const { loading: authLoading, user } = useAuth();
  const { loading: dataLoading, error, refreshAll } = useAppData();
  const [view, setView] = useState<View>('dashbord');

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <Nav view={view} setView={setView} />
      {view === 'dashbord' && <Dashboard setView={setView} />}
      {view === 'timeliste' && <Timeliste />}
      {view === 'vaktplan' && <Vaktplan />}
      {view === 'oppgaver' && <Oppgaver />}
      {view === 'bestilling' && <Bestillinger />}
      {view === 'dokument' && <Dokument />}
    </div>
  );
}

export default App;
