-- Framdrift for «kom i gang»-rettleiaren på lager-sida.
--
-- Returnerer kor mange lagerplassar som er oppretta, kor mange varer som har
-- fått beholdning, og kor mange registreringar (hendingar) som er gjorde – så
-- dei tilsette ser tala vekse medan dei skannar inn lageret.
--
-- Les-berre bru (SECURITY DEFINER), berre for innlogga aktiv tilsett, same
-- mønster som lager_sok. Berre lager-skjemaet.
create or replace function public.lager_status()
returns table(plassar bigint, varer_med_beholdning bigint, hendingar bigint)
language plpgsql security definer set search_path = public, lager as $$
begin
  if not exists (select 1 from public.ansatte a where a.email = auth.email() and a.aktiv) then
    raise exception 'Ingen tilgang.';
  end if;
  return query select
    (select count(*) from lager.locations)::bigint,
    (select count(distinct st.product_nr) from lager.stock st where st.qty is not null and st.qty <> 0)::bigint,
    (select count(*) from lager.events)::bigint;
end $$;
revoke all on function public.lager_status() from public, anon;
grant execute on function public.lager_status() to authenticated;
