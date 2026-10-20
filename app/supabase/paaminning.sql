-- Påminningar om vakter (push):
--   kl. 08:00 – «Du er på jobb i dag kl. …» til alle som har vakt den dagen
--   30 min før – «Vakta di byrjar kl. …»
-- Dagleg leiar (leder = true) får ikkje desse.
--
-- pg_cron kallar edge-funksjonen `paaminning` kvart 5. minutt. Funksjonen
-- finn sjølv ut kva som skal sendast (Europe/Oslo-tid) og noterer det her,
-- så same påminning aldri blir sendt to gonger.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.paaminning_sendt (
  shift_id uuid not null references public.shifts(id) on delete cascade,
  type text not null check (type in ('morgon', 'snart')),
  sendt_at timestamptz not null default now(),
  primary key (shift_id, type)
);
alter table public.paaminning_sendt enable row level security;
revoke all on public.paaminning_sendt from anon, authenticated;
grant select, insert, update, delete on public.paaminning_sendt to service_role;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'vakt-paaminning') then
    perform cron.schedule(
      'vakt-paaminning',
      '*/5 * * * *',
      $job$select net.http_post(
        url := 'https://hzrqbgxfukfjlotieanh.supabase.co/functions/v1/paaminning',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      )$job$
    );
  end if;
end $$;
