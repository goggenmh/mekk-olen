import { Suspense, lazy } from 'react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { AnsatteProvider } from './context/AnsatteContext';
import { DEMO, lesSti } from './lib/view';
import { DemoMerke } from './demo/DemoMerke';

const Kundeside = lazy(() => import('./components/Utleige/Kundeside').then((m) => ({ default: m.Kundeside })));
const SporBestilling = lazy(() => import('./components/Bestillinger/SporBestilling').then((m) => ({ default: m.SporBestilling })));

// Den offentlege kundesida blir rendra utan tilsett-providerane, så ei kundeøkt
// ikkje blir logga ut av AuthContext (som tømmer økter utan ansatt-profil).
//
// Kundesida (utleige) ligg berre på «/utleige» – ein kjem dit når ein trykkjer
// lenka, ikkje berre ved å opne domenet. Sjølve domenet («/») og «/intern»
// opnar den vanlege tilsett-appen. Tilgangen er uansett låst av PIN + RLS,
// ikkje av kva adresse ein gjettar.
export function Root() {
  const sti = lesSti();
  if (sti.startsWith('/utleige')) {
    return <Suspense fallback={null}><Kundeside />{DEMO && <DemoMerke />}</Suspense>;
  }
  // Offentleg sporing av bestilling (lenkje i SMS til kunden) – utan innlogging.
  if (sti.startsWith('/spor')) {
    return <Suspense fallback={null}><SporBestilling />{DEMO && <DemoMerke />}</Suspense>;
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
