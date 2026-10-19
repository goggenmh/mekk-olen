-- =====================================================================
-- FERIEPENGAR OG TIDLEGARE LØN I ÅR  – allereie køyrd i prod
-- =====================================================================
-- Like private som satsen: vanlege tilsette har ikkje lese-rett på
-- kolonnane (kolonnevise rettar frå lon-privat.sql); leiarar hentar dei via
-- lonsdata(), og den tilsette ser sine eigne via min_profil().
alter table public.ansatte
  add column if not exists feriepengesats numeric not null default 10.2 check (feriepengesats between 0 and 30),
  add column if not exists tidlegare_ar int check (tidlegare_ar between 2000 and 2100),
  add column if not exists tidlegare_mekk numeric not null default 0 check (tidlegare_mekk >= 0),
  add column if not exists tidlegare_andre numeric not null default 0 check (tidlegare_andre >= 0);

comment on column public.ansatte.tidlegare_ar is 'Året tidlegare_mekk/tidlegare_andre gjeld for.';
comment on column public.ansatte.tidlegare_mekk is 'Løn frå MEKK i tidlegare_ar før appen (utan feriepengar). Tel for frikort og feriepengar.';
comment on column public.ansatte.tidlegare_andre is 'Anna skattbar inntekt i tidlegare_ar (andre arbeidsgivarar, utbetalte feriepengar o.l.). Tel berre for frikort.';

-- Ny utgåve av lonssatsar() med alle private lønsfelt. (lonssatsar() kan
-- ikkje få nye kolonnar utan drop, så appen går over til denne.)
create or replace function public.lonsdata()
returns table (
  id text, sats numeric, skattetype text, skatteprosent numeric, frikortgrense numeric,
  feriepengesats numeric, tidlegare_ar int, tidlegare_mekk numeric, tidlegare_andre numeric
)
language sql security definer stable set search_path = public as $$
  select a.id, a.sats, a.skattetype, a.skatteprosent, a.frikortgrense,
         a.feriepengesats, a.tidlegare_ar, a.tidlegare_mekk, a.tidlegare_andre
  from public.ansatte a
  where a.butikk_id = public.min_butikk()
    and (public.is_active_leder() or public.er_konsern_admin());
$$;
revoke execute on function public.lonsdata() from public, anon;
grant execute on function public.lonsdata() to authenticated;
