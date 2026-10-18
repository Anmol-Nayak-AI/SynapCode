create extension if not exists "pgcrypto";

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  clerk_user_id text not null,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  primary key (organization_id, clerk_user_id)
);

create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  github_full_name text not null,
  default_branch text not null default 'main',
  created_at timestamptz not null default now(),
  unique (organization_id, github_full_name)
);

create table public.graph_snapshots (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  commit_sha text not null,
  graph jsonb not null,
  health_score smallint not null check (health_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (repository_id, commit_sha)
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_id uuid not null references public.graph_snapshots(id) on delete cascade,
  clerk_user_id text not null,
  question text not null,
  answer jsonb not null,
  trace_id text,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.repositories enable row level security;
alter table public.graph_snapshots enable row level security;
alter table public.agent_runs enable row level security;

create or replace function public.current_clerk_user_id() returns text
language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '') $$;

create or replace function public.is_org_member(target_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and clerk_user_id = public.current_clerk_user_id()
  )
$$;

create policy "members read organizations" on public.organizations for select
using (public.is_org_member(id));
create policy "members read memberships" on public.organization_members for select
using (public.is_org_member(organization_id));
create policy "members read repositories" on public.repositories for select
using (public.is_org_member(organization_id));
create policy "members read snapshots" on public.graph_snapshots for select
using (exists (select 1 from public.repositories r where r.id = repository_id and public.is_org_member(r.organization_id)));
create policy "members read agent runs" on public.agent_runs for select
using (public.is_org_member(organization_id));

create index repositories_org_idx on public.repositories(organization_id);
create index snapshots_repository_created_idx on public.graph_snapshots(repository_id, created_at desc);
create index agent_runs_org_created_idx on public.agent_runs(organization_id, created_at desc);
