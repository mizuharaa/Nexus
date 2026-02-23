-- Add optional plan feedback from user (rating + comment).
-- Used only for collecting feedback on OpenAI-generated plan; does not affect plan generation.

alter table execution_runs add column if not exists plan_feedback_rating text
  check (plan_feedback_rating is null or plan_feedback_rating in ('positive', 'negative'));

alter table execution_runs add column if not exists plan_feedback_comment text;
