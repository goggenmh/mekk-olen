-- =====================================================================
-- ASSISTENT  – teljing av spørsmål per tilsett per dag
-- =====================================================================
-- Edge-funksjonen `assistent` tel kvart spørsmål her og stoppar når ein
-- tilsett når dagleg tak. Berre servaren (service_role) les og skriv.
-- Idempotent.

create table if not exists public.assistent_bruk (
  ansatt text not null references public.ansatte(id) on delete cascade,
  dato date not null,
  tal int not null default 0,
  primary key (ansatt, dato)
);
alter table public.assistent_bruk enable row level security;
revoke all on public.assistent_bruk from anon, authenticated;

-- Aukar teljaren og returnerer talet for i dag (inkludert dette spørsmålet).
create or replace function public.assistent_tel(p_ansatt text, p_dato date)
returns integer language sql security definer set search_path = public as $$
  insert into public.assistent_bruk (ansatt, dato, tal) values (p_ansatt, p_dato, 1)
  on conflict (ansatt, dato) do update set tal = public.assistent_bruk.tal + 1
  returning tal;
$$;
revoke execute on function public.assistent_tel(text, date) from public, anon, authenticated;
