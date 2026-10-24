# MEKK Ølen

Internt styringsverktøy for MEKK Ølen: vaktplan, timelister, oppgåver, ferie,
bestillingar, dokument og **utstyrsutleige** – pluss ei open kundeside for
utleige. Éi React-app, ein Supabase-backend, utrulla på Vercel.

- **Stack:** React 19 + TypeScript + Vite (SPA). Supabase (Postgres, RLS,
  edge functions, auth, pg_cron). Vercel for hosting.
- **Språk i koden:** nynorsk i UI-tekst og det meste av kommentarar.

---

## Kom i gang

```bash
cd app
cp .env.example .env.local      # fyll inn Supabase-verdiane (sjå supabase/SETUP.md)
npm install
npm run dev                     # lokal utviklingsserver
```

| Kommando | Kva han gjer |
|----------|--------------|
| `npm run dev` | Utviklingsserver med hot reload |
| `npm run build` | Produksjonsbygg til `app/dist/` |
| `npm run build:demo` | Sjølvstendig demo (éi HTML-fil, in-memory-data, ingen Supabase) → `app/dist-demo/` |
| `npm run lint` | ESLint |

Alt appkode og -oppsett ligg under **`app/`**.

---

## To inngangar (viktig å forstå)

Appen er éin SPA, men viser to ulike ting ut frå adressa (sjå
`app/src/Root.tsx`):

| Adresse | Kven | Kva |
|---------|------|-----|
| `/` og `/utleige` | **Kundar** (open, inga pålogging) | Utleigekatalog, booking, «Mi side» (`/utleige/mi-side`) |
| `/intern`, `/vaktplan`, `/timelister`, … | **Tilsette** | Heile styringsverktøyet, låst med PIN-innlogging |

Kundesida blir rendra **utanfor** dei tilsette-providerane, så ei kundeøkt
ikkje kolliderer med tilsett-innlogginga. I demo-bygget opnar `/` tilsett-appen
(så demovisningar er uendra).

---

## Struktur

```
app/
  src/
    main.tsx            # Oppstart: ThemeProvider → Root
    Root.tsx            # Rutar kunde- vs tilsett-del ut frå adressa
    App.tsx             # Tilsett-appen: meny + val av «view»
    lib/view.ts         # Views, adresser (sti) og ruting-hjelparar
    constants.ts, types.ts
    context/            # AnsatteContext, AuthContext, AppDataContext, ThemeContext
    components/
      Login/            # PIN-innlogging for tilsette
      Dashboard/ Vaktplan/ Timeliste/ Oppgaver/ Ferie/
      Bestillinger/ Dokument/ Rapporter/ Ansatte/ Innstillinger/
      Utleige/          # BÅDE kundesida (UtleigeSide, MiSide, Kundeside)
                        #   OG tilsett-administrasjonen av utleige
      Layout/ ui/ Admin/
    lib/                # Reine hjelparar (dato, pris, pdf, utleige-reglar, …)
    demo/               # In-memory Supabase-klient + testdata til demo-bygget
    supabaseClient.ts   # Supabase-klient (prod)
  supabase/             # SQL-skjema, funksjonar og edge functions (sjå under)
  vercel.json           # SPA-rewrites for Vercel
```

---

## Backend (Supabase)

Prosjekt-ref: `hzrqbgxfukfjlotieanh` (region eu-north-1).

- **`app/supabase/SETUP.md`** – full gjennomgang av oppsettet. Start her.
- **`app/supabase/*.sql`** – skjema og funksjonar, ein fil per modul
  (t.d. `utleige.sql`, `skatt.sql`, `pin-login.sql`, `rls-del-opp-skriving.sql`).
- **`app/supabase/functions/`** – edge functions:
  - `pin-login` – vekslar PIN mot ei Supabase-økt for tilsette
  - `utleige-epost` – sender kø-lagde utleige-e-postar via Resend (pg_cron, kvart 5. min)
  - `paaminning`, `send-push`, `ansatte-admin`

**Tryggleik:** alle tabellar har RLS. Kundar og anonyme når berre databasen
gjennom kontrollerte `SECURITY DEFINER`-funksjonar; lønskolonnar er sperra på
kolonnenivå. Sjå `rls-del-opp-skriving.sql`, `lon-privat.sql` og
`stram-inn-funksjonar.sql`.

**E-post:** kundeinnlogging (eingongskode) og varsel-e-postar krev at Resend
SMTP + nøklar er sette opp. Sjekklista ligg utanfor repoet (gitt til eigaren).
Til då blir varsel-e-postar liggjande i kø.

---

## Utrulling

Vercel byggjer og rullar ut automatisk når `main` blir oppdatert.
`app/vercel.json` gjer at alle adresser serverer `index.html` (SPA-ruting).

## Pålogging

- **Tilsette:** gå til `/intern`, vel namn, skriv PIN.
- **Kundar:** `/utleige/mi-side`, logg inn med eingongskode på e-post.
