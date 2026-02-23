-- Graph snapshots for undo stack (max 10 per repo, managed by application)
create table graph_snapshots (
  id uuid primary key default uuid_generate_v4(),
  repo_id uuid not null references repos(id) on delete cascade,
  analysis_run_id uuid not null references analysis_runs(id),
  snapshot_json jsonb not null,  -- { nodes: [...], edges: [...] }
  created_at timestamptz not null default now()
);

create index idx_graph_snapshots_repo_created
  on graph_snapshots(repo_id, created_at desc);
