-- =====================================================================
-- DEMO-SEED – eksempel-butikkar med tal, så Konsern-oversikta ser levande ut
-- =====================================================================
-- Køyr éin gong i Supabase → SQL Editor → Run. Idempotent per butikk.
--
-- MERK: dei tilsette her er berre for TAL i oversikta – dei har ingen
-- innlogging (ingen Auth-konto). Du loggar inn som Georg (konsern-admin)
-- for å sjå oversikta. Slett alt att med demo-seed-cleanup nedst.
-- =====================================================================

do $$
declare
  bergen uuid;
  stavanger uuid;
  d date := current_date;
  mon date := date_trunc('week', current_date)::date;
begin
  -- Butikkar
  insert into butikkar (namn, farge) select 'MEKK Bergen', '#c8811a'
    where not exists (select 1 from butikkar where namn = 'MEKK Bergen');
  insert into butikkar (namn, farge) select 'MEKK Stavanger', '#6a5acd'
    where not exists (select 1 from butikkar where namn = 'MEKK Stavanger');
  select id into bergen from butikkar where namn = 'MEKK Bergen';
  select id into stavanger from butikkar where namn = 'MEKK Stavanger';

  -- ---------- MEKK Bergen ----------
  if not exists (select 1 from ansatte where butikk_id = bergen) then
    insert into ansatte (id, navn, rolle, init, email, leder, butikk_id) values
      ('demo-b1','Kari Nord','Butikksjef','KN','demo-b1@mekk.internal', true,  bergen),
      ('demo-b2','Ola Vik','Butikkmedarbeidar','OV','demo-b2@mekk.internal', false, bergen),
      ('demo-b3','Ine Haug','Butikkmedarbeidar','IH','demo-b3@mekk.internal', false, bergen),
      ('demo-b4','Per Sund','Lager','PS','demo-b4@mekk.internal', false, bergen),
      ('demo-b5','Mia Berg','Deltid','MB','demo-b5@mekk.internal', false, bergen)
    on conflict (id) do nothing;

    insert into shifts (ansatt, date, start, slutt, skift, butikk_id) values
      ('demo-b1', d, '09:00','17:00','Formiddag', bergen),
      ('demo-b2', d, '10:00','18:00','Formiddag', bergen),
      ('demo-b3', d, '15:00','21:00','Kveld', bergen);

    insert into time_entries (ansatt, date, start, slutt, pause, status, butikk_id) values
      ('demo-b1', mon,          '09:00','17:00', 30, 'godkjent', bergen),
      ('demo-b1', mon + 1,      '09:00','17:00', 30, 'godkjent', bergen),
      ('demo-b2', mon,          '10:00','18:00', 30, 'godkjent', bergen),
      ('demo-b2', mon + 1,      '10:00','16:00', 0,  'venter',   bergen),
      ('demo-b3', mon + 2,      '15:00','21:00', 0,  'venter',   bergen);

    insert into tasks (tittel, ansatt, butikk_id) values
      ('Fylle på skruer avd. 3','ufordelt', bergen),
      ('Telje opp kassa','demo-b1', bergen),
      ('Vaske inngangsparti','demo-b4', bergen);

    insert into orders (kunde, vare, dato, status, butikk_id) values
      ('Hansen','Bosch drill', d - 2, 'tinga', bergen),
      ('Lunde','Malingssett', d - 1, 'komen', bergen);
  end if;

  -- ---------- MEKK Stavanger ----------
  if not exists (select 1 from ansatte where butikk_id = stavanger) then
    insert into ansatte (id, navn, rolle, init, email, leder, butikk_id) values
      ('demo-s1','Tore Lie','Butikksjef','TL','demo-s1@mekk.internal', true,  stavanger),
      ('demo-s2','Siri Aas','Butikkmedarbeidar','SA','demo-s2@mekk.internal', false, stavanger),
      ('demo-s3','Jon Moe','Butikkmedarbeidar','JM','demo-s3@mekk.internal', false, stavanger),
      ('demo-s4','Eva Ryen','Deltid','ER','demo-s4@mekk.internal', false, stavanger)
    on conflict (id) do nothing;

    insert into shifts (ansatt, date, start, slutt, skift, butikk_id) values
      ('demo-s1', d, '09:00','15:00','Formiddag', stavanger),
      ('demo-s2', d, '14:00','21:00','Kveld', stavanger);

    insert into time_entries (ansatt, date, start, slutt, pause, status, butikk_id) values
      ('demo-s1', mon,     '09:00','15:00', 0,  'godkjent', stavanger),
      ('demo-s2', mon + 1, '14:00','21:00', 30, 'godkjent', stavanger),
      ('demo-s3', mon + 2, '09:00','17:00', 30, 'venter',   stavanger);

    insert into tasks (tittel, ansatt, butikk_id) values
      ('Bestille ny reol','ufordelt', stavanger),
      ('Rydde lager','demo-s3', stavanger);

    insert into orders (kunde, vare, dato, status, butikk_id) values
      ('Berge','Sirkelsag', d - 3, 'tinga', stavanger);
  end if;
end $$;

-- =====================================================================
-- OPPRYDDING – køyr dette for å fjerne alt demo-innhaldet igjen:
-- =====================================================================
-- do $$
-- declare b uuid;
-- begin
--   for b in select id from butikkar where namn in ('MEKK Bergen','MEKK Stavanger') loop
--     delete from time_entries where butikk_id = b;
--     delete from shifts where butikk_id = b;
--     delete from tasks where butikk_id = b;
--     delete from orders where butikk_id = b;
--     delete from ansatte where butikk_id = b;
--     delete from butikkar where id = b;
--   end loop;
-- end $$;
