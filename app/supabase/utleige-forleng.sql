-- Kunden kan be om forlenging av leigeperioden på «Mi side»; butikken godkjenner.
--
-- forleng_til = ønskt ny returtid (null = ingen open førespurnad). Kunden set
-- han via utleige_kunde_forleng (berre eigne reservasjonar, e-post-sjekka).
-- Butikken godkjenner i admin (set ny slutt + reknar prisen på nytt) eller
-- avslår (nullstiller forleng_til).

alter table public.utleige_reservasjon add column if not exists forleng_til timestamptz;

create or replace function public.utleige_kunde_forleng(p_res uuid, p_til timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if auth.email() is null then raise exception 'Du må vere innlogga.'; end if;
  select res.* into r from public.utleige_reservasjon res
    join public.utleige_kunde k on k.id = res.kunde_id
   where res.id = p_res and lower(k.epost) = lower(auth.email());
  if r is null then raise exception 'Fann ikkje reservasjonen.'; end if;
  if r.status not in ('stadfesta','klar','utleigd','forseinka') then
    raise exception 'Denne reservasjonen kan ikkje forlengast her. Ta kontakt med butikken.';
  end if;
  if p_til <= r.slutt then raise exception 'Ny returtid må vere etter den noverande.'; end if;
  if p_til > now() + interval '1 year' then raise exception 'Du kan ikkje forlenge så langt fram.'; end if;
  update public.utleige_reservasjon set forleng_til = p_til where id = p_res;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.utleige_kunde_forleng(uuid, timestamptz) from public, anon;
grant execute on function public.utleige_kunde_forleng(uuid, timestamptz) to authenticated;

-- utleige_mine_leige tek no med forleng_til og maks_dagar (sjå utleige.sql for
-- full definisjon; denne fila held berre endringa som gjeld forlenging).
