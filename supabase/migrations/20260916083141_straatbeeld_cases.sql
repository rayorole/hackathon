-- Dedicated hackathon persistence envelope. No existing project tables are modified.
create table public.straatbeeld_cases (
  id text primary key,
  municipality text not null,
  street text not null,
  version integer not null default 0 check (version >= 0),
  detail jsonb not null,
  updated_at timestamptz not null default now(),
  constraint straatbeeld_detail_shape check (
    jsonb_typeof(detail) = 'object'
    and detail ?& array['establishment', 'sources', 'evidence', 'reviews']
    and jsonb_typeof(detail->'establishment') = 'object'
    and jsonb_typeof(detail->'sources') = 'array'
    and jsonb_typeof(detail->'evidence') = 'array'
    and jsonb_typeof(detail->'reviews') = 'array'
    and (detail #>> '{establishment,id}') is not null
    and (detail #>> '{establishment,id}') = id
    and (detail #>> '{establishment,address,municipality}') is not null
    and (detail #>> '{establishment,address,municipality}') = municipality
    and (detail #>> '{establishment,address,street}') is not null
    and (detail #>> '{establishment,address,street}') = street
  )
);
create index straatbeeld_cases_location_idx on public.straatbeeld_cases (municipality, street, id);
create index straatbeeld_cases_detail_idx on public.straatbeeld_cases using gin (detail jsonb_path_ops);
alter table public.straatbeeld_cases enable row level security;
revoke all on public.straatbeeld_cases from public, anon, authenticated, service_role;
grant select, insert, update on public.straatbeeld_cases to service_role;
comment on table public.straatbeeld_cases is 'Hackathon case read model. Registry facts, evidence, proposals and review history stay distinct in typed JSON. Service-only until officer authorization is implemented.';
