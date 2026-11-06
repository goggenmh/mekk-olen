import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RELOAD_NOKKEL, erChunkFeil } from '../lib/chunkReload';

// Sidene blir lasta late (code-splitting). Feilar ein dynamisk import – som regel
// fordi ein gammal chunk ikkje finst meir etter ein ny deploy, eller fordi det
// skjer ein køyrefeil inne i ein modul – ville det før kasta forbi <Suspense> og
// avmontert heile appen: kvit skjerm. Denne grensa fangar det:
//  - Er det ein chunk-feil, lastar vi sida på nytt éin gong, så nettlesaren
//    hentar ny index.html med nye chunk-namn. Ein vakt hindrar evig loop.
//  - Elles viser vi ei melding med ein «last på nytt»-knapp, medan resten av
//    appen (meny, toppstripe) held fram med å fungere.

interface Props { children: ReactNode }
interface State { feil: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { feil: false };

  static getDerivedStateFromError(): State { return { feil: true }; }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (erChunkFeil(error)) {
      let altReloada = false;
      try { altReloada = sessionStorage.getItem(RELOAD_NOKKEL) === '1'; } catch { /* privat modus */ }
      if (!altReloada) {
        try { sessionStorage.setItem(RELOAD_NOKKEL, '1'); } catch { /* ignore */ }
        window.location.reload();
        return;
      }
    }
    // Andre gong, eller ein vanleg køyrefeil: logg så det kan sjåast i konsollen.
    console.error('Uventa feil fanga av ErrorBoundary:', error, info?.componentStack);
  }

  private lastPaNytt = () => {
    try { sessionStorage.removeItem(RELOAD_NOKKEL); } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.feil) return this.props.children;
    return (
      <div style={{ padding: 40, maxWidth: 440, margin: '48px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 8 }}>Noko gjekk gale</div>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 18px' }}>
          Sida kunne ikkje lastast akkurat no. Det skjer gjerne rett etter ei
          oppdatering av appen. Last inn på nytt, så er ho som regel på plass att.
        </p>
        <button
          onClick={this.lastPaNytt}
          style={{ padding: '10px 18px', background: 'var(--cta)', color: 'var(--on-cta)', border: 'none', borderRadius: 'var(--r)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Last inn på nytt
        </button>
      </div>
    );
  }
}
