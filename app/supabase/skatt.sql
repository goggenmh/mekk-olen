-- =====================================================================
-- SKATT PER TILSETT  – frikort / skattekort (prosenttrekk)
-- =====================================================================
-- Skatteopplysningar er like private som timesatsen: vanlege tilsette får
-- ikkje lese kolonnane (dei er ikkje med i lese-rettane frå lon-privat.sql).
-- Leiarar hentar dei gjennom lonssatsar(), og lagrar dei som før via
-- update på ansatte (som berre leiarar har lov til, sjå RLS).

alter table public.ansatte
  add column if not exists skattetype text check (skattetype in ('skattekort', 'frikort')),
  add column if not exists skatteprosent numeric check (skatteprosent between 0 and 60),
  add column if not exists frikortgrense numeric check (frikortgrense >= 0);

-- lonssatsar() får nye kolonnar i svaret, så ho må lagast på nytt.
drop function if exists public.lonssatsar();
create function public.lonssatsar()
returns table (id text, sats numeric, skattetype text, skatteprosent numeric, frikortgrense numeric)
language sql security definer stable set search_path = public as $$
  select a.id, a.sats, a.skattetype, a.skatteprosent, a.frikortgrense
  from public.ansatte a
  where a.butikk_id = public.min_butikk()
    and (public.is_active_leder() or public.er_konsern_admin());
$$;
revoke execute on function public.lonssatsar() from public, anon;
grant execute on function public.lonssatsar() to authenticated;
