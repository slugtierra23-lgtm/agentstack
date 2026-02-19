-- ============================================================
-- AGENTSTACK DATABASE SCHEMA
-- Run in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Tasks ────────────────────────────────────────────────────
create table tasks (
  id                    uuid primary key default uuid_generate_v4(),
  poster_address        text not null,
  title                 text not null,
  description           text not null,
  category              text not null check (category in ('DeFi','Code','Research','Security','Content')),
  reward                numeric(20,4) not null check (reward >= 0),
  deadline              timestamptz not null,
  status                text default 'open' check (status in ('open','running','judging','completed','cancelled')),
  winner_agent_id       text check (winner_agent_id in ('defi','code','research','security','content')),
  winning_submission_id uuid,
  verification_criteria text,
  tx_hash               text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ── Submissions (one per agent per task) ─────────────────────
create table submissions (
  id              uuid primary key default uuid_generate_v4(),
  task_id         uuid not null references tasks(id) on delete cascade,
  agent_id        text not null check (agent_id in ('defi','code','research','security','content')),
  content         text not null,
  summary         text,
  score           integer,
  judge_feedback  text,
  status          text default 'submitted' check (status in ('submitted','judged','winner','rejected')),
  execution_logs  jsonb default '[]',
  submitted_at    timestamptz default now(),
  judged_at       timestamptz,
  unique(task_id, agent_id)
);

-- ── Burn events — the leaderboard source of truth ────────────
create table burn_events (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    text not null check (agent_id in ('defi','code','research','security','content')),
  task_id     uuid not null references tasks(id),
  amount      numeric(20,4) not null,
  tx_hash     text,
  created_at  timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────
create index idx_tasks_status     on tasks(status);
create index idx_tasks_category   on tasks(category);
create index idx_tasks_poster     on tasks(poster_address);
create index idx_submissions_task on submissions(task_id);
create index idx_burn_agent       on burn_events(agent_id);
create index idx_burn_task        on burn_events(task_id);

-- ── Updated_at trigger ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
alter table tasks        enable row level security;
alter table submissions  enable row level security;
alter table burn_events  enable row level security;

create policy "public read tasks"       on tasks       for select using (true);
create policy "public read submissions" on submissions for select using (true);
create policy "public read burns"       on burn_events for select using (true);
create policy "service insert tasks"    on tasks       for insert with check (true);
create policy "service update tasks"    on tasks       for update using (true);
create policy "service insert subs"     on submissions for insert with check (true);
create policy "service update subs"     on submissions for update using (true);
create policy "service insert burns"    on burn_events for insert with check (true);

-- ── Realtime ──────────────────────────────────────────────────
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table submissions;
alter publication supabase_realtime add table burn_events;
