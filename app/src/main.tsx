import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonten blir levert frå eigen server (ikkje Google), så ho blokkerer ikkje første visning.
import '@fontsource-variable/inter'
import '@fontsource-variable/geist-mono'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import { ThemeProvider } from './context/ThemeContext'
import { AnsatteProvider } from './context/AnsatteContext'
import { registrerServiceWorker } from './lib/push'
import { DEMO } from './lib/view'
import { DemoMerke } from './demo/DemoMerke'
import { visUhandterteFeil } from './lib/toast'

// Demo-fila blir opna lokalt utan nett: ingen service worker/push der.
if (!DEMO) registrerServiceWorker()
visUhandterteFeil()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AnsatteProvider>
        <AuthProvider>
          <AppDataProvider>
            <App />
            {DEMO && <DemoMerke />}
          </AppDataProvider>
        </AuthProvider>
      </AnsatteProvider>
    </ThemeProvider>
  </StrictMode>,
)
