# MEKK Ølen — Supabase setup

This app needs a Supabase project (hosted Postgres + Auth) before it works end-to-end.
Follow these steps once.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free project (any region).
2. Wait for it to finish provisioning.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public key**.

## 2. Run the database schema

1. Open **SQL Editor → New query** in the Supabase dashboard.
2. Paste the contents of `supabase/schema.sql` and run it.
   This creates all the tables (`ansatte`, `time_entries`, `shifts`,
   `shift_swaps`, `ferie`, `tasks`, `orders`, `docs`, `permissions`,
   `meldinger`) and row-level-security policies. The script is idempotent —
   safe to re-run any time the schema changes, since it only creates what's
   missing and never drops existing data.
3. Optionally also run `supabase/seed-optional.sql` to add some starter rows
   for testing. Skip it for a clean production start.

This also seeds 3 starting rows into `ansatte` (Sander, Georg, Christian) so
the app has someone to log in as on first run. Everyone after that is added
through the app itself (see step 3a below) — there's no need to ever hand-edit
the `ansatte` table again.

## 3. Deploy the `ansatte-admin` Edge Function

Creating a new employee, deactivating one, or resetting a PIN all need to
create/update a real Supabase Auth account — and that requires the
**service-role key**, which must never reach browser code. This Edge
Function is the only place that key is used.

1. In the Supabase dashboard, go to **Edge Functions → Create a new function**.
2. Name it exactly `ansatte-admin`.
3. Paste the full contents of `supabase/functions/ansatte-admin/index.ts` into
   the function editor and click **Deploy**.
4. No extra secrets to configure — `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` are automatically available to every Edge
   Function in your project.

Whenever `index.ts` changes in the repo, repeat steps 2–3 (paste + deploy) to
push the change live — there's no CLI deploy step in this workflow.

## 3b. Set up push notifications (optional)

Lets employees install the app on their phone and get a push notification for
new shifts, swap requests, and approved hours.

1. Generate a VAPID key pair (one-time, on your own machine):
   ```
   npx web-push generate-vapid-keys
   ```
   This prints a public and a private key.
2. In the Supabase dashboard, go to **Edge Functions → Create a new function**,
   name it exactly `send-push`, paste the contents of
   `supabase/functions/send-push/index.ts`, and click **Deploy**.
3. Go to **Edge Functions → send-push → Secrets** (or **Project Settings →
   Edge Functions → Secrets** for project-wide secrets) and add:
   ```
   VAPID_PUBLIC_KEY=<the public key from step 1>
   VAPID_PRIVATE_KEY=<the private key from step 1>
   VAPID_SUBJECT=mailto:you@example.com
   ```
4. Add the same public key to your app's env as `VITE_VAPID_PUBLIC_KEY` (see
   step 4 below) and redeploy the app.
5. Run `supabase/schema.sql` again (step 2) if you ran it before this section
   existed — it adds the `push_subscriptions` table.

Each employee then turns it on themselves in **Innstillingar → "Varsel på
telefonen"**. Skip all of this if you don't need push notifications — the
rest of the app works fine without it.

## 3a. Create the 3 starting employee logins

The app's PIN pad is a UI layer on top of real Supabase Auth accounts. The
3 seeded rows from step 2 each need a matching Auth user with a specific
email, and a password derived from their PIN.

The password is **`<PIN_SALT><pin>`**, where `PIN_SALT` is the value of
`VITE_APP_PIN_SALT` (see step 4) and `<pin>` is the 4-digit PIN they'll type
on the pad. With the default salt `mekk-olen-`:

| Employee  | Auth email                       | PIN  | Auth password       |
|-----------|-----------------------------------|------|----------------------|
| Sander    | sander@mekk-olen.internal         | 1234 | mekk-olen-1234       |
| Georg     | georg@mekk-olen.internal          | 2222 | mekk-olen-2222       |
| Christian | christian@mekk-olen.internal      | 3333 | mekk-olen-3333       |

To create them: **Authentication → Users → Add user** (use "Create new user",
not invite-by-email), enter the email and password from the table above, and
tick **Auto Confirm User** so they can sign in immediately without an email
confirmation step.

This manual step is only needed once, for these 3 bootstrap accounts. Every
employee added afterwards (via Ansatte → "+ Ny ansatt" in the app, once step 3
above is deployed) gets their Auth account created automatically — no
dashboard work required.

If you change `VITE_APP_PIN_SALT`, any already-created employee's PIN won't
match anymore until it's reset — use the "Nullstill PIN" button in the
Ansatte module (or, for the 3 bootstrap accounts before that module is wired
up, **Authentication → Users → select user → Reset password**).

**Change the demo PINs (1234 / 2222 / 3333) before real use** — they're
intentionally simple for the design handoff and are shown on the login screen
itself as a reminder. A 4-digit PIN is weak; this app's threat model assumes
a shared, physically-controlled shop device, not a publicly exposed login.

## 4. Set environment variables

Copy `.env.example` to `.env.local` in the `app/` folder and fill in:

```
VITE_SUPABASE_URL=<your project URL>
VITE_SUPABASE_ANON_KEY=<your anon public key>
VITE_APP_PIN_SALT=<pick your own salt, or keep the default>
VITE_VAPID_PUBLIC_KEY=<the public key from step 3b, or leave blank to skip push>
```

`.env.local` is gitignored — never commit real keys. The anon key is safe to
ship to the browser (that's what it's for); it only grants what your RLS
policies allow.

## 5. Run locally

```
npm install
npm run dev
```

Open the printed local URL and log in with one of the 3 employees above.

## 6. Deploy

This is a static Vite SPA — any static host works (Vercel, Netlify, Cloudflare
Pages, GitHub Pages, etc.):

```
npm run build
```

This outputs static files to `dist/`. Set the same three `VITE_*` environment
variables in your hosting provider's project settings (not just locally),
since they're baked in at build time. Then deploy `dist/`.

## Notes

- All employees can read and edit all data (timesheets, shifts, orders, etc.) —
  this matches the original prototype's "small trusted team" design, not an
  oversight.
- There is no real-time sync between devices; refresh the page to see
  changes made by someone else.
- Pay rates (`sats`), roles, phone numbers and email can all be edited live
  through the **Ansatte** module in the app — no code changes or redeploy
  needed. `src/constants.ts` only provides the fallback defaults used the
  very first time the `ansatte` table is seeded.
