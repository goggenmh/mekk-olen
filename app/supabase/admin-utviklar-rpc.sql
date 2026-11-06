-- Kryss-butikk admin-funksjonar for utviklar-/eigar-sida. Alle gated på
-- er_konsern_admin(). Butikk-styring går direkte mot butikkar-tabellen (RLS er
-- alt konsern-gated); desse dekkjer oversikt, tilsett-lesing og rolle-/butikk-
-- styring på tvers, som RLS-en på ansatte ikkje gir konsern-admin lesetilgang til.

create or replace function public.admin_oversikt()
returns table(butikkar bigint, butikkar_aktive bigint, tilsette bigint, tilsette_aktive bigint, leiarar bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.er_konsern_admin() then raise exception 'Berre konsern-admin.'; end if;
  return query select
    (select count(*) from public.butikkar),
    (select count(*) from public.butikkar where aktiv),
    (select count(*) from public.ansatte),
    (select count(*) from public.ansatte where aktiv),
    (select count(*) from public.ansatte where leder and aktiv);
end $$;
revoke all on function public.admin_oversikt() from public, anon;
grant execute on function public.admin_oversikt() to authenticated;

create or replace function public.admin_tilsette()
returns table(id text, navn text, rolle text, butikk_id uuid, butikk text, leder boolean, konsern_admin boolean, aktiv boolean)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.er_konsern_admin() then raise exception 'Berre konsern-admin.'; end if;
  return query
    select a.id, a.navn, a.rolle, a.butikk_id, b.namn, a.leder, a.konsern_admin, a.aktiv
    from public.ansatte a left join public.butikkar b on b.id = a.butikk_id
    order by a.aktiv desc, b.namn nulls first, a.navn;
end $$;
revoke all on function public.admin_tilsette() from public, anon;
grant execute on function public.admin_tilsette() to authenticated;

create or replace function public.admin_sett_rolle(p_id text, p_leder boolean, p_konsern boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.er_konsern_admin() then raise exception 'Berre konsern-admin.'; end if;
  -- Hindra at ein tek konsern-admin frå seg sjølv (unngå å låse seg ute).
  if p_id = (select id from public.ansatte where email = auth.email()) and p_konsern is false then
    raise exception 'Du kan ikkje fjerne konsern-admin frå deg sjølv.';
  end if;
  update public.ansatte
     set leder = coalesce(p_leder, leder),
         konsern_admin = coalesce(p_konsern, konsern_admin)
   where id = p_id;
end $$;
revoke all on function public.admin_sett_rolle(text, boolean, boolean) from public, anon;
grant execute on function public.admin_sett_rolle(text, boolean, boolean) to authenticated;

create or replace function public.admin_flytt_butikk(p_id text, p_butikk uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.er_konsern_admin() then raise exception 'Berre konsern-admin.'; end if;
  if p_butikk is not null and not exists (select 1 from public.butikkar where id = p_butikk) then
    raise exception 'Ukjend butikk.';
  end if;
  update public.ansatte set butikk_id = p_butikk where id = p_id;
end $$;
revoke all on function public.admin_flytt_butikk(text, uuid) from public, anon;
grant execute on function public.admin_flytt_butikk(text, uuid) to authenticated;
