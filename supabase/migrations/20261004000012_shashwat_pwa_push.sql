-- Migration: 20261004000012_shashwat_pwa_push.sql
-- Description: Push notification subscriptions and performance indexes for high concurrent load
-- Source of Truth: documents/PLAN.md, documents/TEAM_TASKS.md chore/pwa-and-performance

-- ─── 1. PUSH SUBSCRIPTIONS TABLE ────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "users can view and manage their push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── 2. HIGH-CONCURRENCY PERFORMANCE INDEXES ────────────────────────────────
-- Optimizes calendar query load
create index if not exists idx_calendar_user_starts
  on public.calendar_entries(user_id, starts_at);

-- Optimizes presence heartbeat ingest & session lookups
create index if not exists idx_presence_sessions_active
  on public.presence_sessions(user_id, started_at desc)
  where ended_at is null;

-- Optimizes bell notifications unread queries
create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, created_at desc)
  where read_at is null;

-- Optimizes events catalog and timetable filters
create index if not exists idx_events_status_starts
  on public.events(status, starts_at asc);

-- Optimizes rapid friend relationship resolution
create index if not exists idx_friendships_users_status
  on public.friendships(user_a, user_b, status);
