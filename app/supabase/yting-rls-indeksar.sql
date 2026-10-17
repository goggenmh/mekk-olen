-- =====================================================================
-- YTING: RLS ÉIN GONG PER SPØRJING + INDEKSAR  – allereie køyrd i prod
-- =====================================================================
-- Hjelpefunksjonane i RLS-reglane blir pakka inn i (select ...) så Postgres
-- reknar dei ut éin gong per spørjing i staden for éin gong per rad.
-- Tilgangen er nøyaktig den same som før.
do $$
declare t text;
begin
  for t in select unnest(array['docs','ferie','meldinger','orders','shift_swaps',
                               'shifts','standardveke','tasks','time_entries','utilgjengeleg']) loop
    execute format('alter policy "butikk_all" on public.%I
      using (butikk_id = (select public.min_butikk()))
      with check (butikk_id = (select public.min_butikk()))', t);
  end loop;
end $$;

alter policy "ansatte_read_auth" on public.ansatte
  using (butikk_id = (select public.min_butikk()));
alter policy "ansatte_write_leder" on public.ansatte
  using ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()))
  with check ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));
alter policy "permissions_read_auth" on public.permissions
  using (butikk_id = (select public.min_butikk()));
alter policy "permissions_write_leder" on public.permissions
  using ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()))
  with check ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));
alter policy "butikkar_write" on public.butikkar
  using ((select public.er_konsern_admin()))
  with check ((select public.er_konsern_admin()));

-- Indeksar på koplingskolonnar (Supabase advisor 0001).
create index if not exists ansatte_butikk_id_idx       on public.ansatte (butikk_id);
create index if not exists docs_butikk_id_idx          on public.docs (butikk_id);
create index if not exists ferie_butikk_id_idx         on public.ferie (butikk_id);
create index if not exists ferie_ansatt_idx            on public.ferie (ansatt);
create index if not exists meldinger_butikk_id_idx     on public.meldinger (butikk_id);
create index if not exists meldinger_fra_idx           on public.meldinger (fra);
create index if not exists meldinger_til_idx           on public.meldinger (til);
create index if not exists orders_butikk_id_idx        on public.orders (butikk_id);
create index if not exists permissions_butikk_id_idx   on public.permissions (butikk_id);
create index if not exists push_subscriptions_ansatt_idx on public.push_subscriptions (ansatt);
create index if not exists shift_swaps_butikk_id_idx   on public.shift_swaps (butikk_id);
create index if not exists shift_swaps_fra_idx         on public.shift_swaps (fra);
create index if not exists shift_swaps_til_idx         on public.shift_swaps (til);
create index if not exists shift_swaps_shift_id_idx    on public.shift_swaps (shift_id);
create index if not exists shifts_butikk_id_idx        on public.shifts (butikk_id);
create index if not exists shifts_ansatt_idx           on public.shifts (ansatt);
create index if not exists standardveke_butikk_id_idx  on public.standardveke (butikk_id);
create index if not exists standardveke_ansatt_idx     on public.standardveke (ansatt);
create index if not exists tasks_butikk_id_idx         on public.tasks (butikk_id);
create index if not exists time_entries_butikk_id_idx  on public.time_entries (butikk_id);
create index if not exists time_entries_ansatt_idx     on public.time_entries (ansatt);
create index if not exists utilgjengeleg_butikk_id_idx on public.utilgjengeleg (butikk_id);

-- push_subscriptions: var «using (true)» for alle innlogga. No berre eigne.
-- (send-push brukar service_role og blir ikkje påverka.)
alter policy "authenticated_all" on public.push_subscriptions
  using (ansatt = (select id from public.min_profil()))
  with check (ansatt = (select id from public.min_profil()));
