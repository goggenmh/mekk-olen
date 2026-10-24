-- Bilete ved utlevering og retur på utleigereservasjonar.
--
-- `bilete` held URL-ar til bilete tekne når utstyret går ut og kjem inn, som
-- { "utlevert": ["https://…"], "retur": ["https://…"] }. Dokumenterer tilstand
-- for skade-/depositum-vurdering. Bileta ligg i storage-bøtta `utleige`
-- (same som produktbilete). RLS på utleige_reservasjon dekkjer kolonna.

alter table public.utleige_reservasjon add column if not exists bilete jsonb not null default '{}'::jsonb;
