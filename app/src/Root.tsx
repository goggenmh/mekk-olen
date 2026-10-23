import { Suspense, lazy } from 'react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { AnsatteProvider } from './context/AnsatteContext';
import { DEMO, lesSti } from './lib/view';
import { DemoMerke } from './demo/DemoMerke';

const Kundeside = lazy(() => import('./components/Utleige/Kundeside').then((m) => ({ default: m.Kundeside })));

// Den offentlege kundesida blir rendra utan tilsett-providerane, så ei kundeøkt
// ikkje blir logga ut av AuthContext (som tømmer økter utan ansatt-profil).
//
// Kundane møter kundesida på sjølve domenet («/») og på «/utleige»; tilsette
// loggar inn på «/intern» (og dei andre interne adressene). Dette er berre for
// at kundane ikkje skal lande på ansatt-innlogginga – sjølve tilgangen er
// framleis låst av PIN + RLS, ikkje av kva adresse ein gjettar.
// I demo opnar «/» framleis tilsett-appen, så demovisningar er uendra.
export function Root() {
  const sti = lesSti();
  if (sti.startsWith('/utleige') || (!DEMO && (sti === '/' || sti === ''))) {
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
