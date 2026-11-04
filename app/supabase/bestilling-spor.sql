-- Offentleg sporing av bestilling.
--
-- Kunden får ei lenkje (…/spor/<id>) i SMS-en og kan følgje bestillinga
-- (Ny → Bestilt → Komen → Henta) utan innlogging. Funksjonen returnerer berre
-- eit minimum av ikkje-sensitive felt – aldri telefon, notat, pris eller kven
-- som la inn. Sjølve bestillings-id-en (uuid, uråkeleg) er nøkkelen.
--
-- Additiv endring: ingen tabell eller data blir endra.

create or replace function public.bestilling_status(p_id uuid)
returns table(vare text, status text, dato date, butikk text)
language sql
security definer
set search_path = public
as $$
  select o.vare, o.status, o.dato, b.namn
  from public.orders o
  left join public.butikkar b on b.id = o.butikk_id
  where o.id = p_id;
$$;

revoke all on function public.bestilling_status(uuid) from public;
grant execute on function public.bestilling_status(uuid) to anon, authenticated;
