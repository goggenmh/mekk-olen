-- =====================================================================
-- FASE 5 – TRYGG, ØKT-UAVHENGIG INNLOGGINGS-LISTE
-- =====================================================================
-- Trygt å køyre (og køyre om att).
--
-- Problem: innloggings-skjermen las heile ansatte-tabellen som «anon».
-- Låg det att ei foreldrelaus økt i nettlesaren, blei lesinga i staden
-- avgrensa av RLS (0 rader) → «0 tilsette» på butikk-flisene.
-- I tillegg kunne kven som helst (anon) lese LØN, e-post og telefon på
-- alle tilsette i alle butikkar.
--
-- Løysing: ein SECURITY DEFINER-funksjon som gir berre dei felta
-- innlogginga treng (namn, initial, e-post) – aldri løn – og som er
-- upåverka av økt-tilstand. Så fjernar vi anon si direkte lese-tilgang
-- til ansatte-tabellen.
-- =====================================================================

create or replace function public.login_ansatte()
returns table (
  id text,
  navn text,
  rolle text,
  init text,
  farge text,
  email text,
  leder boolean,
  aktiv boolean,
  butikk_id uuid,
  konsern_admin boolean
)
language sql security definer stable set search_path = public as $$
  select a.id, a.navn, a.rolle, a.init, a.farge,
         a.email, a.leder, a.aktiv, a.butikk_id, a.konsern_admin
  from public.ansatte a
  where a.aktiv
  order by a.navn;
$$;
grant execute on function public.login_ansatte() to anon, authenticated;

-- Anon treng ikkje lenger lese heile tabellen (med løn/telefon).
drop policy if exists "anon_select_ansatte" on ansatte;
