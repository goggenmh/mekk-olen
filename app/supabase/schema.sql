-- MEKK Ølen timeliste — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- See SETUP.md for the full setup walkthrough (creating the project, auth users, env vars).

create extension if not exists pgcrypto;

-- ---------- time_entries ----------
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  ansatt text not null check (ansatt in ('sander', 'georg', 'christian')),
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
  ansatt text not null check (ansatt in ('sander', 'georg', 'christian')),
  date date not null,
  start text not null,
  slutt text not null,
  skift text not null
);

-- ---------- shift_swaps ----------
create table if not exists shift_swaps (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  fra text not null check (fra in ('sander', 'georg', 'christian')),
  til text not null check (til in ('sander', 'georg', 'christian')),
  dag text not null,
  tid text not null,
  status text not null default 'pending' check (status in ('pending', 'godkjent', 'avvist')),
  created_at timestamptz not null default now()
);

-- ---------- ferie ----------
create table if not exists ferie (
  id uuid primary key default gen_random_uuid(),
  ansatt text not null check (ansatt in ('sander', 'georg', 'christian')),
  type text not null check (type in ('Ferie', 'Fri', 'Kurs', 'Sjukmeld')),
  tekst text not null
);

-- ---------- tasks ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  tittel text not null,
  detalj text not null default '',
  prioritet text not null default 'medium' check (prioritet in ('høg', 'medium', 'låg')),
  ansatt text not null default 'ufordelt' check (ansatt in ('ufordelt', 'sander', 'georg', 'christian'))
);

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
-- Delegated rights, set by Sander in the admin panel. Sander can always
-- approve regardless of this table — see canApprove() in AppDataContext.
create table if not exists permissions (
  ansatt text primary key check (ansatt in ('sander', 'georg', 'christian')),
  kan_godkjenne boolean not null default false
);

insert into permissions (ansatt, kan_godkjenne) values
  ('sander', true), ('georg', false), ('christian', false)
on conflict (ansatt) do nothing;

-- ---------- meldinger ----------
-- Notices sent by Sander to staff from the admin panel. til = null means
-- broadcast to everyone.
create table if not exists meldinger (
  id uuid primary key default gen_random_uuid(),
  fra text not null check (fra in ('sander', 'georg', 'christian')),
  til text check (til in ('sander', 'georg', 'christian')),
  tekst text not null,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
-- All three employees are equally trusted staff in this shop — any logged-in
-- employee can read/write everything (matches the original prototype's behaviour,
-- e.g. anyone can approve anyone's hours). The boundary is "logged in or not".
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

-- RLS policies alone don't grant table access — Postgres still requires the
-- underlying GRANTs, separate from row-level security.
grant usage on schema public to authenticated;
grant select, insert, update, delete on time_entries, shifts, shift_swaps, ferie, tasks, orders, docs, permissions, meldinger to authenticated;
