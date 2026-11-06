-- Per-butikk nøkkeltal for utviklar-sida (innsikt på tvers). Konsern-gated.
-- Konsern-admin kan ikkje lese andre butikkar sine bestillingar/utleige via RLS,
-- så dette gir tala samla på serveren.
create or replace function public.admin_butikk_innsikt()
returns table(butikk_id uuid, butikk text, aktiv boolean, tilsette bigint, bestillingar bigint, utleige bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.er_konsern_admin() then raise exception 'Berre konsern-admin.'; end if;
  return query
    select b.id, b.namn, b.aktiv,
      (select count(*) from public.ansatte a where a.butikk_id = b.id and a.aktiv),
      (select count(*) from public.orders o where o.butikk_id = b.id and o.status <> 'henta'),
      (select count(*) from public.utleige_reservasjon r where r.butikk_id = b.id and r.status in ('ny','stadfesta','klar','utleigd','forseinka'))
    from public.butikkar b
    order by b.namn;
end $$;
revoke all on function public.admin_butikk_innsikt() from public, anon;
grant execute on function public.admin_butikk_innsikt() to authenticated;
