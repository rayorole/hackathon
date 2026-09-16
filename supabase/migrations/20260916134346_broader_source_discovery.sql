-- User authorized $50 total, retaining all prior reservations and usage.
alter table public.straatbeeld_ai_budget drop constraint if exists straatbeeld_ai_budget_limit_cents_check;
alter table public.straatbeeld_ai_budget drop constraint if exists straatbeeld_ai_budget_reserved_cents_check;
alter table public.straatbeeld_ai_budget add constraint straatbeeld_ai_budget_limit_cents_check check(limit_cents between 1000 and 5000);
alter table public.straatbeeld_ai_budget add constraint straatbeeld_ai_budget_reserved_cents_check check(reserved_cents between 0 and limit_cents);
update public.straatbeeld_ai_budget set limit_cents=5000 where id=true;
alter table public.straatbeeld_research_queue add column if not exists discovery_checked_at timestamptz;
alter table public.straatbeeld_monitoring drop constraint if exists straatbeeld_monitoring_max_research_check;
alter table public.straatbeeld_monitoring add constraint straatbeeld_monitoring_max_research_check check(max_research between 0 and 10000);
update public.straatbeeld_monitoring set max_research=543 where municipality='Schoten';
create or replace function public.straatbeeld_record_usage(p_id uuid,p_actual numeric) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_actual is null or p_actual<0 or p_actual::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid usage'; end if;
 -- Same lock ordering as reservations prevents concurrent accounting deadlocks.
 perform 1 from public.straatbeeld_ai_budget where id=true for update;
 update public.straatbeeld_ai_reservations set actual_usd=p_actual where id=p_id and actual_usd is null;
 if not found then return false; end if;
 update public.straatbeeld_ai_budget set known_actual_usd=known_actual_usd+p_actual,
 reserved_cents=case when p_actual>0.10 then limit_cents else reserved_cents end,updated_at=now() where id=true;
 return true;
end $$;
