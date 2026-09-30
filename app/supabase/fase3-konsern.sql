-- =====================================================================
-- FASE 3 – KONSERN-ADMIN + OVERSIKT PÅ TVERS
-- =====================================================================
-- Trygt å køyre. Konsern-admin held seg scopa til eigen butikk på dei
-- vanlege sidene (som alle andre), men får ei samla oversikt på tvers via
-- funksjonen konsern_oversikt() – som berre returnerer TAL per butikk,
-- ikkje rådata.
-- =====================================================================

-- 1) Gjer sjefen til konsern-admin. BYT UT e-posten med den sjefen loggar
--    inn med (same e-post som står på ansatt-raden hans).
--    update ansatte set konsern_admin = true where email = 'DIN-EPOST-HER';

-- 2) Scope alle vanlege datatabellar til EIGEN butikk (òg for konsern-admin,
--    så dei vanlege sidene ikkje blandar butikkar). Oversikt kjem via RPC.
do $$
declare t text;
begin
  for t in select unnest(array[
    'time_entries','shifts','shift_swaps','ferie','tasks','orders',
    'docs','meldinger','utilgjengeleg','standardveke']) loop
    execute format('drop policy if exists "butikk_all" on %I', t);
    execute format('create policy "butikk_all" on %I for all to authenticated
      using (butikk_id = public.min_butikk())
      with check (butikk_id = public.min_butikk())', t);
  end loop;
end $$;

drop policy if exists "ansatte_read_auth" on ansatte;
drop policy if exists "ansatte_write_leder" on ansatte;
create policy "ansatte_read_auth" on ansatte for select to authenticated
  using (butikk_id = public.min_butikk());
create policy "ansatte_write_leder" on ansatte for all to authenticated
  using (public.is_active_leder() and butikk_id = public.min_butikk())
  with check (public.is_active_leder() and butikk_id = public.min_butikk());

drop policy if exists "permissions_read_auth" on permissions;
drop policy if exists "permissions_write_leder" on permissions;
create policy "permissions_read_auth" on permissions for select to authenticated
  using (butikk_id = public.min_butikk());
create policy "permissions_write_leder" on permissions for all to authenticated
  using (public.is_active_leder() and butikk_id = public.min_butikk())
  with check (public.is_active_leder() and butikk_id = public.min_butikk());

-- 3) Samla oversikt per butikk. SECURITY DEFINER (les utan RLS), men gir
--    berre tal til ein konsern-admin – returnerer 0 rader for alle andre.
drop function if exists public.konsern_oversikt();
create or replace function public.konsern_oversikt()
returns table (
  butikk uuid,
  namn text,
  farge text,
  tilsette bigint,
  timar_veka numeric,
  til_godkjenning bigint,
  opne_oppgaver bigint,
  aktive_bestillingar bigint,
  vakter_i_dag bigint
)
language sql security definer stable set search_path = public as $$
  select
    b.id,
    b.namn,
    b.farge,
    (select count(*) from ansatte a where a.butikk_id = b.id and a.aktiv),
    coalesce((
      select sum(extract(epoch from (te.slutt::time - te.start::time)) / 3600.0 - coalesce(te.pause, 0) / 60.0)
      from time_entries te
      where te.butikk_id = b.id
        and te.date::date >= date_trunc('week', current_date)::date
        and te.date::date <  date_trunc('week', current_date)::date + 7
    ), 0),
    (select count(*) from time_entries te2 where te2.butikk_id = b.id and te2.status = 'venter'),
    (select count(*) from tasks t where t.butikk_id = b.id and not t.ferdig),
    (select count(*) from orders o where o.butikk_id = b.id and o.status <> 'henta'),
    (select count(*) from shifts s where s.butikk_id = b.id and s.date::date = current_date)
  from butikkar b
  where public.er_konsern_admin()
  order by b.namn;
$$;
grant execute on function public.konsern_oversikt() to authenticated;

-- =====================================================================
-- Detaljar for éin butikk (drill-in). SECURITY DEFINER, berre konsern-admin.
-- =====================================================================
create or replace function public.butikk_detalj(bid uuid)
returns jsonb
language sql security definer stable set search_path = public as $$
  select case when not public.er_konsern_admin() then jsonb_build_object() else jsonb_build_object(
    'namn', (select namn from butikkar where id = bid),
    'vakter', (
      select coalesce(jsonb_agg(jsonb_build_object('navn', a.navn, 'farge', a.farge, 'start', s.start, 'slutt', s.slutt, 'skift', s.skift) order by s.start), '[]'::jsonb)
      from shifts s join ansatte a on a.id = s.ansatt
      where s.butikk_id = bid and s.date::date = current_date
    ),
    'timar', (
      select coalesce(jsonb_agg(jsonb_build_object('navn', q.navn, 'farge', q.farge, 'timar', q.t) order by q.t desc), '[]'::jsonb)
      from (
        select a.navn, a.farge,
          sum(extract(epoch from (te.slutt::time - te.start::time)) / 3600.0 - coalesce(te.pause, 0) / 60.0) as t
        from time_entries te join ansatte a on a.id = te.ansatt
        where te.butikk_id = bid
          and te.date::date >= date_trunc('week', current_date)::date
          and te.date::date <  date_trunc('week', current_date)::date + 7
        group by a.navn, a.farge
      ) q
    ),
    'oppgaver', (
      select coalesce(jsonb_agg(jsonb_build_object('tittel', t.tittel, 'prioritet', t.prioritet) order by t.tittel), '[]'::jsonb)
      from tasks t where t.butikk_id = bid and not t.ferdig
    ),
    'bestillingar', (
      select coalesce(jsonb_agg(jsonb_build_object('kunde', o.kunde, 'vare', o.vare, 'status', o.status) order by o.dato desc), '[]'::jsonb)
      from orders o where o.butikk_id = bid and o.status <> 'henta'
    )
  ) end;
$$;
grant execute on function public.butikk_detalj(uuid) to authenticated;
