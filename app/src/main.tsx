import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonten blir levert frå eigen server (ikkje Google), så ho blokkerer ikkje første visning.
import '@fontsource-variable/inter'
import '@fontsource-variable/geist-mono'
import './index.css'
import { Root } from './Root'
import { ThemeProvider } from './context/ThemeContext'
import { registrerServiceWorker } from './lib/push'
import { DEMO } from './lib/view'
import { visUhandterteFeil } from './lib/toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { planleggNullstillReloadVakt } from './lib/chunkReload'

// Demo-fila blir opna lokalt utan nett: ingen service worker/push der.
if (!DEMO) registrerServiceWorker()
visUhandterteFeil()
// Appen kom opp: nullstill chunk-reload-vakta så ein seinare deploy kan utløyse
// éi ny oppfrisking om ein gammal chunk manglar.
planleggNullstillReloadVakt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
