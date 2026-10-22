import { Suspense, lazy } from 'react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { AnsatteProvider } from './context/AnsatteContext';
import { DEMO, lesSti } from './lib/view';
import { DemoMerke } from './demo/DemoMerke';

const Kundeside = lazy(() => import('./components/Utleige/Kundeside').then((m) => ({ default: m.Kundeside })));

// Den offentlege utleige-sida (/utleige, inkl. kundeinnlogging på /utleige/mi-side)
// blir rendra utan tilsett-providerane, så ei kundeøkt ikkje blir logga ut av
// AuthContext (som tømmer økter utan ansatt-profil).
export function Root() {
  if (lesSti().startsWith('/utleige')) {
    return <Suspense fallback={null}><Kundeside />{DEMO && <DemoMerke />}</Suspense>;
  }
  return (
    <AnsatteProvider>
      <AuthProvider>
        <AppDataProvider>
          <App />
          {DEMO && <DemoMerke />}
        </AppDataProvider>
      </AuthProvider>
    </AnsatteProvider>
  );
}
