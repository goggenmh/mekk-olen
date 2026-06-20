-- Optional starter content — generic boilerplate docs, not required.
-- Run after schema.sql if you want a non-empty Dokument list to start from.

insert into docs (tittel, kategori, notat, dato) values
  ('HMS-handbok MEKK Ølen', 'HMS', 'Internkontroll, vernerunde og avvik.', current_date),
  ('Opningsrutine butikk', 'Rutine', 'Kasse, alarm, lys og skilt om morgonen.', current_date),
  ('Stengerutine', 'Rutine', 'Kasseoppgjer, lås og alarm ved stenging.', current_date);
