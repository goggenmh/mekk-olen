-- =====================================================================
-- DAGLEG LEIAR: TIMAR FRÅ VAKTPLANEN  – automatisk timeføring
-- =====================================================================
-- Leiarar (ansatte.leder) får timane sine ført automatisk ut frå
-- vaktplanen, ferdig godkjende. Vaktplanen er fasit så lenge leiaren ikkje
-- har ført eller endra timane sjølv:
--   * Dagar med vakt og ingen eigne føringar → éi føring per vakt (auto).
--   * Blir vakta endra eller sletta, blir auto-føringane laga på nytt.
--   * Har leiaren sjølv ført eller retta timar ein dag, rører vi ikkje dagen
--     (appen set auto = false når ei føring blir endra).
-- Køyrer kvar kveld med pg_cron og ser 14 dagar bakover, så endringar i
-- vaktplanen i etterkant òg kjem med. Idempotent.

alter table public.time_entries add column if not exists auto boolean not null default false;

create or replace function public.for_leiartimar(p_fra date default null, p_til date default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  til date := coalesce(p_til, (now() at time zone 'Europe/Oslo')::date);
  fra date := coalesce(p_fra, til - 14);
  r record;
  n int := 0;
  c int;
begin
  -- Berre servaren (pg_cron / SQL Editor) eller ein leiar kan køyre han.
  if auth.uid() is not null and not public.kan_godkjenne() then
    raise exception 'Berre leiar kan føre leiartimar automatisk.';
  end if;

  for r in
    select distinct s.ansatt, s.date, s.butikk_id
    from public.shifts s
    join public.ansatte a on a.id = s.ansatt and a.leder and a.aktiv
    where s.date between fra and til
      and (auth.uid() is null or s.butikk_id = public.min_butikk())
    union
    -- Dagar med auto-føringar der vakta er borte, skal ryddast.
    select e.ansatt, e.date, e.butikk_id
    from public.time_entries e
    where e.auto and e.date between fra and til
      and (auth.uid() is null or e.butikk_id = public.min_butikk())
  loop
    -- Leiaren har ført/retta sjølv denne dagen: ikkje rør.
    continue when exists (
      select 1 from public.time_entries e
      where e.ansatt = r.ansatt and e.date = r.date and not e.auto
    );

    -- Er auto-føringane alt like vaktene, er det ingenting å gjere.
    continue when (
      select coalesce(array_agg(e.start || '-' || e.slutt order by e.start), '{}')
      from public.time_entries e where e.ansatt = r.ansatt and e.date = r.date and e.auto
    ) = (
      select coalesce(array_agg(s.start || '-' || s.slutt order by s.start), '{}')
      from public.shifts s where s.ansatt = r.ansatt and s.date = r.date
    );

    delete from public.time_entries e where e.ansatt = r.ansatt and e.date = r.date and e.auto;
    insert into public.time_entries (ansatt, date, start, slutt, pause, status, butikk_id, auto)
    select s.ansatt, s.date, s.start, s.slutt, 0, 'godkjent', s.butikk_id, true
    from public.shifts s where s.ansatt = r.ansatt and s.date = r.date;
    get diagnostics c = row_count;
    n := n + c;
  end loop;
  return n;
end $$;
revoke execute on function public.for_leiartimar(date, date) from public, anon;
grant execute on function public.for_leiartimar(date, date) to authenticated;

-- Kvar kveld kl. 23:30 vintertid / 00:30 sommartid (UTC 22:30).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('for-leiartimar', '30 22 * * *', 'select public.for_leiartimar()');
  end if;
end $$;
