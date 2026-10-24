-- Handlekorg: fleire varer i éi bestilling.
--
-- Kvar vare blir framleis si eiga reservasjon (sperre mot dobbeltbooking, pris
-- og livssyklus er uendra), men reservasjonane deler ein gruppe_id slik at dei
-- høyrer saman. Den offentlege funksjonen utleige_send_korg opprettar alle i
-- éin transaksjon (alt-eller-ingenting): manglar éi vare ledig eining, blir
-- heile bestillinga avvist med namnet på varen.

alter table public.utleige_reservasjon add column if not exists gruppe_id uuid;
create index if not exists utleige_reservasjon_gruppe_idx
  on public.utleige_reservasjon (gruppe_id) where gruppe_id is not null;

create or replace function public.utleige_send_korg(
  p_produkt uuid[], p_start timestamptz, p_slutt timestamptz,
  p_namn text, p_telefon text, p_epost text, p_melding text, p_vilkar boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  tlf text := regexp_replace(coalesce(p_telefon,''),'[^0-9+]','','g');
  epost text := lower(trim(coalesce(p_epost,'')));
  namn text := trim(coalesce(p_namn,''));
  prod uuid; p record; i record; butikk uuid; kunde uuid; gruppe uuid := gen_random_uuid();
  eining uuid; pris jsonb; res record;
  liste jsonb := '[]'::jsonb; sum numeric := 0; unike uuid[];
begin
  if p_produkt is null or array_length(p_produkt,1) is null then raise exception 'Handlekorga er tom.'; end if;
  if array_length(p_produkt,1) > 10 then raise exception 'For mange varer i éi bestilling.'; end if;
  select array_agg(distinct x) into unike from unnest(p_produkt) x;

  if length(namn) < 2 or length(namn) > 100 then raise exception 'Skriv inn namnet ditt.'; end if;
  if length(regexp_replace(tlf,'\D','','g')) not between 8 and 15 then raise exception 'Skriv inn eit gyldig telefonnummer.'; end if;
  if epost !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(epost) > 200 then raise exception 'Skriv inn ei gyldig e-postadresse.'; end if;
  if not coalesce(p_vilkar,false) then raise exception 'Du må godta leigevilkåra.'; end if;
  if p_start < now() - interval '1 hour' then raise exception 'Starttida har vore.'; end if;
  if p_slutt <= p_start then raise exception 'Sluttid må vere etter starttid.'; end if;
  if p_start > now() + interval '1 year' then raise exception 'Du kan ikkje bestille så langt fram.'; end if;
  if (select count(*) from public.utleige_reservasjon r join public.utleige_kunde k on k.id=r.kunde_id
      where k.telefon=tlf and r.status='ny') >= 10 then
    raise exception 'Du har alt fleire opne førespurnader. Ta kontakt med butikken.';
  end if;

  select p2.butikk_id into butikk from public.utleige_produkt p2 where p2.id = unike[1] and p2.aktiv;
  if butikk is null then raise exception 'Produktet finst ikkje.'; end if;
  select * into i from public.utleige_innstillingar where butikk_id = butikk and offentleg;
  if i is null then raise exception 'Utleige er ikkje opna for denne butikken.'; end if;
  if p_slutt - p_start > make_interval(days => i.maks_dagar) then raise exception 'Lengste leigeperiode er % dagar.', i.maks_dagar; end if;

  insert into public.utleige_kunde (butikk_id, namn, telefon, epost)
  values (butikk, namn, tlf, epost)
  on conflict (butikk_id, telefon) do update set namn=excluded.namn, epost=excluded.epost
  returning id into kunde;

  foreach prod in array unike loop
    select * into p from public.utleige_produkt where id = prod and aktiv and butikk_id = butikk;
    if p is null then raise exception 'Eitt av produkta finst ikkje.'; end if;
    perform pg_advisory_xact_lock(hashtext(prod::text));
    select e.id into eining from public.utleige_eining e
      where e.produkt_id = prod and public.utleige_eining_ledig(e.id, p_start, p_slutt)
      order by e.kode limit 1;
    if eining is null then raise exception '% er ikkje ledig i perioden. Fjern varen eller vel andre datoar.', p.namn; end if;
    pris := public.utleige_pris(prod, p_start, p_slutt);
    insert into public.utleige_reservasjon (butikk_id, produkt_id, eining_id, kunde_id, start, slutt, status,
      pris_leige, gebyr, depositum, pris_total, kunde_melding, vilkar_godtatt_at, gruppe_id)
    values (butikk, prod, eining, kunde, p_start, p_slutt, 'ny',
      (pris->>'leige')::numeric, (pris->>'gebyr')::numeric, (pris->>'depositum')::numeric, (pris->>'total')::numeric,
      left(coalesce(p_melding,''),1000), now(), gruppe)
    returning * into res;
    liste := liste || jsonb_build_object('nummer', res.nummer, 'produkt', p.namn, 'total', res.pris_total, 'depositum', res.depositum);
    sum := sum + res.pris_total;
  end loop;

  return jsonb_build_object('gruppe', gruppe, 'varer', liste, 'sum', sum);
exception
  when exclusion_violation then raise exception 'Noko vart nettopp booka av andre. Prøv igjen eller vel andre datoar.';
end $$;
revoke execute on function public.utleige_send_korg(uuid[], timestamptz, timestamptz, text, text, text, text, boolean) from public;
grant execute on function public.utleige_send_korg(uuid[], timestamptz, timestamptz, text, text, text, text, boolean) to anon, authenticated;
