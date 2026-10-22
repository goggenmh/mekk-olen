-- =====================================================================
-- STATUS PÅ INNLOGGINGA  – kven er på vakt i dag
-- =====================================================================
-- Innloggingsskjermen viser «På vakt no», «Vakt 14:00» eller «Fri i dag»
-- ved kvar tilsett. Det skjer før innlogging, så funksjonen kan kallast
-- utan økt (som login_liste). Han gir berre dagens vakttider for aktive
-- tilsette – ingen timar, løn eller anna. Appen reknar status ut frå klokka.
-- Idempotent.

create or replace function public.login_status()
returns table(id text, start text, slutt text)
language sql stable security definer set search_path = public as $$
  select s.ansatt, s.start, s.slutt
  from public.shifts s
  join public.ansatte a on a.id = s.ansatt and a.aktiv
  where s.date = (now() at time zone 'Europe/Oslo')::date
  order by s.start;
$$;
revoke execute on function public.login_status() from public;
grant execute on function public.login_status() to anon, authenticated;
