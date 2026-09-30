-- =====================================================================
-- FASE 1 – FLEIRBUTIKK-GRUNNMUR
-- =====================================================================
-- Trygt å køyre på ein eksisterande (Ølen-)database:
--   * Lagar ein `butikkar`-tabell og «MEKK Ølen» som første butikk.
--   * Legg til `butikk_id` på alle datatabellar og koplar alt som finst
--     til Ølen (backfill).
--   * Slår på tilgangsreglar (RLS) så kvar butikk berre ser sitt eige,
--     medan ein konsern-admin kan sjå alt.
--   * BEFORE INSERT-trigger set butikk_id automatisk til brukaren sin
--     butikk, så appen treng ingen kodeendring.
-- Idempotent: kan køyrast fleire gonger utan skade.
--
-- MERK: Etter denne SQL-en må ansatte-admin-funksjonen deployast på nytt
-- (den set no butikk_id på nye tilsette). Sjå supabase/functions/.
-- =====================================================================

-- 1) Butikkar --------------------------------------------------------
create table if not exists butikkar (
  id uuid primary key default gen_random_uuid(),
  namn text not null,
  farge text default '#11788a',
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);
alter table butikkar enable row level security;

-- «MEKK Ølen» som første butikk (berre om det ikkje finst nokon frå før).
insert into butikkar (namn)
select 'MEKK Ølen'
where not exists (select 1 from butikkar);

-- 2) konsern_admin-flagg på ansatte ----------------------------------
alter table ansatte add column if not exists konsern_admin boolean not null default false;

-- 3) butikk_id på alle tabellar + backfill til Ølen ------------------
do $$
declare
  olen uuid;
  t text;
begin
  select id into olen from butikkar order by created_at asc limit 1;
  for t in select unnest(array[
    'ansatte','time_entries','shifts','shift_swaps','ferie','tasks',
    'orders','docs','permissions','meldinger','utilgjengeleg','standardveke'
  ]) loop
    execute format('alter table %I add column if not exists butikk_id uuid', t);
    execute format('update %I set butikk_id = %L where butikk_id is null', t, olen);
    execute format('alter table %I alter column butikk_id set not null', t);
    execute format('alter table %I drop constraint if exists %I', t, t || '_butikk_fk');
    execute format('alter table %I add constraint %I foreign key (butikk_id) references butikkar(id) on delete cascade', t, t || '_butikk_fk');
  end loop;
end $$;

-- 4) Hjelpefunksjonar (SECURITY DEFINER – les utan RLS) --------------
-- Er den innlogga brukaren ein aktiv leiar? (Tatt med her så migreringa er
-- sjølvstendig, uavhengig av om den separate tryggleiks-SQL-en er køyrd.)
create or replace function public.is_active_leder()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.ansatte
    where email = auth.email() and leder = true and aktiv = true
  );
$$;
grant execute on function public.is_active_leder() to authenticated;

create or replace function public.min_butikk()
returns uuid language sql security definer stable set search_path = public as $$
  select butikk_id from public.ansatte where email = auth.email() limit 1;
$$;
grant execute on function public.min_butikk() to authenticated;

create or replace function public.er_konsern_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
    (select konsern_admin from public.ansatte where email = auth.email() and aktiv limit 1),
    false
  );
$$;
grant execute on function public.er_konsern_admin() to authenticated;

-- 5) Auto-set butikk_id på nye rader (klient-innsetjing) -------------
create or replace function public.set_butikk_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.butikk_id is null then
    new.butikk_id := public.min_butikk();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'ansatte','time_entries','shifts','shift_swaps','ferie','tasks',
    'orders','docs','permissions','meldinger','utilgjengeleg','standardveke'
  ]) loop
    execute format('drop trigger if exists set_butikk on %I', t);
    execute format('create trigger set_butikk before insert on %I for each row execute function public.set_butikk_id()', t);
  end loop;
end $$;

-- 6) RLS – scope til eigen butikk (eller konsern-admin) --------------
-- Vanlege datatabellar: alle i same butikk kan lese/skrive.
do $$
declare t text;
begin
  for t in select unnest(array[
    'time_entries','shifts','shift_swaps','ferie','tasks','orders',
    'docs','meldinger','utilgjengeleg','standardveke'
  ]) loop
    execute format('drop policy if exists "authenticated_all" on %I', t);
    execute format('drop policy if exists "butikk_all" on %I', t);
    execute format(
      'create policy "butikk_all" on %I for all to authenticated
         using (butikk_id = public.min_butikk() or public.er_konsern_admin())
         with check (butikk_id = public.min_butikk() or public.er_konsern_admin())', t);
  end loop;
end $$;

-- ansatte: lese i eigen butikk (anon får framleis lese, for innloggings-
-- veljaren i Fase 1); skrive berre for leiar i same butikk / konsern-admin.
drop policy if exists "ansatte_read_auth" on ansatte;
drop policy if exists "ansatte_write_leder" on ansatte;
create policy "ansatte_read_auth" on ansatte for select to authenticated
  using (butikk_id = public.min_butikk() or public.er_konsern_admin());
create policy "ansatte_write_leder" on ansatte for all to authenticated
  using ((public.is_active_leder() and butikk_id = public.min_butikk()) or public.er_konsern_admin())
  with check ((public.is_active_leder() and butikk_id = public.min_butikk()) or public.er_konsern_admin());

-- permissions: same mønster.
drop policy if exists "authenticated_all" on permissions;
drop policy if exists "permissions_read_auth" on permissions;
drop policy if exists "permissions_write_leder" on permissions;
create policy "permissions_read_auth" on permissions for select to authenticated
  using (butikk_id = public.min_butikk() or public.er_konsern_admin());
create policy "permissions_write_leder" on permissions for all to authenticated
  using ((public.is_active_leder() and butikk_id = public.min_butikk()) or public.er_konsern_admin())
  with check ((public.is_active_leder() and butikk_id = public.min_butikk()) or public.er_konsern_admin());

-- butikkar: alle kan lese (namn/branding); berre konsern-admin skriv.
drop policy if exists "butikkar_read" on butikkar;
drop policy if exists "butikkar_write" on butikkar;
create policy "butikkar_read" on butikkar for select to authenticated using (true);
drop policy if exists "butikkar_read_anon" on butikkar;
create policy "butikkar_read_anon" on butikkar for select to anon using (true);
create policy "butikkar_write" on butikkar for all to authenticated
  using (public.er_konsern_admin()) with check (public.er_konsern_admin());

-- 7) GRANTs ----------------------------------------------------------
grant select on butikkar to authenticated, anon;
grant insert, update, delete on butikkar to authenticated;
