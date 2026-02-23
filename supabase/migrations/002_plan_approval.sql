-- Add plan approval workflow to execution_runs
-- 1. Add plan_md column to store generated plan for user review
-- 2. Expand status CHECK to include 'awaiting_approval'

alter table execution_runs add column if not exists plan_md text;

alter table execution_runs drop constraint if exists execution_runs_status_check;
alter table execution_runs add constraint execution_runs_status_check
    check (status in (
        'queued', 'cloning', 'planning', 'testing',
        'awaiting_approval',
        'building', 'verifying', 'pushing', 'done', 'failed'
    ));
