-- Manglande base-tabell-grants til authenticated.
--
-- ledige_vakter (vaktbørsen) og oppgave_rutinar (faste rutinar) hadde korrekte,
-- butikk-scoped RLS-policyar, men base-tabell-grantet til `authenticated` blei
-- aldri gitt i dei opphavlege migrasjonane. Utan grant nektar PostgREST alt med
-- «42501: permission denied» FØR RLS i det heile blir vurdert, så skriving (og
-- lesing) frå nettlesaren feila stille – vaktbørsen og rutinane var i praksis
-- brotne i produksjon.
--
-- RLS held fram med å avgrense til eigen butikk; eit grant opnar ikkje data
-- utover det policyane alt tillèt.
grant select, insert, update, delete on public.ledige_vakter to authenticated;
grant select, insert, update, delete on public.oppgave_rutinar to authenticated;
