-- =====================================================================
-- OPPGÅVER v2  – ansvar, blokkering, aktivitet, bestillingar og rutinar
-- =====================================================================
-- * Oppgåver kan merkast som blokkerte med ein grunn («treng hjelp»).
-- * Oppgåver kan koplast til ei bestilling.
-- * Faste rutinar (opning, rydding, kontroll av utstyr …) som blir til
--   oppgåver automatisk på rett dag, med rett ansvarleg.
-- Krev at ferie-modul.sql og oppgaver-spor.sql er køyrde (kan_godkjenne(),
-- oppretta_av/oppretta_at/ferdig_av/ferdig_at og triggeren tasks_spor).
-- Idempotent: kan køyrast fleire gonger utan skade.

-- 1) Rutinar -----------------------------------------------------------
create table if not exists public.oppgave_rutinar (
  id uuid primary key default gen_random_uuid(),
  butikk_id uuid references public.butikkar(id) on delete cascade,
  tittel text not null,
  detalj text not null default '',
  kategori text not null default 'Butikk',
  prioritet text not null default 'medium' check (prioritet in ('høg', 'medium', 'låg')),
  -- Ein tilsett-id, 'ufordelt', 'opnar' (første vakt den dagen) eller
  -- 'stengjer' (vakta som sluttar sist).
  ansvar text not null default 'ufordelt',
  -- ISO-vekedagar (1 = måndag … 7 = søndag). Blir ikkje brukt når manadsdag er sett.
  dagar int[] not null default '{1,2,3,4,5,6}',
  -- Sett = kvar månad på denne dagen (31 = siste dag i månaden).
  manadsdag int check (manadsdag between 1 and 31),
  sjekkliste jsonb not null default '[]'::jsonb,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists oppgave_rutinar_butikk_id_idx on public.oppgave_rutinar (butikk_id);

drop trigger if exists set_butikk on public.oppgave_rutinar;
create trigger set_butikk before insert on public.oppgave_rutinar
  for each row execute function public.set_butikk_id();

alter table public.oppgave_rutinar enable row level security;
drop policy if exists "rutinar_les" on public.oppgave_rutinar;
drop policy if exists "rutinar_skriv" on public.oppgave_rutinar;
-- Alle i butikken ser rutinane; berre leiar/godkjennar kan endre dei.
create policy "rutinar_les" on public.oppgave_rutinar for select to authenticated
  using (butikk_id = public.min_butikk() or public.er_konsern_admin());
create policy "rutinar_skriv" on public.oppgave_rutinar for all to authenticated
  using ((public.kan_godkjenne() and butikk_id = public.min_butikk()) or public.er_konsern_admin())
  with check ((public.kan_godkjenne() and butikk_id = public.min_butikk()) or public.er_konsern_admin());

-- 2) Nye felt på oppgåver ---------------------------------------------
alter table public.tasks
  add column if not exists blokkert boolean not null default false,
  add column if not exists blokkert_grunn text not null default '',
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists rutine_id uuid references public.oppgave_rutinar(id) on delete set null;

-- Éi oppgåve per rutine per dag, sjølv om fleire opnar appen samtidig.
create unique index if not exists tasks_rutine_dag_idx on public.tasks (rutine_id, frist) where rutine_id is not null;
create index if not exists tasks_order_id_idx on public.tasks (order_id) where order_id is not null;

-- Utvidar sporinga frå oppgaver-spor.sql: rutineoppgåver har ingen opprettar,
-- og fullføring opphevar blokkering. Kven/når blir sett ut frå innlogga brukar.
create or replace function public.tasks_set_spor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meg text := (select id from public.ansatte where email = auth.email() limit 1);
begin
  if tg_op = 'INSERT' then
    new.oppretta_at := now();
    -- Rutineoppgåver har ingen «opprettar» (sjølv om ein tilsett sin app
    -- var den som fekk dei laga).
    if new.rutine_id is null then
      new.oppretta_av := coalesce(meg, new.oppretta_av);
    else
      new.oppretta_av := null;
    end if;
    if new.ferdig then
      new.ferdig_av := meg; new.ferdig_at := now();
    end if;
  else
    new.oppretta_at := old.oppretta_at;
    new.oppretta_av := old.oppretta_av;
    new.rutine_id := old.rutine_id;
    if not new.ferdig then
      new.ferdig_av := null; new.ferdig_at := null;
    elsif not old.ferdig then
      new.ferdig_av := coalesce(meg, new.ferdig_av); new.ferdig_at := now();
      new.blokkert := false;
    else
      new.ferdig_av := old.ferdig_av; new.ferdig_at := old.ferdig_at;
    end if;
  end if;
  if not new.blokkert then new.blokkert_grunn := ''; end if;
  return new;
end $$;
revoke execute on function public.tasks_set_spor() from public, anon, authenticated;

drop trigger if exists tasks_spor on public.tasks;
create trigger tasks_spor before insert or update on public.tasks
  for each row execute function public.tasks_set_spor();

-- 3) Lag dagens rutineoppgåver ----------------------------------------
-- Appen kallar denne når han blir opna (for eigen butikk). Køyrt utan
-- innlogga brukar (pg_cron / SQL Editor) gjeld han alle butikkar.
create or replace function public.lag_rutineoppgaver()
returns integer language plpgsql security definer set search_path = public as $$
declare
  dag date := (now() at time zone 'Europe/Oslo')::date;
  siste_i_mnd int := extract(day from (date_trunc('month', dag) + interval '1 month - 1 day'))::int;
  butikk uuid := public.min_butikk();
  r record;
  ansv text;
  n int := 0;
  c int;
begin
  if auth.uid() is not null and butikk is null then
    return 0;
  end if;

  for r in
    select * from public.oppgave_rutinar
    where aktiv
      and (auth.uid() is null or butikk_id = butikk)
      and case
        when manadsdag is not null then extract(day from dag)::int = least(manadsdag, siste_i_mnd)
        else extract(isodow from dag)::int = any (dagar)
      end
  loop
    ansv := r.ansvar;
    if ansv = 'opnar' then
      ansv := (select s.ansatt from public.shifts s where s.butikk_id = r.butikk_id and s.date = dag order by s.start asc limit 1);
    elsif ansv = 'stengjer' then
      ansv := (select s.ansatt from public.shifts s where s.butikk_id = r.butikk_id and s.date = dag order by s.slutt desc limit 1);
    end if;

    insert into public.tasks (butikk_id, tittel, detalj, prioritet, ansatt, frist, kategori, gjentak, sjekkliste, rutine_id)
    values (
      r.butikk_id, r.tittel, r.detalj, r.prioritet, coalesce(ansv, 'ufordelt'), dag, r.kategori, 'ingen',
      coalesce((select jsonb_agg(jsonb_build_object('tekst', p->>'tekst', 'ferdig', false)) from jsonb_array_elements(r.sjekkliste) p), '[]'::jsonb),
      r.id
    )
    on conflict (rutine_id, frist) where rutine_id is not null do nothing;
    get diagnostics c = row_count;
    n := n + c;
  end loop;
  return n;
end $$;
revoke execute on function public.lag_rutineoppgaver() from public, anon;
grant execute on function public.lag_rutineoppgaver() to authenticated;

-- 4) Live-oppdatering for rutinar -------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'oppgave_rutinar'
  ) then
    alter publication supabase_realtime add table public.oppgave_rutinar;
  end if;
end $$;

-- 5) Valfritt: tidsstyring med pg_cron --------------------------------
-- Utan dette blir rutineoppgåvene laga første gong nokon opnar appen den
-- dagen. Med pg_cron (Database → Extensions) blir dei laga kl. 05/06 om
-- morgonen, så dei òg ligg klare for dei som ikkje har opna appen enno.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lag-rutineoppgaver', '0 4 * * *', 'select public.lag_rutineoppgaver()');
  end if;
end $$;
