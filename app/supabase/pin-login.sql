-- =====================================================================
-- PIN-INNLOGGING VIA SERVAREN (pin-login)  – allereie køyrd i prod
-- =====================================================================
-- Sperre og overgangsstatus per tilsett. Berre service role (edge-funksjonar)
-- har tilgang: RLS er på og det finst ingen policyar.
create table if not exists public.innlogging_status (
  ansatt_id text primary key references public.ansatte(id) on delete cascade,
  v2 boolean not null default false,
  feil int not null default 0,
  laast_til timestamptz
);
alter table public.innlogging_status enable row level security;

-- Innloggings-lista utan e-post (namn/initial er nok til å velje seg sjølv).
create or replace function public.login_liste()
returns table (id text, navn text, rolle text, init text, farge text, leder boolean, aktiv boolean, butikk_id uuid)
language sql security definer stable set search_path = public as $$
  select a.id, a.navn, a.rolle, a.init, a.farge, a.leder, a.aktiv, a.butikk_id
  from public.ansatte a
  where a.aktiv
  order by a.navn;
$$;
grant execute on function public.login_liste() to anon, authenticated;

-- Den innlogga brukaren sin eigen rad («kven er eg» utan e-postliste).
create or replace function public.min_profil()
returns setof public.ansatte
language sql security definer stable set search_path = public as $$
  select * from public.ansatte where email = auth.email() and aktiv limit 1;
$$;
grant execute on function public.min_profil() to authenticated;
