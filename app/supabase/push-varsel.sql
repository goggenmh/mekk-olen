-- =====================================================================
-- PUSH-VARSEL  – allereie køyrd i prod
-- =====================================================================
-- (push_subscriptions vart laga i juni: id, ansatt, endpoint unik, p256dh, auth.)

-- Servarrolla (send-push) må kunne lese abonnement og hendingane den varslar om.
grant select, insert, update, delete on public.push_subscriptions to service_role;
grant select on public.shifts, public.shift_swaps, public.time_entries, public.ansatte to service_role;

-- VAPID-nøkkelparet for Web Push. Blir laga av send-push første gong det
-- trengst; den private nøkkelen forlèt aldri servaren. Berre service_role.
create table if not exists public.push_noklar (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table public.push_noklar enable row level security;
grant select, insert on public.push_noklar to service_role;

-- Registrer denne eininga for varsel til den innlogga tilsette. Finst
-- eininga frå før (t.d. eit delt nettbrett), blir ho flytta til den som
-- sist skrudde på varsel der.
create or replace function public.registrer_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
declare meg text;
begin
  select id into meg from public.ansatte where email = auth.email() and aktiv limit 1;
  if meg is null then raise exception 'Ikkje innlogga'; end if;
  insert into public.push_subscriptions (ansatt, endpoint, p256dh, auth)
  values (meg, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set ansatt = excluded.ansatt, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
revoke execute on function public.registrer_push(text, text, text) from public, anon;
grant execute on function public.registrer_push(text, text, text) to authenticated;

-- send-push må vite kven som har delegert godkjenne-rett.
grant select on public.permissions to service_role;
