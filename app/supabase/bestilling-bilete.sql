-- Produktbilete på bestillingar.
--
-- `bilde` held URL-en til produktbiletet som edge-funksjonen `lenke-bilete`
-- plukkar ut frå produktlenka (og:image). Blir sett automatisk når ei
-- bestilling med lenke blir lagra, og etterfylt når ei eldre bestilling med
-- lenke blir opna. RLS på orders dekkjer kolonna som alle andre felt.

alter table public.orders add column if not exists bilde text;
