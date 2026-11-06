-- Modular per butikk: kva sider butikken har slått på. NULL = alle (standard,
-- bakoverkompatibelt). Ei liste = berre desse modulane er på for butikken.
-- Konsern-admin (eigar) ser alltid alt, same kva som står her. Butikkar-tabellen
-- har alt konsern-gated RLS, så det trengst ingen nye policyar.
alter table public.butikkar add column if not exists moduler text[];
