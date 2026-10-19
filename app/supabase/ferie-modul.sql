-- =====================================================================
-- FERIE & FRI  – søknader, godkjenning og historikk
-- =====================================================================
-- Før vart ferie som var over sletta automatisk. No blir alt teke vare på,
-- og tilsette søkjer om ferie/fri som ein leiar godkjenner eller avslår.
-- Køyr ETTER at appversjonen med Ferie & fri er ute (eller samtidig).

alter table public.ferie
  add column if not exists status text not null default 'godkjend' check (status in ('ventar', 'godkjend', 'avslatt')),
  add column if not exists svar text not null default '',
  add column if not exists behandla_av text references public.ansatte(id) on delete set null,
  add column if not exists behandla_at timestamptz,
  add column if not exists created_at timestamptz not null default now();
create index if not exists ferie_status_idx on public.ferie (status) where status = 'ventar';

-- Feriedagar per år (25 virkedagar som standard). Ikkje privat.
alter table public.ansatte add column if not exists feriedagar int not null default 25 check (feriedagar between 0 and 60);
grant select (feriedagar) on public.ansatte to authenticated;

-- Kven kan godkjenne: leiar, konsern-admin eller delegert godkjenning.
create or replace function public.kan_godkjenne()
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_active_leder() or public.er_konsern_admin() or exists (
    select 1 from public.permissions p join public.ansatte a on a.id = p.ansatt
    where a.email = auth.email() and a.aktiv and p.kan_godkjenne
  );
$$;
revoke execute on function public.kan_godkjenne() from public, anon;
grant execute on function public.kan_godkjenne() to authenticated;

-- Vakt på status: tilsette kan berre søkje (for seg sjølv), og berre endre
-- eller trekkje søknader som ikkje er behandla. Godkjenning blir loggført.
create or replace function public.ferie_status_vakt()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meg text := (select id from public.ansatte where email = auth.email() limit 1);
  kan boolean := public.kan_godkjenne();
begin
  if auth.uid() is null then  -- service_role / SQL Editor
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if not kan and (old.ansatt is distinct from meg or old.status <> 'ventar') then
      raise exception 'Du kan berre trekkje dine eigne søknader som ikkje er behandla.';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if not kan then
      if new.ansatt is distinct from meg then
        raise exception 'Du kan berre søkje om ferie/fri for deg sjølv.';
      end if;
      new.status := 'ventar'; new.svar := ''; new.behandla_av := null; new.behandla_at := null;
    elsif new.status <> 'ventar' then
      new.behandla_av := meg; new.behandla_at := now();
    end if;
    return new;
  end if;

  -- UPDATE
  if not kan then
    if old.status <> 'ventar' or old.ansatt is distinct from meg then
      raise exception 'Behandla søknader kan berre endrast av ein leiar.';
    end if;
    new.ansatt := old.ansatt; new.status := 'ventar'; new.svar := old.svar;
    new.behandla_av := null; new.behandla_at := null;
  elsif new.status is distinct from old.status then
    new.behandla_av := meg; new.behandla_at := now();
  end if;
  return new;
end $$;
revoke execute on function public.ferie_status_vakt() from public, anon, authenticated;

drop trigger if exists ferie_status_vakt on public.ferie;
create trigger ferie_status_vakt before insert or update or delete on public.ferie
  for each row execute function public.ferie_status_vakt();
