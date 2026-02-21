-- Plan chat: one conversation per repo, persisted across sessions
create table plan_conversations (
  id uuid primary key default uuid_generate_v4(),
  repo_id uuid not null references repos(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_plan_conversations_repo on plan_conversations(repo_id, created_at desc);

create table plan_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references plan_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  suggested_goals jsonb not null default '[]',    -- list of goal label strings
  related_feature_ids jsonb not null default '[]', -- list of feature_node UUIDs
  created_at timestamptz not null default now()
);

create index idx_plan_messages_conversation on plan_messages(conversation_id, created_at asc);
