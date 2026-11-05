-- Lager-søk for den interne MEKK-appen.
--
-- Sjølve lageret (skjema «lager»: products, stock, locations, events) + skanning
-- og registrering ligg i det eigne Lagerkontroll-systemet. Denne funksjonen er
-- ei les-berre bru så innlogga tilsette kan slå opp beholdning frå MEKK-appen
-- utan at heile lager-skjemaet blir opna for klienten (SECURITY DEFINER), og
-- berre når dei faktisk er innlogga som aktiv tilsett.
--
-- Trigram (pg_trgm): søket toler no skrivefeil og variantar («muter» → «Mutter»,
-- «nokkelmerke» → «Nøkkelmerke»). Både denne sida og «Vare»-autofullføringa på
-- bestilling brukar funksjonen, så begge blir typo-tolerante. GIN-indeksen gjer
-- likskaps-/ilike-søket raskt sjølv på 40k+ varer.

create extension if not exists pg_trgm;

create index if not exists products_name_trgm on lager.products using gin (name gin_trgm_ops);

create or replace function public.lager_sok(p_q text)
returns table(nr text, namn text, strekkode text, eining text, total bigint, plassar jsonb)
language plpgsql security definer set search_path = public, lager as $$
declare s text := nullif(btrim(p_q), '');
begin
  if not exists (select 1 from public.ansatte a where a.email = auth.email() and a.aktiv) then
    raise exception 'Ingen tilgang.';
  end if;
  if s is null then return; end if;
  return query
    select p.nr, p.name, p.barcode, p.unit,
      coalesce(sum(st.qty), 0)::bigint,
      coalesce(
        jsonb_agg(jsonb_build_object('plass', l.code, 'tal', st.qty) order by l.code)
          filter (where st.qty is not null and st.qty <> 0),
        '[]'::jsonb)
    from lager.products p
    left join lager.stock st on st.product_nr = p.nr
    left join lager.locations l on l.id = st.location_id
    where p.active
      and (p.name ilike '%' || s || '%' or p.nr ilike '%' || s || '%'
           or p.barcode = s or p.barcode ilike s || '%'
           or p.name % s)
    group by p.nr, p.name, p.barcode, p.unit
    -- Strekkode-treff fyrst, så eksakte delstreng-treff, så beste trigram-likskap.
    order by (p.barcode = s) desc,
             (p.name ilike '%' || s || '%') desc,
             similarity(p.name, s) desc,
             p.name
    limit 50;
end $$;
revoke all on function public.lager_sok(text) from public, anon;
grant execute on function public.lager_sok(text) to authenticated;
