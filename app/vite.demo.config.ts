// Byggjer demo-utgåva av appen til éi sjølvstendig HTML-fil (dist-demo/index.html):
//   npm run build:demo
// Supabase blir bytt ut med ein database i minnet med oppdikta testdata
// (src/demo/), og alt – JS, CSS, fontar og logo – blir lagt inn i fila.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const demoKlient = fileURLToPath(new URL('./src/demo/supabaseClient.demo.ts', import.meta.url))
const logo = `data:image/png;base64,${readFileSync(new URL('./public/assets/mekk-logo.png', import.meta.url)).toString('base64')}`

// Logoen blir referert som /assets/mekk-logo.png; i ei lokal fil finst ikkje
// den stien, så han blir bytt ut med sjølve biletet.
const leggInnLogo = (): Plugin => ({
  name: 'legg-inn-logo',
  transform: (kode) => (kode.includes('/assets/mekk-logo.png') ? kode.replaceAll('/assets/mekk-logo.png', logo) : null),
  // Demoen snakkar ikkje med databasen, så preconnect og manifest kan ut.
  transformIndexHtml: (html) => html
    .replaceAll('/assets/mekk-logo.png', logo)
    .replace(/\s*<!--[^>]*-->\s*<link rel="preconnect"[^>]*>/, '')
    .replace(/\s*<link rel="(manifest|apple-touch-icon)"[^>]*>/g, ''),
})

export default defineConfig({
  mode: 'demo',
  plugins: [react(), leggInnLogo(), viteSingleFile()],
  resolve: {
    alias: [{ find: /^.*\/supabaseClient$/, replacement: demoKlient }],
  },
  build: {
    outDir: 'dist-demo',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
})
