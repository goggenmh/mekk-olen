-- Avbestillingsfrist + sjølvbetjent avbestilling for kunden på «Mi side».
-- Lukkar hòlet i #8: avbestillingsreglar blir no handheva på serveren.
--
-- Køyrd i prod 2026-10-23.

alter table public.utleige_innstillingar
  add column if not exists avbestillingsfrist_timar int not null default 24
  check (avbestillingsfrist_timar between 0 and 336);

-- Kunden kan avbestille si eiga reservasjon, men berre før avbestillingsfristen
-- og berre så lenge ho ikkje er utlevert. Regelen blir handheva her, ikkje i UI.
create or replace function public.utleige_kunde_avbestill(p_res uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r record; frist int;
begin
  if auth.email() is null then raise exception 'Du må vere innlogga.'; end if;
  select res.*, i.avbestillingsfrist_timar as frist
    into r
    from public.utleige_reservasjon res
    join public.utleige_kunde k on k.id = res.kunde_id
    left join public.utleige_innstillingar i on i.butikk_id = res.butikk_id
   where res.id = p_res and lower(k.epost) = lower(auth.email());
  if r is null then raise exception 'Fann ikkje reservasjonen.'; end if;
  if r.status not in ('ny', 'stadfesta', 'klar') then
    raise exception 'Denne reservasjonen kan ikkje avbestillast her. Ta kontakt med butikken.';
  end if;
  frist := coalesce(r.frist, 24);
  if now() > r.start - make_interval(hours => frist) then
    raise exception 'Fristen for å avbestille sjølv har gått ut (% timar før henting). Ta kontakt med butikken.', frist;
  end if;
  update public.utleige_reservasjon
     set status = 'avbestilt',
         internt_notat = trim(both E'\n' from coalesce(internt_notat, '') || E'\nAvbestilt av kunden på Mi side.')
   where id = p_res;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.utleige_kunde_avbestill(uuid) from public, anon;
grant execute on function public.utleige_kunde_avbestill(uuid) to authenticated;

-- «Mi side»-funksjonen utvida med avbestillingsfristen, så kunden ser kva som gjeld.
create or replace function public.utleige_mine_leige()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(rad order by rad->>'start' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', r.id, 'nummer', r.nummer, 'status', r.status,
      'start', r.start, 'slutt', r.slutt,
      'pris_leige', r.pris_leige, 'gebyr', r.gebyr, 'depositum', r.depositum, 'pris_total', r.pris_total,
      'produkt_namn', p.namn, 'produkt_tilbehor', p.tilbehor, 'eining_kode', e.kode,
      'butikk', b.namn, 'vilkar', i.vilkar, 'kontakt_telefon', i.kontakt_telefon, 'kontakt_epost', i.kontakt_epost,
      'avbestillingsfrist_timar', coalesce(i.avbestillingsfrist_timar, 24),
      'kunde_namn', k.namn, 'kunde_telefon', k.telefon, 'kunde_epost', k.epost
    ) as rad
    from public.utleige_reservasjon r
    join public.utleige_kunde k on k.id = r.kunde_id
    join public.utleige_produkt p on p.id = r.produkt_id
    left join public.utleige_eining e on e.id = r.eining_id
    join public.butikkar b on b.id = r.butikk_id
    left join public.utleige_innstillingar i on i.butikk_id = r.butikk_id
    where auth.email() is not null
      and lower(k.epost) = lower(auth.email())
  ) q;
$$;
revoke execute on function public.utleige_mine_leige() from public, anon;
grant execute on function public.utleige_mine_leige() to authenticated;
