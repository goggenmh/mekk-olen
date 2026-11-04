-- Automatisk purring om gamle bestillingar.
--
-- Påminnings-funksjonen (supabase/functions/paaminning, kalla av pg_cron kvart
-- 5. minutt) sender no òg web-push til leiarane i butikken (+ den som la inn)
-- når ei bestilling har stått over aldersgrensa (ny 7 / tinga 14 / komen 10
-- dagar – same grenser som appen, sjå src/lib/bestilling.ts).
--
-- Denne tabellen er berre dedup: éi rad per bestilling per dag, så det kjem éi
-- purring og ikkje ei kvar 5. minutt. Berre edge-funksjonen (service role)
-- skriv her; RLS er på utan policy, så ingen klient (anon/authenticated) når
-- han. Rein additiv create – rører ikkje orders.
create table if not exists public.bestilling_purring (
  order_id uuid not null,
  dag date not null,
  primary key (order_id, dag)
);

alter table public.bestilling_purring enable row level security;

-- Edge-funksjonen (paaminning) skriv dedup-rader som service_role. Nye tabellar
-- får ikkje table-grants automatisk, så vi gir det som trengst (berre
-- service_role; anon/authenticated skal aldri nå han).
grant select, insert on public.bestilling_purring to service_role;
