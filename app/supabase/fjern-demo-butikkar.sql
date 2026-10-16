-- =====================================================================
-- FJERN DEMO-BUTIKKANE (behald berre MEKK Ølen)
-- =====================================================================
-- Trygt å køyre. Slettar demo-butikkane Bergen og Stavanger med alle
-- demo-data (tilsette, vakter, timar, oppgåver, bestillingar). Ølen blir
-- IKKJE rørt. Fleirbutikk-grunnmuren (butikk_id, RLS) ligg framleis
-- under panseret, så det er lett å ta opp att seinare.
-- =====================================================================

-- Demo-butikkane. FK-ane blei sette med ON DELETE CASCADE, så dette
-- fjernar automatisk alle rader (tilsette/vakter/timar/oppgåver/
-- bestillingar) som høyrde til Bergen/Stavanger.
delete from butikkar where namn in ('MEKK Bergen', 'MEKK Stavanger');

-- Fjern ein eventuell demo konsern-leiar utan butikk, og nullstill
-- konsern-admin-flagget på alle, så «Admin»-visninga er heilt borte.
delete from ansatte where konsern_admin = true and butikk_id is null;
update ansatte set konsern_admin = false where konsern_admin = true;

-- Kontroll: kva butikkar står att? (skal berre vere MEKK Ølen)
select namn, aktiv from butikkar order by namn;
