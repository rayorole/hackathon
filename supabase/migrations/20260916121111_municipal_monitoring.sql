-- Municipality-wide durable scheduling. Existing cases and review history are untouched.
create table if not exists public.straatbeeld_monitoring (
 municipality text primary key,
 paused boolean not null default false,
 worker_id text,
 heartbeat_at timestamptz,
 lease_until timestamptz,
 last_planned_at timestamptz,
 block_reason text,
 max_research integer not null default 10 check(max_research between 0 and 100),
 research_started integer not null default 0,
 directory_checked_at timestamptz,
 directory_candidates integer not null default 0
);
create table if not exists public.straatbeeld_research_queue (
 establishment_id text primary key references public.straatbeeld_cases(id),
 municipality text not null references public.straatbeeld_monitoring(municipality),
 status text not null default 'queued' check(status in ('queued','running','checked','no_source','failed','budget_blocked')),
 priority integer not null default 0,
 next_due_at timestamptz not null default now(),
 last_attempt_at timestamptz,
 last_success_at timestamptz,
 attempts integer not null default 0,
 claim_id uuid,
 lease_until timestamptz,
 message_nl text,
 sources jsonb not null default '[]'::jsonb
);
create index if not exists straatbeeld_research_due on public.straatbeeld_research_queue(municipality,next_due_at,priority desc);
create table if not exists public.straatbeeld_research_attempts (
 id uuid primary key,
 establishment_id text not null references public.straatbeeld_cases(id),
 started_at timestamptz not null,
 finished_at timestamptz not null default now(),
 outcome text not null,
 message_nl text not null
);
create index if not exists straatbeeld_attempts_case on public.straatbeeld_research_attempts(establishment_id,finished_at desc);
alter table public.straatbeeld_monitoring enable row level security;
alter table public.straatbeeld_research_queue enable row level security;
alter table public.straatbeeld_research_attempts enable row level security;
revoke all on public.straatbeeld_monitoring,public.straatbeeld_research_queue,public.straatbeeld_research_attempts from public,anon,authenticated;
grant select,insert,update on public.straatbeeld_monitoring,public.straatbeeld_research_queue to service_role;
grant select,insert on public.straatbeeld_research_attempts to service_role;

create or replace function public.straatbeeld_plan(p_municipality text,p_worker text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 insert into public.straatbeeld_monitoring(municipality) values(p_municipality) on conflict do nothing;
 -- A single shared lease prevents a second paid worker from acquiring work.
 update public.straatbeeld_monitoring set worker_id=p_worker,heartbeat_at=now(),lease_until=now()+interval '3 minutes',last_planned_at=now()
 where municipality=p_municipality and (worker_id=p_worker or lease_until is null or lease_until<now());
 if not found then return false; end if;
 insert into public.straatbeeld_research_queue(establishment_id,municipality)
 select id,municipality from public.straatbeeld_cases where municipality=p_municipality and detail->'establishment'->>'isDemo'='false'
 on conflict do nothing;
 return true;
end $$;

create or replace function public.straatbeeld_claim(p_municipality text,p_worker text)
returns setof public.straatbeeld_research_queue language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.straatbeeld_monitoring where municipality=p_municipality and worker_id=p_worker and lease_until>now() and not paused for update;
 if not found then return; end if;
 -- Expired claims are recovered and recorded; their old owners cannot commit results.
 insert into public.straatbeeld_research_attempts(id,establishment_id,started_at,outcome,message_nl)
 select claim_id,establishment_id,last_attempt_at,'interrupted','Onderzoek onderbroken; opnieuw ingepland.' from public.straatbeeld_research_queue
 where municipality=p_municipality and status='running' and lease_until<now() on conflict do nothing;
 return query update public.straatbeeld_research_queue q set status='running',claim_id=gen_random_uuid(),lease_until=now()+interval '3 minutes',last_attempt_at=now(),attempts=attempts+1
 where q.establishment_id=(select r.establishment_id from public.straatbeeld_research_queue r where r.municipality=p_municipality
 and r.next_due_at<=now() and (r.status<>'running' or r.lease_until<now())
 order by r.priority desc,r.next_due_at,r.establishment_id for update skip locked limit 1) returning q.*;
end $$;

create or replace function public.straatbeeld_finish(p_id text,p_claim uuid,p_version integer,p_detail jsonb,p_outcome text,p_message text,p_days integer)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.straatbeeld_research_queue where establishment_id=p_id and claim_id=p_claim and status='running' and lease_until>now() for update;
 if not found then return false; end if;
 if p_detail is not null then
 update public.straatbeeld_cases set detail=p_detail,version=version+1,updated_at=now() where id=p_id and version=p_version;
 if not found then raise exception 'Concurrent case change; retry current evidence'; end if;
 end if;
 insert into public.straatbeeld_research_attempts(id,establishment_id,started_at,outcome,message_nl)
 select p_claim,p_id,last_attempt_at,p_outcome,p_message from public.straatbeeld_research_queue where establishment_id=p_id;
 update public.straatbeeld_research_queue set status=p_outcome,message_nl=p_message,lease_until=null,priority=0,
 last_success_at=case when p_outcome='checked' then now() else last_success_at end,
 next_due_at=now()+make_interval(days=>greatest(1,p_days)) where establishment_id=p_id;
 return true;
end $$;
revoke all on function public.straatbeeld_plan(text,text),public.straatbeeld_claim(text,text),public.straatbeeld_finish(text,uuid,integer,jsonb,text,text,integer) from public,anon,authenticated;
grant execute on function public.straatbeeld_plan(text,text),public.straatbeeld_claim(text,text),public.straatbeeld_finish(text,uuid,integer,jsonb,text,text,integer) to service_role;
