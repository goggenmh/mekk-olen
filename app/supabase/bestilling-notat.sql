-- Eige notat-felt på bestillingar, så «Kunde» kan vere berre namnet
-- (t.d. «Liten fyr med lue» høyrer heime i notatet).
-- Køyr éin gong i Supabase → SQL Editor. Trygt å køyre på nytt.

alter table public.orders add column if not exists notat text not null default '';
