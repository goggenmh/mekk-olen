-- Kvittering på beskjedtavle-beskjedar: kven har motteke kva beskjed.
--
-- Additiv tabell; same butikk-mønster som resten (set_butikk-trigger + butikk_all
-- RLS + grants). Når nokon legg ut ein beskjed (meldinger med til = null),
-- blokkerer han skjermen til dei andre tilsette til dei trykkjer «Mottatt», som
-- set inn ei rad her. Då er beskjeden kvittert for den tilsette og blokkerer
-- ikkje meir.
create table if not exists public.meldingar_mottatt (
  melding_id uuid not null references public.meldinger(id) on delete cascade,
  ansatt text not null references public.ansatte(id) on delete cascade,
  mottatt_at timestamptz not null default now(),
  butikk_id uuid,
  primary key (melding_id, ansatt)
);

alter table public.meldingar_mottatt enable row level security;

drop trigger if exists set_butikk on public.meldingar_mottatt;
create trigger set_butikk before insert on public.meldingar_mottatt
  for each row execute function public.set_butikk_id();

drop policy if exists "butikk_all" on public.meldingar_mottatt;
create policy "butikk_all" on public.meldingar_mottatt for all to authenticated
  using (butikk_id = public.min_butikk() or public.er_konsern_admin())
  with check (butikk_id = public.min_butikk() or public.er_konsern_admin());

grant select, insert, delete on public.meldingar_mottatt to authenticated;
