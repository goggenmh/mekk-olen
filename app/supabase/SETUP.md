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
   This creates the 7 tables (`time_entries`, `shifts`, `shift_swaps`, `ferie`,
   `tasks`, `orders`, `docs`) and row-level-security policies that let any
   logged-in employee read/write everything (matching the original prototype's
   trust model — these three employees all trust each other with the same data).
3. Optionally also run `supabase/seed-optional.sql` to add some starter rows
   for testing. Skip it for a clean production start.

## 3. Create the 3 employee logins

The app's PIN pad is a UI layer on top of real Supabase Auth accounts. Each
employee needs a fixed Auth user with a specific email, and a password
derived from their PIN.

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

If you change `VITE_APP_PIN_SALT` or any employee's PIN, update the
corresponding Auth user's password to match (**Authentication → Users →
select user → Reset password**), and update `ANSATTE[].id`/PIN expectations
in `src/constants.ts` if you change who exists.

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
- Pay rates (`sats`) and roles are hardcoded in `src/constants.ts`, same as
  the original prototype. Edit that file (and redeploy) to change them.
