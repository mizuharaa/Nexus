-- Product Evolution Engine — Initial Database Schema
-- Run this in the Supabase SQL Editor to create all tables.

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- repos
-- ============================================================
create table if not exists repos (
    id uuid primary key default uuid_generate_v4(),
    github_url text not null,
    name text not null,
    default_branch text,
    loc_count integer,
    framework_detected text,
    status text not null default 'pending'
        check (status in ('pending', 'analyzing', 'ready', 'error')),
    created_at timestamptz not null default now()
);

-- ============================================================
-- analysis_runs
-- ============================================================
create table if not exists analysis_runs (
    id uuid primary key default uuid_generate_v4(),
    repo_id uuid not null references repos(id) on delete cascade,
    status text not null default 'running'
        check (status in ('running', 'completed', 'failed')),
    digest_json jsonb,
    started_at timestamptz not null default now(),
    completed_at timestamptz
);

create index idx_analysis_runs_repo on analysis_runs(repo_id);

-- ============================================================
-- feature_nodes
-- ============================================================
create table if not exists feature_nodes (
    id uuid primary key default uuid_generate_v4(),
    analysis_run_id uuid not null references analysis_runs(id) on delete cascade,
    name text not null,
    description text not null default '',
    anchor_files text[] default '{}',
    parent_feature_id uuid references feature_nodes(id) on delete set null,
    risk_score integer,
    metadata_json jsonb
);

create index idx_feature_nodes_run on feature_nodes(analysis_run_id);
create index idx_feature_nodes_parent on feature_nodes(parent_feature_id);

-- ============================================================
-- feature_edges
-- ============================================================
create table if not exists feature_edges (
    id uuid primary key default uuid_generate_v4(),
    source_node_id uuid not null references feature_nodes(id) on delete cascade,
    target_node_id uuid not null references feature_nodes(id) on delete cascade,
    edge_type text not null default 'tree'
        check (edge_type in ('tree', 'related'))
);

create index idx_feature_edges_source on feature_edges(source_node_id);
create index idx_feature_edges_target on feature_edges(target_node_id);

-- ============================================================
-- feature_risks
-- ============================================================
create table if not exists feature_risks (
    id uuid primary key default uuid_generate_v4(),
    feature_node_id uuid not null references feature_nodes(id) on delete cascade,
    score integer not null default 0
        check (score >= 0 and score <= 100),
    factors_json jsonb,
    badge_color text not null default 'green'
        check (badge_color in ('green', 'yellow', 'red'))
);

create index idx_feature_risks_node on feature_risks(feature_node_id);

-- ============================================================
-- feature_suggestions
-- ============================================================
create table if not exists feature_suggestions (
    id uuid primary key default uuid_generate_v4(),
    feature_node_id uuid not null references feature_nodes(id) on delete cascade,
    name text not null,
    rationale text not null default '',
    complexity text not null default 'medium',
    impacted_files text[] default '{}',
    test_cases text[] default '{}',
    implementation_sketch text,
    created_at timestamptz not null default now()
);

create index idx_feature_suggestions_node on feature_suggestions(feature_node_id);

-- ============================================================
-- strategic_branches
-- ============================================================
create table if not exists strategic_branches (
    id uuid primary key default uuid_generate_v4(),
    repo_id uuid not null references repos(id) on delete cascade,
    branch_name text not null,
    theme text not null,
    initiatives_json jsonb default '[]',
    architecture_impact text,
    scalability_impact text,
    risk_impact text,
    tradeoffs text,
    execution_order text[] default '{}',
    narrative text,
    created_at timestamptz not null default now()
);

create index idx_strategic_branches_repo on strategic_branches(repo_id);

-- ============================================================
-- execution_runs
-- ============================================================
create table if not exists execution_runs (
    id uuid primary key default uuid_generate_v4(),
    feature_suggestion_id uuid not null references feature_suggestions(id) on delete cascade,
    repo_id uuid not null references repos(id) on delete cascade,
    status text not null default 'queued'
        check (status in (
            'queued', 'cloning', 'planning', 'testing',
            'building', 'verifying', 'pushing', 'done', 'failed'
        )),
    sandbox_path text,
    branch_name text,
    pr_url text,
    iteration_count integer not null default 0,
    started_at timestamptz default now(),
    completed_at timestamptz
);

create index idx_execution_runs_repo on execution_runs(repo_id);
create index idx_execution_runs_suggestion on execution_runs(feature_suggestion_id);

-- ============================================================
-- execution_logs
-- ============================================================
create table if not exists execution_logs (
    id uuid primary key default uuid_generate_v4(),
    execution_run_id uuid not null references execution_runs(id) on delete cascade,
    step text not null,
    message text not null default '',
    log_level text not null default 'info'
        check (log_level in ('info', 'warn', 'error')),
    timestamp timestamptz not null default now()
);

create index idx_execution_logs_run on execution_logs(execution_run_id);
