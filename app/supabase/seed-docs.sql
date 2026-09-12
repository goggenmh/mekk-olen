-- Legg dei ferdige MEKK-dokumenta inn i dokument-modulen.
-- Filene ligg i app/public/docs/ og blir servert av nettsida på /docs/<fil>.
-- Idempotent: hoppar over dokument som allereie finst (matcha på tittel).
-- Køyr i Supabase → SQL Editor → New query → Run.

insert into docs (tittel, kategori, notat, dato, fil_url, fil_namn)
select v.tittel, v.kategori, v.notat, v.dato::date, v.fil_url, v.fil_namn
from (values
  ('HMS-handbok', 'HMS',
   'Systematisk HMS-arbeid: ansvar, tryggleik i butikk og lager, kjemikaliar, ulukker, brann og avvik.',
   '2026-09-12', '/docs/hms-handbok.pdf', 'HMS-handbok.pdf'),
  ('Opnings- og stengerutine', 'Rutine',
   'Steg-for-steg for opning, gjennom dagen og stenging av butikken.',
   '2026-09-12', '/docs/opning-stenging.pdf', 'Opnings- og stengerutine.pdf'),
  ('Kassarutine', 'Rutine',
   'Rutine ved kassa, betaling, dagsoppgjer og tryggleik.',
   '2026-09-12', '/docs/kassarutine.pdf', 'Kassarutine.pdf'),
  ('Varemottak-rutine', 'Rutine',
   'Mottak, kontroll, registrering, prising og plassering av varer.',
   '2026-09-12', '/docs/varemottak.pdf', 'Varemottak-rutine.pdf'),
  ('Brann- og førstehjelpsinstruks', 'HMS',
   'Kva du gjer ved brann og skade, slokkeutstyr og viktige naudnummer.',
   '2026-09-12', '/docs/brann-forstehjelp.pdf', 'Brann- og førstehjelpsinstruks.pdf')
) as v(tittel, kategori, notat, dato, fil_url, fil_namn)
where not exists (select 1 from docs d where d.tittel = v.tittel);
