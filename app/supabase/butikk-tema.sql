-- Personalisering per butikk: eiga merkevare (farge på toppstripe + knappar).
-- tema = { "navy": "#...", "lime": "#..." }. NULL = standard MEKK-tema.
-- Overstyrer berre dei to base-token-ane heile designet byggjer på, så resten av
-- fargesystemet (kontrast, pill-fargar osv.) held fram med å henge saman.
alter table public.butikkar add column if not exists tema jsonb;
