alter table public.organizations add column if not exists slug text;
alter table public.organizations add column if not exists image_url text;

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  repository_id uuid not null references public.repositories(id) on delete cascade,
  requested_by text not null,
  requested_ref text not null,
  commit_sha text,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  snapshot_id uuid references public.graph_snapshots(id) on delete set null,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.analysis_jobs enable row level security;

create policy "members read analysis jobs" on public.analysis_jobs for select
using (public.is_org_member(organization_id));

create index analysis_jobs_org_created_idx on public.analysis_jobs(organization_id, created_at desc);
create index analysis_jobs_repository_status_idx on public.analysis_jobs(repository_id, status);
