-- =====================================================================
-- OPPGÅVER: kven oppretta og kven fullførte  – køyrd i prod
-- =====================================================================
-- Blir sett av databasen ut frå innlogga brukar, så det kan ikkje
-- forfalskast frå appen.
alter table public.tasks
  add column if not exists oppretta_av text references public.ansatte(id) on delete set null,
  add column if not exists oppretta_at timestamptz not null default now(),
  add column if not exists ferdig_av text references public.ansatte(id) on delete set null,
  add column if not exists ferdig_at timestamptz;
create index if not exists tasks_ferdig_at_idx on public.tasks (ferdig_at);

create or replace function public.tasks_set_spor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meg text := (select id from public.ansatte where email = auth.email() limit 1);
begin
  if tg_op = 'INSERT' then
    new.oppretta_av := coalesce(meg, new.oppretta_av);
    new.oppretta_at := now();
    if new.ferdig then new.ferdig_av := meg; new.ferdig_at := now(); end if;
  else
    new.oppretta_av := old.oppretta_av;
    new.oppretta_at := old.oppretta_at;
    if new.ferdig and not old.ferdig then
      new.ferdig_av := meg; new.ferdig_at := now();
    elsif not new.ferdig then
      new.ferdig_av := null; new.ferdig_at := null;
    else
      new.ferdig_av := old.ferdig_av; new.ferdig_at := old.ferdig_at;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.tasks_set_spor() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tasks_spor') then
    create trigger tasks_spor before insert or update on public.tasks
      for each row execute function public.tasks_set_spor();
  end if;
end $$;
create index if not exists tasks_oppretta_av_idx on public.tasks (oppretta_av);
create index if not exists tasks_ferdig_av_idx on public.tasks (ferdig_av);
