create table public.straatbeeld_candidates (
  id uuid primary key,
  municipality text not null,
  fingerprint text not null,
  version integer not null default 0 check (version >= 0),
  status text not null check (status in ('pending','approved','rejected')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint candidate_shape check (
    jsonb_typeof(payload) = 'object'
    and payload->>'id' = id::text
    and payload->>'status' = status
    and (payload->>'revision')::integer = version
    and payload#>>'{address,municipality}' = municipality
    and payload ?& array['name','source','sourceUrl','observation','observedAt','createdBy','createdAt','review']
    and ((status = 'pending' and payload->'review' = 'null'::jsonb)
      or (status <> 'pending' and jsonb_typeof(payload->'review') = 'object'))
  )
);
create unique index straatbeeld_candidates_unique_active on public.straatbeeld_candidates (fingerprint) where status <> 'rejected';
create index straatbeeld_candidates_location on public.straatbeeld_candidates (municipality, created_at desc);
alter table public.straatbeeld_candidates enable row level security;
revoke all on public.straatbeeld_candidates from public, anon, authenticated, service_role;
grant select, insert, update on public.straatbeeld_candidates to service_role;
comment on table public.straatbeeld_candidates is 'Officer-reported candidate businesses. No invented registry identifiers; immutable report and a versioned officer decision. No public access.';
