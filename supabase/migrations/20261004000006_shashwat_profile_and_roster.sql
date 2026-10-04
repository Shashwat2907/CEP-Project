-- Migration: 20261004000006_shashwat_profile_and_roster.sql
-- Description: Teacher profile fields, roster import batch history, and roster synchronization
-- Source of Truth: documents/PLAN.md §4.1, §5.4, documents/TEAM_TASKS.md feat/profile-and-roster-import

-- ─── 1. Add Teacher & Bio Fields to Profiles ────────────────────────────────
alter table public.profiles
  add column if not exists department text,
  add column if not exists office_hours text,
  add column if not exists bio text,
  add column if not exists phone text;

-- ─── 2. Roster Import Batch History ──────────────────────────────────────────
create table if not exists public.roster_import_batches (
  id                uuid primary key default gen_random_uuid(),
  filename          text not null,
  total_rows        int not null default 0,
  inserted_count    int not null default 0,
  updated_count     int not null default 0,
  deactivated_count int not null default 0,
  error_count       int not null default 0,
  error_report      jsonb not null default '[]'::jsonb,
  imported_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists roster_import_batches_created_idx
  on public.roster_import_batches (created_at desc);

-- ─── 3. Row Level Security for Roster ───────────────────────────────────────
alter table public.roster_import         enable row level security;
alter table public.roster_import_batches enable row level security;

-- Roster is strictly admin-managed (students/teachers cannot read raw roster)
create policy "roster readable by admin only"
  on public.roster_import for select
  to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "roster writable by admin only"
  on public.roster_import for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "roster batches readable by admin only"
  on public.roster_import_batches for select
  to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "roster batches writable by admin only"
  on public.roster_import_batches for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- ─── 4. Profiles RLS: Self Update for Allowed Fields ─────────────────────────
create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles self update allowed fields"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
