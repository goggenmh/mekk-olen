-- =====================================================================
-- FIKS: BUTIKKANE SKAL VERE HEILT ADSKILTE
-- =====================================================================
-- Køyr HEILE denne i Supabase → SQL Editor → RUN. Trygg å køyre fleire
-- gonger. Ho sørger for at kvar innlogga brukar berre ser SIN EIGEN butikk
-- – tilsette, timar, vakter, alt. Konsern-oversikta går via eigne
-- funksjonar (RPC) og blir ikkje påverka.
-- =====================================================================

-- 1) Hjelpefunksjonar (sørg for at dei finst) -------------------------
create or replace function public.min_butikk()
returns uuid language sql security definer stable set search_path = public as $$
  select butikk_id from public.ansatte where email = auth.email() limit 1;
$$;
grant execute on function public.min_butikk() to authenticated;

create or replace function public.is_active_leder()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.ansatte
    where email = auth.email() and leder = true and aktiv = true
  );
$$;
grant execute on function public.is_active_leder() to authenticated;

create or replace function public.er_konsern_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
    (select konsern_admin from public.ansatte where email = auth.email() and aktiv limit 1),
    false
  );
$$;
grant execute on function public.er_konsern_admin() to authenticated;

-- 2) ANSATTE – fjern ALLE gamle "les alt"-reglar, lag scopa på nytt ----
--    (dette er den som lak: Sander såg alle butikkar sine tilsette)
drop policy if exists "authenticated_all"       on ansatte;
drop policy if exists "authenticated_all_ansatte" on ansatte;
drop policy if exists "ansatte_read_auth"       on ansatte;
drop policy if exists "ansatte_write_leder"     on ansatte;

create policy "ansatte_read_auth" on ansatte for select to authenticated
  using (butikk_id = public.min_butikk());
create policy "ansatte_write_leder" on ansatte for all to authenticated
  using (public.is_active_leder() and butikk_id = public.min_butikk())
  with check (public.is_active_leder() and butikk_id = public.min_butikk());

-- (Innloggings-veljaren les framleis namn før innlogging via anon-regelen
--  "anon_select_ansatte" – den rører vi ikkje.)

-- 3) PERMISSIONS – same mønster --------------------------------------
drop policy if exists "authenticated_all"        on permissions;
drop policy if exists "permissions_read_auth"    on permissions;
drop policy if exists "permissions_write_leder"  on permissions;

create policy "permissions_read_auth" on permissions for select to authenticated
  using (butikk_id = public.min_butikk());
create policy "permissions_write_leder" on permissions for all to authenticated
  using (public.is_active_leder() and butikk_id = public.min_butikk())
  with check (public.is_active_leder() and butikk_id = public.min_butikk());

-- 4) ALLE DATATABELLAR – scope til eigen butikk ----------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'time_entries','shifts','shift_swaps','ferie','tasks','orders',
    'docs','meldinger','utilgjengeleg','standardveke']) loop
    execute format('drop policy if exists "authenticated_all" on %I', t);
    execute format('drop policy if exists "butikk_all" on %I', t);
    execute format('create policy "butikk_all" on %I for all to authenticated
      using (butikk_id = public.min_butikk())
      with check (butikk_id = public.min_butikk())', t);
  end loop;
end $$;

-- 5) SJEKK: kva reglar er aktive no? ---------------------------------
--    Alle "qual" skal no vise (butikk_id = min_butikk()) – IKKJE "true".
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('ansatte','permissions','time_entries','shifts','tasks','orders')
order by tablename, policyname;
