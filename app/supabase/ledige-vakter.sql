-- Vaktbørs (ledige vakter).
--
-- Leiar legg ut ei ledig vakt. Den fyrste som trykkjer «Eg tek henne» blir
-- ståande som teken_av, og leiar godkjenner. Ved godkjenning lagar appen ei
-- vanleg vakt (shifts) og slettar rada her.
--
-- Rein additiv endring: ny tabell med same butikk-scoping (set_butikk-trigger
-- + butikk_all-policy) som dei andre datatabellane (sjå multi-butikk.sql).
-- Rører ingen eksisterande tabell eller data.
create table if not exists public.ledige_vakter (
  id uuid primary key default gen_random_uuid(),
  butikk_id uuid not null references public.butikkar(id) on delete cascade,
  date date not null,
  start text not null,
  slutt text not null,
  skift text not null default '',
  grunn text,
  oppretta_av text not null references public.ansatte(id),
  teken_av text references public.ansatte(id),
  created_at timestamptz not null default now()
);

alter table public.ledige_vakter enable row level security;

create trigger set_butikk before insert on public.ledige_vakter
  for each row execute function public.set_butikk_id();

create policy "butikk_all" on public.ledige_vakter for all to authenticated
  using (butikk_id = public.min_butikk() or public.er_konsern_admin())
  with check (butikk_id = public.min_butikk() or public.er_konsern_admin());
