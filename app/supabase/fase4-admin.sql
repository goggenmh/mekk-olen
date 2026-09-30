-- =====================================================================
-- FASE 4 – RIKARE KONSERN-OVERSIKT + BUTIKK-DETALJ
-- =====================================================================
-- Trygt å køyre (og å køyre om att). Utvidar dei to RPC-ane som matar
-- admin-dashboardet med fleire tal: trend mot førre veke, høg-prio
-- oppgåver, leiar-namn, kven som er på vakt, og full tilsett-liste per
-- butikk. Begge er SECURITY DEFINER og gir berre data til ein
-- konsern-admin.
-- =====================================================================

-- 1) KONSERN-OVERSIKT (ei rad per butikk) ----------------------------
drop function if exists public.konsern_oversikt();
create or replace function public.konsern_oversikt()
returns table (
  butikk uuid,
  namn text,
  farge text,
  tilsette bigint,
  timar_veka numeric,
  timar_forrige numeric,
  til_godkjenning bigint,
  opne_oppgaver bigint,
  hoyprio_oppgaver bigint,
  aktive_bestillingar bigint,
  vakter_i_dag bigint,
  leiar text,
  vakt_folk jsonb
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
    coalesce((
      select sum(extract(epoch from (te.slutt::time - te.start::time)) / 3600.0 - coalesce(te.pause, 0) / 60.0)
      from time_entries te
      where te.butikk_id = b.id
        and te.date::date >= date_trunc('week', current_date)::date - 7
        and te.date::date <  date_trunc('week', current_date)::date
    ), 0),
    (select count(*) from time_entries te2 where te2.butikk_id = b.id and te2.status = 'venter'),
    (select count(*) from tasks t where t.butikk_id = b.id and not t.ferdig),
    (select count(*) from tasks t where t.butikk_id = b.id and not t.ferdig and t.prioritet = 'høg'),
    (select count(*) from orders o where o.butikk_id = b.id and o.status <> 'henta'),
    (select count(*) from shifts s where s.butikk_id = b.id and s.date::date = current_date),
    (select a.navn from ansatte a where a.butikk_id = b.id and a.leder and a.aktiv order by a.navn limit 1),
    coalesce((
      select jsonb_agg(jsonb_build_object('init', a.init, 'farge', a.farge) order by s.start)
      from shifts s join ansatte a on a.id = s.ansatt
      where s.butikk_id = b.id and s.date::date = current_date
    ), '[]'::jsonb)
  from butikkar b
  where public.er_konsern_admin()
  order by b.namn;
$$;
grant execute on function public.konsern_oversikt() to authenticated;

-- 2) BUTIKK-DETALJ (drill-inn i éin butikk) --------------------------
create or replace function public.butikk_detalj(bid uuid)
returns jsonb
language sql security definer stable set search_path = public as $$
  select case when not public.er_konsern_admin() then jsonb_build_object() else jsonb_build_object(
    'namn', (select namn from butikkar where id = bid),
    'farge', (select farge from butikkar where id = bid),
    'leiar', (select navn from ansatte where butikk_id = bid and leder and aktiv order by navn limit 1),
    'tal_tilsette', (select count(*) from ansatte where butikk_id = bid and aktiv),
    'timar_veka', coalesce((
      select sum(extract(epoch from (te.slutt::time - te.start::time)) / 3600.0 - coalesce(te.pause, 0) / 60.0)
      from time_entries te
      where te.butikk_id = bid
        and te.date::date >= date_trunc('week', current_date)::date
        and te.date::date <  date_trunc('week', current_date)::date + 7
    ), 0),
    'til_godkjenning', (select count(*) from time_entries where butikk_id = bid and status = 'venter'),
    'paa_vakt_i_dag', (select count(*) from shifts where butikk_id = bid and date::date = current_date),
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
      select coalesce(jsonb_agg(jsonb_build_object('tittel', t.tittel, 'prioritet', t.prioritet) order by (t.prioritet = 'høg') desc, t.tittel), '[]'::jsonb)
      from tasks t where t.butikk_id = bid and not t.ferdig
    ),
    'bestillingar', (
      select coalesce(jsonb_agg(jsonb_build_object('kunde', o.kunde, 'vare', o.vare, 'status', o.status) order by o.dato desc), '[]'::jsonb)
      from orders o where o.butikk_id = bid and o.status <> 'henta'
    ),
    'tilsette', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'navn', a.navn, 'rolle', a.rolle, 'init', a.init, 'farge', a.farge,
        'leder', a.leder,
        'paa_vakt', exists (select 1 from shifts s where s.ansatt = a.id and s.date::date = current_date)
      ) order by a.leder desc, a.navn), '[]'::jsonb)
      from ansatte a where a.butikk_id = bid and a.aktiv
    )
  ) end;
$$;
grant execute on function public.butikk_detalj(uuid) to authenticated;
