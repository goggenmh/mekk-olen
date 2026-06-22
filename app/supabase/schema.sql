-- MEKK Ølen timeliste — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- See SETUP.md for the full setup walkthrough (creating the project, auth users, env vars).

create extension if not exists pgcrypto;

-- ---------- ansatte ----------
-- The employee directory itself. id is a short slug (e.g. 'sander') used as the
-- foreign key everywhere else. Names/roles/colours are not secrets — same as the
-- original prototype, which hardcoded them in client code too. Only the PIN/password
-- check happens server-side (via Supabase Auth), not these values. `aktiv` is a
-- soft-delete flag: deactivated staff disappear from pickers but stay in history.
create table if not exists ansatte (
  id text primary key,
  navn text not null,
  rolle text not null default '',
  lonn text not null default 'time' check (lonn in ('fast', 'time')),
  sats numeric not null default 0,
  farge text not null default '#11788a',
  init text not null default '',
  email text not null unique,
  telefon text not null default '',
  leder boolean not null default false,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

insert into ansatte (id, navn, rolle, lonn, sats, farge, init, email, telefon, leder, aktiv) values
  ('sander', 'Sander', 'Dagleg leiar', 'fast', 0, '#11788a', 'SA', 'sander@mekk-olen.internal', '', true, true),
  ('georg', 'Georg', 'Selgar', 'time', 164, '#e08a1e', 'GE', 'georg@mekk-olen.internal', '', false, true),
  ('christian', 'Christian', 'Selgar', 'time', 133, '#2f9e6f', 'CH', 'christian@mekk-olen.internal', '', false, true)
on conflict (id) do nothing;

-- ---------- time_entries ----------
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  ansatt text not null references ansatte(id),
  date date not null,
  start text not null,
  slutt text not null,
  pause int not null default 0,
  status text not null default 'venter' check (status in ('venter', 'godkjent')),
  unique (ansatt, date)
);

-- ---------- shifts ----------
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  ansatt text not null references ansatte(id),
  date date not null,
  start text not null,
  slutt text not null,
  skift text not null
);

-- ---------- shift_swaps ----------
create table if not exists shift_swaps (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  fra text not null references ansatte(id),
  til text not null references ansatte(id),
  dag text not null,
  tid text not null,
  status text not null default 'pending' check (status in ('pending', 'godkjent', 'avvist')),
  created_at timestamptz not null default now()
);

-- ---------- ferie ----------
create table if not exists ferie (
  id uuid primary key default gen_random_uuid(),
  ansatt text not null references ansatte(id),
  type text not null check (type in ('Ferie', 'Fri', 'Kurs', 'Sjukmeld')),
  tekst text not null
);

-- ---------- tasks ----------
-- ansatt is 'ufordelt' (unassigned) or an ansatte.id — no FK since 'ufordelt'
-- isn't a real employee row.
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  tittel text not null,
  detalj text not null default '',
  prioritet text not null default 'medium' check (prioritet in ('høg', 'medium', 'låg')),
  ansatt text not null default 'ufordelt',
  ferdig boolean not null default false
);

alter table tasks add column if not exists ferdig boolean not null default false;

-- ---------- orders ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  kunde text not null,
  telefon text not null default '',
  vare text not null default '',
  leverandor text not null default '',
  varenr text not null default '',
  dato date not null,
  antal int not null default 1,
  status text not null default 'ny' check (status in ('ny', 'tinga', 'komen', 'henta')),
  varsla date,
  created_at timestamptz not null default now()
);

-- ---------- docs ----------
create table if not exists docs (
  id uuid primary key default gen_random_uuid(),
  tittel text not null,
  kategori text not null default 'Rutine' check (kategori in ('HMS', 'Rutine', 'Avtale', 'Skjema', 'Anna')),
  notat text not null default '',
  dato date not null default current_date,
  fil_url text,
  fil_namn text
);

alter table docs add column if not exists fil_url text;
alter table docs add column if not exists fil_namn text;

-- Storage bucket for document attachments. Public so the stored fil_url
-- can be opened directly without re-authenticating against Supabase.
insert into storage.buckets (id, name, public)
values ('docs', 'docs', true)
on conflict (id) do nothing;

drop policy if exists "docs_storage_all" on storage.objects;
create policy "docs_storage_all" on storage.objects for all to authenticated
  using (bucket_id = 'docs') with check (bucket_id = 'docs');

-- ---------- permissions ----------
-- Delegated rights, set by leiar(ar) in the admin panel. Leiarar can always
-- approve regardless of this table — see canApprove() in AppDataContext.
create table if not exists permissions (
  ansatt text primary key references ansatte(id),
  kan_godkjenne boolean not null default false
);

insert into permissions (ansatt, kan_godkjenne) values
  ('sander', true), ('georg', false), ('christian', false)
on conflict (ansatt) do nothing;

-- ---------- meldinger ----------
-- Notices sent by leiar(ar) to staff from the admin panel. til = null means
-- broadcast to everyone.
create table if not exists meldinger (
  id uuid primary key default gen_random_uuid(),
  fra text not null references ansatte(id),
  til text references ansatte(id),
  tekst text not null,
  created_at timestamptz not null default now()
);

-- ---------- legacy constraint cleanup (safe to re-run) ----------
-- Earlier versions hardcoded `check (col in ('sander','georg','christian'))` on
-- these columns. Drop those so any employee created via the Ansatte module can
-- be used everywhere, then add real foreign keys to ansatte instead.
alter table time_entries drop constraint if exists time_entries_ansatt_check;
alter table shifts drop constraint if exists shifts_ansatt_check;
alter table shift_swaps drop constraint if exists shift_swaps_fra_check;
alter table shift_swaps drop constraint if exists shift_swaps_til_check;
alter table ferie drop constraint if exists ferie_ansatt_check;
alter table tasks drop constraint if exists tasks_ansatt_check;
alter table permissions drop constraint if exists permissions_ansatt_check;
alter table meldinger drop constraint if exists meldinger_fra_check;
alter table meldinger drop constraint if exists meldinger_til_check;

do $$ begin
  alter table time_entries add constraint time_entries_ansatt_fkey foreign key (ansatt) references ansatte(id);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table shifts add constraint shifts_ansatt_fkey foreign key (ansatt) references ansatte(id);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table shift_swaps add constraint shift_swaps_fra_fkey foreign key (fra) references ansatte(id);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table shift_swaps add constraint shift_swaps_til_fkey foreign key (til) references ansatte(id);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table ferie add constraint ferie_ansatt_fkey foreign key (ansatt) references ansatte(id);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table permissions add constraint permissions_ansatt_fkey foreign key (ansatt) references ansatte(id);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table meldinger add constraint meldinger_fra_fkey foreign key (fra) references ansatte(id);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table meldinger add constraint meldinger_til_fkey foreign key (til) references ansatte(id);
exception when duplicate_object then null;
end $$;

-- ---------- RLS ----------
-- All employees are equally trusted staff in this shop — any logged-in
-- employee can read/write everything (matches the original prototype's behaviour,
-- e.g. anyone can approve anyone's hours). The boundary is "logged in or not".
alter table ansatte enable row level security;
alter table time_entries enable row level security;
alter table shifts enable row level security;
alter table shift_swaps enable row level security;
alter table ferie enable row level security;
alter table tasks enable row level security;
alter table orders enable row level security;
alter table docs enable row level security;
alter table permissions enable row level security;
alter table meldinger enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['time_entries','shifts','shift_swaps','ferie','tasks','orders','docs','permissions','meldinger']) loop
    execute format('drop policy if exists "authenticated_all" on %I', t);
    execute format(
      'create policy "authenticated_all" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- `ansatte` also needs anon SELECT: the "who are you" login picker renders
-- the employee list before the user is authenticated. Names/roles/colours
-- aren't secret in this app's threat model, so that's an intentional, scoped
-- exception to the authenticated-only pattern used everywhere else. Writes
-- (and Auth-account creation) still require either an authenticated session
-- or the service-role key inside the ansatte-admin Edge Function.
drop policy if exists "anon_select_ansatte" on ansatte;
create policy "anon_select_ansatte" on ansatte for select to anon using (true);
drop policy if exists "authenticated_all_ansatte" on ansatte;
create policy "authenticated_all_ansatte" on ansatte for all to authenticated using (true) with check (true);

-- RLS policies alone don't grant table access — Postgres still requires the
-- underlying GRANTs, separate from row-level security.
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on time_entries, shifts, shift_swaps, ferie, tasks, orders, docs, permissions, meldinger, ansatte to authenticated;
grant select on ansatte to anon;
