-- Kundeinnlogging for utleige ("Mi side"): kunden loggar inn med eingongskode
-- på e-post (Supabase Auth), og ser sine eigne reservasjonar.
--
-- IKKJE køyrd i prod enno. Køyr denne fila i Supabase (SQL Editor) når du vil ta
-- det i bruk, og slå på e-post-innlogging (sjå SETUP under appen). Kundar blir
-- vanlege auth-brukarar utan rad i `ansatte`, så dei kan ikkje sjå tilsett-data
-- (min_butikk()/er_konsern_admin() gir null for dei). Dei ser berre sine eigne
-- reservasjonar, via e-posten i økta.

create or replace function public.utleige_mine_leige()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(rad order by rad->>'start' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', r.id, 'nummer', r.nummer, 'status', r.status,
      'start', r.start, 'slutt', r.slutt,
      'pris_leige', r.pris_leige, 'gebyr', r.gebyr, 'depositum', r.depositum, 'pris_total', r.pris_total,
      'produkt_namn', p.namn, 'produkt_tilbehor', p.tilbehor, 'eining_kode', e.kode,
      'butikk', b.namn, 'vilkar', i.vilkar, 'kontakt_telefon', i.kontakt_telefon, 'kontakt_epost', i.kontakt_epost,
      'kunde_namn', k.namn, 'kunde_telefon', k.telefon, 'kunde_epost', k.epost
    ) as rad
    from public.utleige_reservasjon r
    join public.utleige_kunde k on k.id = r.kunde_id
    join public.utleige_produkt p on p.id = r.produkt_id
    left join public.utleige_eining e on e.id = r.eining_id
    join public.butikkar b on b.id = r.butikk_id
    left join public.utleige_innstillingar i on i.butikk_id = r.butikk_id
    where auth.email() is not null
      and lower(k.epost) = lower(auth.email())
  ) q;
$$;

revoke execute on function public.utleige_mine_leige() from public, anon;
grant execute on function public.utleige_mine_leige() to authenticated;

-- SETUP i Supabase for å ta dette i bruk:
--   1) Authentication → Providers → Email: «Enable Email provider» på, og slå på
--      «Email OTP» (eingongskode). I e-postmalen «Magic Link» legg inn koden med
--      {{ .Token }} så kunden kan skrive han inn i appen.
--   2) Project Settings → Authentication → SMTP: peik mot Resend (same som
--      utleige-epost brukar) for påliteleg levering i produksjon.
--   3) SMS kan leggjast til seinare (Authentication → Providers → Phone) når ein
--      betalt SMS-leverandør er sett opp; same «Mi side» kan då matche på telefon.
