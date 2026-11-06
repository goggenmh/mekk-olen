-- Atomiske veke-operasjonar for vaktplanen.
--
-- «Fyll frå standardveke», «Kopier førre veke» og lagring av standardveke-malen
-- gjorde før slett-så-sett-inn frå nettlesaren, i to separate spørjingar. Feila
-- innsetjinga etter at slettinga gjekk gjennom (tapt samband, lukka fane,
-- valideringsfeil), stod veka att tom utan angre. Her blir slett + innsett gjort
-- i éin transaksjon på serveren, så anten blir alt gjort, eller ingenting.
--
-- SECURITY DEFINER går forbi RLS, så vi scope-ar sjølv til innloggar sin butikk
-- (min_butikk) og krev ein aktiv tilsett. Same mønster som dei andre funksjonane.

-- Fyll ei veke frå standardveke-malen. Klienten reknar ut skift-etiketten (same
-- kjelde som elles) og sender radene; vi erstattar veka (man–lau) atomisk.
create or replace function public.fyll_standardveke(p_veke date, p_rader jsonb)
returns setof public.shifts
language plpgsql security definer set search_path = public as $$
declare
  v_butikk uuid := public.min_butikk();
  v_dagar date[] := array[p_veke, p_veke + 1, p_veke + 2, p_veke + 3, p_veke + 4, p_veke + 5];
begin
  if v_butikk is null or not exists (select 1 from public.ansatte where email = auth.email() and aktiv) then
    raise exception 'Ingen tilgang.';
  end if;
  delete from public.shifts where butikk_id = v_butikk and date = any(v_dagar);
  return query
  insert into public.shifts (ansatt, date, start, slutt, skift, butikk_id)
  select r.ansatt, r.date, r.start, r.slutt, r.skift, v_butikk
  from jsonb_to_recordset(coalesce(p_rader, '[]'::jsonb))
    as r(ansatt text, date date, start text, slutt text, skift text)
  where r.date = any(v_dagar)
    and exists (select 1 from public.ansatte a where a.id = r.ansatt and a.butikk_id = v_butikk)
  returning *;
end $$;
revoke all on function public.fyll_standardveke(date, jsonb) from public, anon;
grant execute on function public.fyll_standardveke(date, jsonb) to authenticated;

-- Kopier alle vaktene frå éi veke til ei anna (erstattar målveka atomisk).
create or replace function public.kopier_veke(p_fra date, p_til date)
returns setof public.shifts
language plpgsql security definer set search_path = public as $$
declare
  v_butikk uuid := public.min_butikk();
  v_fra date[] := array[p_fra, p_fra + 1, p_fra + 2, p_fra + 3, p_fra + 4, p_fra + 5];
  v_til date[] := array[p_til, p_til + 1, p_til + 2, p_til + 3, p_til + 4, p_til + 5];
begin
  if v_butikk is null or not exists (select 1 from public.ansatte where email = auth.email() and aktiv) then
    raise exception 'Ingen tilgang.';
  end if;
  delete from public.shifts where butikk_id = v_butikk and date = any(v_til);
  return query
  insert into public.shifts (ansatt, date, start, slutt, skift, butikk_id)
  select s.ansatt, (p_til + (s.date - p_fra)), s.start, s.slutt, s.skift, v_butikk
  from public.shifts s
  where s.butikk_id = v_butikk and s.date = any(v_fra)
  returning *;
end $$;
revoke all on function public.kopier_veke(date, date) from public, anon;
grant execute on function public.kopier_veke(date, date) to authenticated;

-- Erstatt heile standardveke-malen for butikken atomisk.
create or replace function public.lagre_standardveke(p_rader jsonb)
returns setof public.standardveke
language plpgsql security definer set search_path = public as $$
declare
  v_butikk uuid := public.min_butikk();
begin
  if v_butikk is null or not exists (select 1 from public.ansatte where email = auth.email() and aktiv) then
    raise exception 'Ingen tilgang.';
  end if;
  delete from public.standardveke where butikk_id = v_butikk;
  return query
  insert into public.standardveke (ansatt, dag, start, slutt, butikk_id)
  select r.ansatt, r.dag, r.start, r.slutt, v_butikk
  from jsonb_to_recordset(coalesce(p_rader, '[]'::jsonb))
    as r(ansatt text, dag text, start text, slutt text)
  where exists (select 1 from public.ansatte a where a.id = r.ansatt and a.butikk_id = v_butikk)
  returning *;
end $$;
revoke all on function public.lagre_standardveke(jsonb) from public, anon;
grant execute on function public.lagre_standardveke(jsonb) to authenticated;
