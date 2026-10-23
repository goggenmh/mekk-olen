-- Svarfrist for ubehandla 'ny'-førespurnader (konfigurerbar, standard 48 t).
-- Ein ubehandla førespurnad held av eininga; utan ein frist ville han blokkere
-- maskina for alltid. No går han ut automatisk etter svarfristen.
--
-- Køyrd i prod 2026-10-23.

alter table public.utleige_innstillingar
  add column if not exists svarfrist_timar int not null default 48
  check (svarfrist_timar between 1 and 336);

-- Timejobben (utleige-paaminningar, kvar time via pg_cron): i tillegg til
-- forseinka/påminningar, la ubehandla 'ny'-førespurnader eldre enn svarfristen
-- gå ut. Dei blir sette til 'avslatt' (terminal → frigjer eininga via exclusion-
-- constrainten utleige_ingen_overlapp), og statusendringa sender automatisk
-- e-post til kunden via utleige_res_epost-triggeren.
create or replace function public.utleige_paaminningar()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    update public.utleige_reservasjon res set
      status = 'avslatt',
      internt_notat = trim(both E'\n' from coalesce(res.internt_notat, '') || E'\nAutomatisk avslått: ubehandla innan svarfristen.')
    from public.utleige_innstillingar i
    where res.status = 'ny' and i.butikk_id = res.butikk_id
      and res.created_at < now() - make_interval(hours => i.svarfrist_timar)
    returning res.id loop
    n := n + 1;
  end loop;

  for r in update public.utleige_reservasjon set status = 'forseinka'
            where status = 'utleigd' and slutt < now() returning id loop
    perform public.utleige_epost_lag(r.id, 'forseinka'); n := n + 1;
  end loop;
  for r in select id from public.utleige_reservasjon
            where status in ('stadfesta', 'klar') and start between now() and now() + interval '24 hours' loop
    perform public.utleige_epost_lag(r.id, 'paaminning_henting'); n := n + 1;
  end loop;
  for r in select id from public.utleige_reservasjon
            where status = 'utleigd' and slutt between now() and now() + interval '24 hours' loop
    perform public.utleige_epost_lag(r.id, 'paaminning_retur'); n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.utleige_paaminningar() from public, anon, authenticated;
