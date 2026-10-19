-- =====================================================================
-- LØN ER PRIVAT  – timesatsen er berre synleg for leiarar
-- =====================================================================
-- Før kunne alle innlogga i butikken lese `ansatte.sats` til kvarandre via
-- API-et. No får vanlege tilsette berre lese dei andre kolonnane; leiarar
-- (og konsern-admin) hentar satsane gjennom lonssatsar(). Eigen sats kjem
-- framleis med min_profil(). Edge-funksjonane brukar service_role og blir
-- ikkje påverka.
--
-- Rekkjefølgje: steg 1 kan køyrast når som helst. Steg 2 MÅ vente til
-- appversjonen som hentar kolonnane eksplisitt er ute (elles feilar
-- `select *` mot ansatte i den gamle appen).

-- Steg 1: satsar for leiarar i eigen butikk.
create or replace function public.lonssatsar()
returns table (id text, sats numeric)
language sql security definer stable set search_path = public as $$
  select a.id, a.sats
  from public.ansatte a
  where a.butikk_id = public.min_butikk()
    and (public.is_active_leder() or public.er_konsern_admin());
$$;
revoke execute on function public.lonssatsar() from public, anon;
grant execute on function public.lonssatsar() to authenticated;

-- Steg 2: steng lesing av sats-kolonna.
revoke select on public.ansatte from anon, authenticated;
grant select (id, navn, rolle, lonn, farge, init, email, telefon, leder, aktiv, created_at, butikk_id, konsern_admin)
  on public.ansatte to authenticated;
