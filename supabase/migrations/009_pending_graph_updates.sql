-- Add 'updating' status for Update Graph flow
do $$
declare
  r record;
begin
  for r in select conname from pg_constraint
    where conrelid = 'public.repos'::regclass and contype = 'c'
  loop
    execute format('alter table repos drop constraint %I', r.conname);
  end loop;
end $$;
alter table repos add constraint repos_status_check
  check (status in ('pending', 'analyzing', 'ready', 'error', 'updating'));

-- Add active and pending analysis run tracking for Update Graph flow
-- active_analysis_run_id: the run displayed as the current graph
-- pending_analysis_run_id: a completed update awaiting user approval (preview modal)

alter table repos add column active_analysis_run_id uuid references analysis_runs(id) on delete set null;
alter table repos add column pending_analysis_run_id uuid references analysis_runs(id) on delete set null;

-- Backfill: set active to latest completed run per repo
update repos r
set active_analysis_run_id = sub.id
from (
  select distinct on (repo_id) repo_id, id
  from analysis_runs
  where status = 'completed'
  order by repo_id, completed_at desc nulls last
) sub
where r.id = sub.repo_id;

create index idx_repos_active_run on repos(active_analysis_run_id);
create index idx_repos_pending_run on repos(pending_analysis_run_id);
