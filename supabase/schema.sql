-- Momoyu Supabase schema (v1)
-- Goals:
-- - Move long-lived, ever-growing data off localStorage
-- - Keep per-AI-role (per conversation) data isolated
-- - Support incremental: chunk summaries (every N msgs) + daily diaries (UTC+8 day boundary) + impressions

-- Enable extensions
create extension if not exists "pgcrypto";

-- Enable anonymous auth (in Supabase dashboard) and use RLS policies below.
-- All tables are protected so each signed-in (anonymous) user can only access their own rows.

-- Conversations (one per AI role / chat)
create table if not exists public.conversations (
  id text primary key,
  user_id uuid not null,
  name text not null,
  type text not null default 'private',
  avatar text,
  character_settings jsonb,
  last_message_preview text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_last_message_idx
  on public.conversations (user_id, last_message_at desc);

alter table public.conversations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_select_own') then
    create policy conversations_select_own on public.conversations
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_insert_own') then
    create policy conversations_insert_own on public.conversations
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_update_own') then
    create policy conversations_update_own on public.conversations
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_delete_own') then
    create policy conversations_delete_own on public.conversations
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- Messages (append-only; load with pagination)
create table if not exists public.messages (
  id text primary key,
  user_id uuid not null,
  conversation_id text not null references public.conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),

  -- Optional fields (kept flexible via jsonb to avoid schema churn)
  meta jsonb
);

create index if not exists messages_conv_time_idx
  on public.messages (user_id, conversation_id, created_at desc);

alter table public.messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_select_own') then
    create policy messages_select_own on public.messages
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_insert_own') then
    create policy messages_insert_own on public.messages
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_update_own') then
    create policy messages_update_own on public.messages
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_delete_own') then
    create policy messages_delete_own on public.messages
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- Chunk summaries (e.g. every 100 messages)
create table if not exists public.conversation_chunk_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id text not null references public.conversations(id) on delete cascade,
  start_message_at timestamptz not null,
  end_message_at timestamptz not null,
  message_count int not null,
  summary_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists chunk_summaries_conv_end_idx
  on public.conversation_chunk_summaries (user_id, conversation_id, end_message_at desc);

alter table public.conversation_chunk_summaries enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_chunk_summaries' and policyname='chunk_summaries_select_own') then
    create policy chunk_summaries_select_own on public.conversation_chunk_summaries
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_chunk_summaries' and policyname='chunk_summaries_insert_own') then
    create policy chunk_summaries_insert_own on public.conversation_chunk_summaries
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_chunk_summaries' and policyname='chunk_summaries_update_own') then
    create policy chunk_summaries_update_own on public.conversation_chunk_summaries
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_chunk_summaries' and policyname='chunk_summaries_delete_own') then
    create policy chunk_summaries_delete_own on public.conversation_chunk_summaries
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- Daily diaries per conversation (UTC+8 day boundary is handled in the job logic)
create table if not exists public.conversation_daily_diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id text not null references public.conversations(id) on delete cascade,
  day date not null,
  diary_text text not null,
  mood_tags jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, conversation_id, day)
);

create index if not exists daily_diaries_conv_day_idx
  on public.conversation_daily_diaries (user_id, conversation_id, day desc);

alter table public.conversation_daily_diaries enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_daily_diaries' and policyname='daily_diaries_select_own') then
    create policy daily_diaries_select_own on public.conversation_daily_diaries
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_daily_diaries' and policyname='daily_diaries_insert_own') then
    create policy daily_diaries_insert_own on public.conversation_daily_diaries
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_daily_diaries' and policyname='daily_diaries_update_own') then
    create policy daily_diaries_update_own on public.conversation_daily_diaries
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='conversation_daily_diaries' and policyname='daily_diaries_delete_own') then
    create policy daily_diaries_delete_own on public.conversation_daily_diaries
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- Impressions (rolling state; updated from diaries)
create table if not exists public.impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id text not null references public.conversations(id) on delete cascade,
  target text not null, -- 'ai_self' | 'user'
  text text not null,
  version int not null default 1,
  last_diary_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, conversation_id, target)
);

create index if not exists impressions_conv_target_idx
  on public.impressions (user_id, conversation_id, target);

alter table public.impressions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='impressions' and policyname='impressions_select_own') then
    create policy impressions_select_own on public.impressions
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='impressions' and policyname='impressions_insert_own') then
    create policy impressions_insert_own on public.impressions
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='impressions' and policyname='impressions_update_own') then
    create policy impressions_update_own on public.impressions
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='impressions' and policyname='impressions_delete_own') then
    create policy impressions_delete_own on public.impressions
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- Optional: job watermarks (so edge functions can be idempotent)
create table if not exists public.processing_watermarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id text not null references public.conversations(id) on delete cascade,
  key text not null, -- 'chunk_summary' | 'daily_diary' | 'impressions'
  value jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, conversation_id, key)
);

alter table public.processing_watermarks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='processing_watermarks' and policyname='watermarks_select_own') then
    create policy watermarks_select_own on public.processing_watermarks
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='processing_watermarks' and policyname='watermarks_insert_own') then
    create policy watermarks_insert_own on public.processing_watermarks
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='processing_watermarks' and policyname='watermarks_update_own') then
    create policy watermarks_update_own on public.processing_watermarks
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='processing_watermarks' and policyname='watermarks_delete_own') then
    create policy watermarks_delete_own on public.processing_watermarks
      for delete using (user_id = auth.uid());
  end if;
end $$;

