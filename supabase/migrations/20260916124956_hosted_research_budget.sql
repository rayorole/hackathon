-- Carry-over seeded once from the existing local ledger after stopping its worker.
create table if not exists public.straatbeeld_ai_budget (
 id boolean primary key default true check(id), limit_cents integer not null default 1000 check(limit_cents=1000),
 reserved_cents integer not null check(reserved_cents between 0 and 1000), known_actual_usd numeric not null check(known_actual_usd>=0),
 calls integer not null check(calls>=0), worker_secret_hash text,
 updated_at timestamptz not null default now()
);
create table if not exists public.straatbeeld_ai_reservations (
 id uuid primary key, reserved_cents integer not null default 10 check(reserved_cents=10),
 actual_usd numeric check(actual_usd>=0), created_at timestamptz not null default now()
);
alter table public.straatbeeld_ai_budget enable row level security;
alter table public.straatbeeld_ai_reservations enable row level security;
revoke all on public.straatbeeld_ai_budget,public.straatbeeld_ai_reservations from public,anon,authenticated;
grant select,update on public.straatbeeld_ai_budget to service_role;
grant select,insert,update on public.straatbeeld_ai_reservations to service_role;

create or replace function public.straatbeeld_reserve_budget(p_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.straatbeeld_ai_budget where id=true for update;
 if exists(select 1 from public.straatbeeld_ai_reservations where id=p_id) then return false; end if;
 update public.straatbeeld_ai_budget set reserved_cents=reserved_cents+10,calls=calls+1,updated_at=now() where id=true and reserved_cents+10<=limit_cents;
 if not found then return false; end if;
 insert into public.straatbeeld_ai_reservations(id) values(p_id);
 return true;
end $$;
create or replace function public.straatbeeld_record_usage(p_id uuid,p_actual numeric) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_actual is null or p_actual<0 or p_actual::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid usage'; end if;
 -- Same lock ordering as reservations prevents concurrent accounting deadlocks.
 perform 1 from public.straatbeeld_ai_budget where id=true for update;
 update public.straatbeeld_ai_reservations set actual_usd=p_actual where id=p_id and actual_usd is null;
 if not found then return false; end if;
 update public.straatbeeld_ai_budget set known_actual_usd=known_actual_usd+p_actual,
 reserved_cents=case when p_actual>0.10 then 1000 else reserved_cents end,updated_at=now() where id=true;
 return true;
end $$;
create or replace function public.straatbeeld_worker_authorized(p_token text) returns boolean language sql security invoker set search_path='' as $$
 select coalesce((select worker_secret_hash=encode(extensions.digest(p_token,'sha256'),'hex') from public.straatbeeld_ai_budget where id=true),false);
$$;
revoke all on function public.straatbeeld_reserve_budget(uuid),public.straatbeeld_record_usage(uuid,numeric),public.straatbeeld_worker_authorized(text) from public,anon,authenticated;
grant execute on function public.straatbeeld_reserve_budget(uuid),public.straatbeeld_record_usage(uuid,numeric),public.straatbeeld_worker_authorized(text) to service_role;
