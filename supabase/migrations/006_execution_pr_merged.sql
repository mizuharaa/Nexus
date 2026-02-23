-- Track whether the PR for an execution run has been merged
alter table execution_runs add column if not exists pr_merged boolean not null default false;
