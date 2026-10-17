-- =====================================================================
-- KVEN LA INN BESTILLINGA  – allereie køyrd i prod
-- =====================================================================
-- Blir sett av databasen ut frå innlogga brukar, så det kan ikkje
-- forfalskast frå appen, og kan ikkje endrast etterpå.
alter table public.orders
  add column if not exists registrert_av text references public.ansatte(id) on delete set null;
create index if not exists orders_registrert_av_idx on public.orders (registrert_av);

create or replace function public.orders_set_registrert_av()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.registrert_av := coalesce(
      (select id from public.ansatte where email = auth.email() limit 1),
      new.registrert_av  -- t.d. import via service_role utan innlogga brukar
    );
  else
    new.registrert_av := old.registrert_av;
  end if;
  return new;
end $$;
revoke execute on function public.orders_set_registrert_av() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'orders_registrert_av') then
    create trigger orders_registrert_av before insert or update on public.orders
      for each row execute function public.orders_set_registrert_av();
  end if;
end $$;
