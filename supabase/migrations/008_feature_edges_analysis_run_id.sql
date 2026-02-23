-- Add analysis_run_id to feature_edges (required by graph_version_service, undo, graph_fix, execution)
alter table feature_edges add column analysis_run_id uuid references analysis_runs(id) on delete cascade;

-- Backfill from source node (both endpoints belong to same analysis run)
update feature_edges e
set analysis_run_id = n.analysis_run_id
from feature_nodes n
where e.source_node_id = n.id and e.analysis_run_id is null;

-- Remove any orphan rows that could not be backfilled (should not occur with FK constraints)
delete from feature_edges where analysis_run_id is null;

-- Make NOT NULL after backfill
alter table feature_edges alter column analysis_run_id set not null;

create index idx_feature_edges_analysis_run on feature_edges(analysis_run_id);
