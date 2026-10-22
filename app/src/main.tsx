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

// Demo-fila blir opna lokalt utan nett: ingen service worker/push der.
if (!DEMO) registrerServiceWorker()
visUhandterteFeil()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </StrictMode>,
)
