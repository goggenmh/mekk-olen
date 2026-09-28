-- Legg dei ferdige MEKK-dokumenta inn i dokument-modulen.
--
-- VIKTIG: PDF-ane ligg no i den PRIVATE storage-bøtta «docs» (ikkje offentleg).
-- Før du køyrer dette:
--   1) Supabase → Storage → lag/opne bøtta «docs» og sjå til at ho er PRIVAT.
--   2) Last opp desse 5 filene til rota av bøtta (finst i app/supabase/docs-seed/):
--      hms-handbok.pdf, opning-stenging.pdf, kassarutine.pdf,
--      varemottak.pdf, brann-forstehjelp.pdf
--   3) Køyr denne fila i Supabase → SQL Editor → Run.
--
-- fil_url held no storage-STIEN (ikkje ein URL). Appen opnar dokumentet via ei
-- signert, tidsavgrensa lenke som krev innlogging.

-- Rett opp gamle seed-rader som peikte på den offentlege /docs/-stien.
update docs set fil_url = 'hms-handbok.pdf'        where tittel = 'HMS-handbok'                    and fil_url = '/docs/hms-handbok.pdf';
update docs set fil_url = 'opning-stenging.pdf'    where tittel = 'Opnings- og stengerutine'       and fil_url = '/docs/opning-stenging.pdf';
update docs set fil_url = 'kassarutine.pdf'        where tittel = 'Kassarutine'                     and fil_url = '/docs/kassarutine.pdf';
update docs set fil_url = 'varemottak.pdf'         where tittel = 'Varemottak-rutine'               and fil_url = '/docs/varemottak.pdf';
update docs set fil_url = 'brann-forstehjelp.pdf'  where tittel = 'Brann- og førstehjelpsinstruks'  and fil_url = '/docs/brann-forstehjelp.pdf';

-- Ferske installasjonar: legg inn dokumenta om dei ikkje finst (idempotent).
insert into docs (tittel, kategori, notat, dato, fil_url, fil_namn)
select v.tittel, v.kategori, v.notat, v.dato::date, v.fil_url, v.fil_namn
from (values
  ('HMS-handbok', 'HMS',
   'Systematisk HMS-arbeid: ansvar, tryggleik i butikk og lager, kjemikaliar, ulukker, brann og avvik.',
   '2026-09-12', 'hms-handbok.pdf', 'HMS-handbok.pdf'),
  ('Opnings- og stengerutine', 'Rutine',
   'Steg-for-steg for opning, gjennom dagen og stenging av butikken.',
   '2026-09-12', 'opning-stenging.pdf', 'Opnings- og stengerutine.pdf'),
  ('Kassarutine', 'Rutine',
   'Rutine ved kassa, betaling, dagsoppgjer og tryggleik.',
   '2026-09-12', 'kassarutine.pdf', 'Kassarutine.pdf'),
  ('Varemottak-rutine', 'Rutine',
   'Mottak, kontroll, registrering, prising og plassering av varer.',
   '2026-09-12', 'varemottak.pdf', 'Varemottak-rutine.pdf'),
  ('Brann- og førstehjelpsinstruks', 'HMS',
   'Kva du gjer ved brann og skade, slokkeutstyr og viktige naudnummer.',
   '2026-09-12', 'brann-forstehjelp.pdf', 'Brann- og førstehjelpsinstruks.pdf')
) as v(tittel, kategori, notat, dato, fil_url, fil_namn)
where not exists (select 1 from docs d where d.tittel = v.tittel);
