-- Supabase API table grants and Postgres row-level security are independent.
-- The backend uses the service role and still requires explicit table grants.
grant usage on schema public to service_role;

grant select, insert, update, delete on table public.organizations to service_role;
grant select, insert, update, delete on table public.organization_members to service_role;
grant select, insert, update, delete on table public.repositories to service_role;
grant select, insert, update, delete on table public.graph_snapshots to service_role;
grant select, insert, update, delete on table public.agent_runs to service_role;
grant select, insert, update, delete on table public.analysis_jobs to service_role;
