-- =====================================================================
-- LES OG STADFEST  – kven har lese HMS-dokumenta
-- =====================================================================
-- Kvar tilsett stadfestar at dei har lese eit dokument. Kven og når blir
-- sett av databasen ut frå innlogga brukar, så det kan ikkje forfalskast.
-- Stadfestinga kan ikkje endrast eller slettast frå appen (dokumentasjon).
-- Trygt å køyre på nytt.

create table if not exists public.doc_stadfesting (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.docs(id) on delete cascade,
  ansatt text not null references public.ansatte(id) on delete cascade,
  stadfesta_at timestamptz not null default now(),
  butikk_id uuid not null references public.butikkar(id) on delete cascade,
  unique (doc_id, ansatt)
);
create index if not exists doc_stadfesting_ansatt_idx on public.doc_stadfesting (ansatt);
create index if not exists doc_stadfesting_butikk_id_idx on public.doc_stadfesting (butikk_id);

alter table public.doc_stadfesting enable row level security;

-- Set alltid tilsett, tidspunkt og butikk frå innlogginga.
create or replace function public.doc_stadfesting_set()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select id, butikk_id into new.ansatt, new.butikk_id
    from public.ansatte where email = auth.email() and aktiv limit 1;
  if new.ansatt is null then
    raise exception 'Ukjend tilsett';
  end if;
  new.stadfesta_at := now();
  return new;
end $$;
revoke execute on function public.doc_stadfesting_set() from public, anon, authenticated;

drop trigger if exists doc_stadfesting_set on public.doc_stadfesting;
create trigger doc_stadfesting_set before insert on public.doc_stadfesting
  for each row execute function public.doc_stadfesting_set();

-- Alle i butikken kan sjå kven som har stadfesta; kvar tilsett kan berre
-- leggje til si eiga (triggeren over). Ingen update/delete-reglar.
drop policy if exists "stadfesting_les" on public.doc_stadfesting;
create policy "stadfesting_les" on public.doc_stadfesting for select to authenticated
  using (butikk_id = (select public.min_butikk()));
drop policy if exists "stadfesting_ny" on public.doc_stadfesting;
create policy "stadfesting_ny" on public.doc_stadfesting for insert to authenticated
  with check (butikk_id = (select public.min_butikk()));

-- Live-oppdatering i appen.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'doc_stadfesting'
  ) then
    alter publication supabase_realtime add table public.doc_stadfesting;
  end if;
end $$;
