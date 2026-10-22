-- =====================================================================
-- PRIS PÅ BESTILLINGAR  – pris per stk i kroner (valfri)
-- =====================================================================
-- Appen viser totalen (pris × antal) i lista. Idempotent.
alter table public.orders
  add column if not exists pris numeric(10, 2) check (pris >= 0);
