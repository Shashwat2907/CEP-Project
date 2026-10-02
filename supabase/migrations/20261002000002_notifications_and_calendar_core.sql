-- Migration: 20261002000002_notifications_and_calendar_core.sql
-- Description: Core schema for notifications, calendar entries, audit log, and events outbox with RLS.
-- Owner: Shashwat (Platform / Identity / Campus Life)
-- Source of Truth: documents/PLAN.md §6 & documents/CONTRACT.md §5.2

-- ─── 1. NOTIFICATIONS TABLE ──────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  link text,
  payload jsonb default '{}'::jsonb not null,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user_created 
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread 
  on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Policies for notifications
create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update read status of their own notifications"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "System and authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (user_id = auth.uid());

-- ─── 2. CALENDAR ENTRIES TABLE ────────────────────────────────────────
create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_type text not null check (
    source_type in ('meet', 'event', 'club_event', 'class', 'personal', 'complaints', 'lostfound')
  ),
  source_id text,
  title text not null,
  description text,
  location text,
  link text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz default now() not null,
  constraint valid_calendar_times check (ends_at >= starts_at)
);

create index if not exists idx_calendar_entries_user_range 
  on public.calendar_entries(user_id, starts_at, ends_at);

create index if not exists idx_calendar_entries_source 
  on public.calendar_entries(source_type, source_id);

alter table public.calendar_entries enable row level security;

-- Policies for calendar_entries
create policy "Users can view their own calendar entries"
  on public.calendar_entries for select
  using (user_id = auth.uid());

create policy "Users can insert personal calendar entries"
  on public.calendar_entries for insert
  with check (
    user_id = auth.uid() or auth.role() = 'service_role'
  );

create policy "Users can update their personal calendar entries"
  on public.calendar_entries for update
  using (user_id = auth.uid() and source_type = 'personal')
  with check (user_id = auth.uid() and source_type = 'personal');

create policy "Users can delete their own calendar entries"
  on public.calendar_entries for delete
  using (
    user_id = auth.uid() or auth.role() = 'service_role'
  );

-- ─── 3. AUDIT LOG TABLE ──────────────────────────────────────────────
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  at timestamptz default now() not null,
  meta jsonb default '{}'::jsonb not null
);

create index if not exists idx_audit_log_at on public.audit_log(at desc);
create index if not exists idx_audit_log_actor on public.audit_log(actor_id);
create index if not exists idx_audit_log_entity on public.audit_log(entity, entity_id);

alter table public.audit_log enable row level security;

-- Only admins can inspect audit logs (using public.is_admin() from auth migration)
create policy "Admins can view audit logs"
  on public.audit_log for select
  using (public.is_admin());

create policy "Authenticated users and services can insert audit records"
  on public.audit_log for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- ─── 4. EVENTS OUTBOX TABLE ──────────────────────────────────────────
create table if not exists public.events_outbox (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  created_at timestamptz default now() not null,
  processed_at timestamptz
);

create index if not exists idx_events_outbox_unprocessed 
  on public.events_outbox(created_at) where processed_at is null;

alter table public.events_outbox enable row level security;

create policy "Admins and service role can read outbox"
  on public.events_outbox for select
  using (public.is_admin() or auth.role() = 'service_role');

create policy "Authenticated actors can enqueue outbox events"
  on public.events_outbox for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy "Service role can update processed outbox events"
  on public.events_outbox for update
  using (auth.role() = 'service_role' or public.is_admin())
  with check (auth.role() = 'service_role' or public.is_admin());

-- ─── ROLLBACK INSTRUCTIONS ───────────────────────────────────────────
-- drop table if exists public.events_outbox cascade;
-- drop table if exists public.audit_log cascade;
-- drop table if exists public.calendar_entries cascade;
-- drop table if exists public.notifications cascade;
