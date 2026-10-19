-- =====================================================================
-- RLS: skrivereglar berre for skriving  (Supabase advisor 0006)
-- =====================================================================
-- «…_write»-reglane var «for all», så Postgres sjekka dei òg ved kvar
-- lesing i tillegg til lesereglane. No gjeld dei berre insert/update/delete.
-- Tilgangen er nøyaktig den same som før.

-- ansatte: leiar i same butikk kan skrive.
drop policy if exists "ansatte_write_leder" on public.ansatte;
create policy "ansatte_insert_leder" on public.ansatte for insert to authenticated
  with check ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));
create policy "ansatte_update_leder" on public.ansatte for update to authenticated
  using ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()))
  with check ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));
create policy "ansatte_delete_leder" on public.ansatte for delete to authenticated
  using ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));

-- permissions: same mønster.
drop policy if exists "permissions_write_leder" on public.permissions;
create policy "permissions_insert_leder" on public.permissions for insert to authenticated
  with check ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));
create policy "permissions_update_leder" on public.permissions for update to authenticated
  using ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()))
  with check ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));
create policy "permissions_delete_leder" on public.permissions for delete to authenticated
  using ((select public.is_active_leder()) and butikk_id = (select public.min_butikk()));

-- butikkar: berre konsern-admin skriv.
drop policy if exists "butikkar_write" on public.butikkar;
create policy "butikkar_insert" on public.butikkar for insert to authenticated
  with check ((select public.er_konsern_admin()));
create policy "butikkar_update" on public.butikkar for update to authenticated
  using ((select public.er_konsern_admin()))
  with check ((select public.er_konsern_admin()));
create policy "butikkar_delete" on public.butikkar for delete to authenticated
  using ((select public.er_konsern_admin()));
