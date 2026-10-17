-- =====================================================================
-- STRAM INN SECURITY DEFINER-FUNKSJONAR  – allereie køyrd i prod
-- =====================================================================
-- Funksjonar får EXECUTE til PUBLIC som standard, så anon arvar tilgangen.
-- Fjern den og gi tilgang berre der det trengst (Supabase advisor 0028/0029).

-- Konsern-restar som ikkje lenger blir brukte: stengde for alle.
revoke execute on function public.konsern_oversikt() from public, anon, authenticated;
revoke execute on function public.butikk_detalj(uuid) from public, anon, authenticated;

-- Intern trigger: treng ingen tilgang via API-et (triggerar køyrer uansett).
revoke execute on function public.set_butikk_id() from public, anon, authenticated;

-- Hjelpefunksjonar for RLS og «kven er eg»: berre for innlogga brukarar.
revoke execute on function public.min_profil() from public, anon;
revoke execute on function public.min_butikk() from public, anon;
revoke execute on function public.is_active_leder() from public, anon;
revoke execute on function public.er_konsern_admin() from public, anon;
grant execute on function public.min_profil() to authenticated;
grant execute on function public.min_butikk() to authenticated;
grant execute on function public.is_active_leder() to authenticated;
grant execute on function public.er_konsern_admin() to authenticated;

-- login_liste() er med vilje open for anon (innloggings-skjermen, berre namn).
-- innlogging_status har RLS utan policyar med vilje: berre service_role.
