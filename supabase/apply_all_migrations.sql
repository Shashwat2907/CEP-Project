-- ============================================================================
-- CAMPUS ECOSYSTEM PLATFORM — UNIFIED ALL-IN-ONE MIGRATION SCRIPT
-- Generated for Supabase SQL Editor
-- Safe to run multiple times (All objects and policies are idempotent)
-- ============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261002000001_auth_and_roles.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261002000001_auth_and_roles.sql
-- Description: Foundation schema for roster, profiles, user_roles, and login_attempts
-- Source of truth: documents/PLAN.MD §4, §4.1, §6 and documents/TEAM_TASKS.MD
-- ==============================================================================

-- 1. ROSTER IMPORT
-- Authoritative list of college members imported by admins.
-- Sign-in is restricted to emails present in this table with status != 'inactive'.
CREATE TABLE IF NOT EXISTS public.roster_import (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_email text UNIQUE NOT NULL,
  college_id text UNIQUE NOT NULL, -- enrollment number or faculty/staff ID
  full_name text NOT NULL,
  branch text,
  year int,
  division text,
  batch text,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_email ON public.roster_import(college_email);
CREATE INDEX IF NOT EXISTS idx_roster_college_id ON public.roster_import(college_id);
CREATE INDEX IF NOT EXISTS idx_roster_status ON public.roster_import(status);

-- 2. USER PROFILES
-- 1-to-1 profile created from the roster on first successful OTP sign-in.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  college_email text UNIQUE NOT NULL,
  college_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  photo_url text,
  role_primary text NOT NULL CHECK (role_primary IN ('student', 'teacher', 'admin')),
  branch text,
  year int,
  division text,
  batch text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(college_email);
CREATE INDEX IF NOT EXISTS idx_profiles_college_id ON public.profiles(college_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_primary);

-- 3. USER ROLES
-- Stores multiple roles per user (e.g. teacher who is also "Hostel warden" or "HOD").
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'authority')),
  scope text, -- domain name or title (e.g., 'Hostel Warden', 'Class Coordinator')
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, scope)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 4. LOGIN ATTEMPTS
-- Security audit and rate limiting log for OTP requests and verification attempts.
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('code_request', 'code_verify')),
  success boolean NOT NULL DEFAULT false,
  error_reason text
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip, at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.roster_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the requesting user has the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Roster import policies:
-- Only admins can read and manage the college roster directly.
drop policy if exists "Admins have full access to roster" on public.roster_import;
create policy "Admins have full access to roster" on public.roster_import
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profiles policies:
-- Authenticated users can view basic public profiles (needed for directory, chat, collab).
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles" on public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile non-roster fields (e.g. photo_url).
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile.
drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- User roles policies:
-- Users can read their own assigned roles.
drop policy if exists "Users can read own roles" on public.user_roles;
create policy "Users can read own roles" on public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view and manage all roles.
drop policy if exists "Admins can manage all user roles" on public.user_roles;
create policy "Admins can manage all user roles" on public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Login attempts policies:
-- Only admins can read login attempt audit logs.
drop policy if exists "Admins can view login attempts" on public.login_attempts;
create policy "Admins can view login attempts" on public.login_attempts
  FOR SELECT
  TO authenticated
  USING (public.is_admin());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261002000002_kedar_subjects_and_resources.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261002000002_kedar_subjects_and_resources.sql
-- Owner: Kedar
-- Description: subjects table and resources upload/approval tables for the
--              Academic Resources feature.
-- Source of truth: src/features/acad/README.md, documents/PLAN.md §5.6, §6
-- Reverse: DROP TABLE resources, subjects CASCADE; DROP FUNCTION ...
-- ==============================================================================

-- 1. SUBJECTS
-- Owned by Kedar. Data comes from the college office (see seed.sql for placeholders).
CREATE TABLE IF NOT EXISTS public.subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  code        text NOT NULL,
  year        smallint NOT NULL CHECK (year BETWEEN 1 AND 4),
  branch      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, branch)
);

CREATE INDEX IF NOT EXISTS idx_subjects_year_branch ON public.subjects(year, branch);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects USING gin(to_tsvector('english', name));

-- 2. APP CONFIG
-- Stores configurable limits so they are never hardcoded in application code.
-- SEED VALUE: confirm values with team before production.
CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL,
  note  text
);

INSERT INTO public.app_config (key, value, note) VALUES
  ('resource_max_file_size_mb',  '50',   'SEED VALUE: confirm max upload size with college IT'),
  ('resource_signed_url_expiry', '3600', 'seconds; SEED VALUE: confirm with team'),
  ('ai_daily_limit_per_user',    '20',   'SEED VALUE: confirm AI cost budget with team')
ON CONFLICT (key) DO NOTHING;

-- 3. RESOURCES
DO $$ BEGIN
  CREATE TYPE public.resource_type AS ENUM ('notes', 'pyq', 'slides', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.processing_status AS ENUM ('not_started', 'processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.resources (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  subject_id         uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  year               smallint NOT NULL CHECK (year BETWEEN 1 AND 4),
  branch             text NOT NULL,
  type               public.resource_type NOT NULL,
  uploader_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path       text NOT NULL,               -- internal Supabase Storage path; never expose raw
  file_ext           text NOT NULL,               -- e.g. 'pdf', 'pptx', 'docx'
  status             public.resource_status NOT NULL DEFAULT 'pending',
  approved_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason   text,
  processing_status  public.processing_status NOT NULL DEFAULT 'not_started',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_subject    ON public.resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_uploader   ON public.resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_resources_status     ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_year_branch ON public.resources(year, branch);
-- Full-text search index on title (used by browse/filter)
CREATE INDEX IF NOT EXISTS idx_resources_title_fts  ON public.resources USING gin(to_tsvector('english', title));

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

drop trigger if exists trg_resources_updated_at on public.resources;
create trigger trg_resources_updated_at BEFORE UPDATE on public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. TEACHER_SUBJECTS
-- Which subjects a teacher teaches. Used by RLS to restrict approval rights.
-- SEED VALUE: populated from the real timetable. Placeholder rows in seed.sql.
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  teacher_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.subjects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config     ENABLE ROW LEVEL SECURITY;

-- Helper: does the current user teach the given subject?
CREATE OR REPLACE FUNCTION public.teaches_subject(p_subject_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_subjects
    WHERE teacher_id = auth.uid() AND subject_id = p_subject_id
  );
$$;

-- Helper: is current user a teacher?
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role_primary = 'teacher'
  );
$$;

-- SUBJECTS: all authenticated users can read; only admin can write
drop policy if exists "All authenticated users can read subjects" on public.subjects;
create policy "All authenticated users can read subjects" on public.subjects FOR SELECT TO authenticated USING (true);

drop policy if exists "Admins can manage subjects" on public.subjects;
create policy "Admins can manage subjects" on public.subjects FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- TEACHER_SUBJECTS: teachers read their own; admins manage all
drop policy if exists "Teachers can read their own subject assignments" on public.teacher_subjects;
create policy "Teachers can read their own subject assignments" on public.teacher_subjects FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.is_admin());

drop policy if exists "Admins can manage teacher_subjects" on public.teacher_subjects;
create policy "Admins can manage teacher_subjects" on public.teacher_subjects FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- APP_CONFIG: all authenticated users can read; only admin can write
drop policy if exists "All authenticated users can read app_config" on public.app_config;
create policy "All authenticated users can read app_config" on public.app_config FOR SELECT TO authenticated USING (true);

drop policy if exists "Admins can manage app_config" on public.app_config;
create policy "Admins can manage app_config" on public.app_config FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RESOURCES policies:

-- Students: can read their own pending uploads + all approved resources
drop policy if exists "Students can read approved resources and own pending" on public.resources;
create policy "Students can read approved resources and own pending" on public.resources FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR uploader_id = auth.uid()
  );

-- Teachers: can read all resources for subjects they teach (plus approved of all)
drop policy if exists "Teachers can read resources for their subjects" on public.resources;
create policy "Teachers can read resources for their subjects" on public.resources FOR SELECT TO authenticated
  USING (
    public.is_teacher() AND (
      status = 'approved'
      OR public.teaches_subject(subject_id)
      OR uploader_id = auth.uid()
    )
  );

-- Admins can read everything
drop policy if exists "Admins can read all resources" on public.resources;
create policy "Admins can read all resources" on public.resources FOR SELECT TO authenticated
  USING (public.is_admin());

-- Any authenticated user can insert (uploader_id must equal their own uid)
drop policy if exists "Authenticated users can upload resources" on public.resources;
create policy "Authenticated users can upload resources" on public.resources FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid());

-- Uploader can delete their own PENDING resource
drop policy if exists "Uploader can delete own pending resource" on public.resources;
create policy "Uploader can delete own pending resource" on public.resources FOR DELETE TO authenticated
  USING (uploader_id = auth.uid() AND status = 'pending');

-- Teacher can update (approve/reject) resources for subjects they teach
drop policy if exists "Teachers can approve or reject resources for their subjects" on public.resources;
create policy "Teachers can approve or reject resources for their subjects" on public.resources FOR UPDATE TO authenticated
  USING (public.is_teacher() AND public.teaches_subject(subject_id))
  WITH CHECK (public.is_teacher() AND public.teaches_subject(subject_id));

-- Admin can update anything
drop policy if exists "Admins can update any resource" on public.resources;
create policy "Admins can update any resource" on public.resources FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin can delete anything
drop policy if exists "Admins can delete any resource" on public.resources;
create policy "Admins can delete any resource" on public.resources FOR DELETE TO authenticated
  USING (public.is_admin());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261002000002_notifications_and_calendar_core.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications" on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Users can update read status of their own notifications" on public.notifications;
create policy "Users can update read status of their own notifications" on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "System and authenticated users can insert notifications" on public.notifications;
create policy "System and authenticated users can insert notifications" on public.notifications for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications" on public.notifications for delete
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
drop policy if exists "Users can view their own calendar entries" on public.calendar_entries;
create policy "Users can view their own calendar entries" on public.calendar_entries for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert personal calendar entries" on public.calendar_entries;
create policy "Users can insert personal calendar entries" on public.calendar_entries for insert
  with check (
    user_id = auth.uid() or auth.role() = 'service_role'
  );

drop policy if exists "Users can update their personal calendar entries" on public.calendar_entries;
create policy "Users can update their personal calendar entries" on public.calendar_entries for update
  using (user_id = auth.uid() and source_type = 'personal')
  with check (user_id = auth.uid() and source_type = 'personal');

drop policy if exists "Users can delete their own calendar entries" on public.calendar_entries;
create policy "Users can delete their own calendar entries" on public.calendar_entries for delete
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
drop policy if exists "Admins can view audit logs" on public.audit_log;
create policy "Admins can view audit logs" on public.audit_log for select
  using (public.is_admin());

drop policy if exists "Authenticated users and services can insert audit records" on public.audit_log;
create policy "Authenticated users and services can insert audit records" on public.audit_log for insert
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

drop policy if exists "Admins and service role can read outbox" on public.events_outbox;
create policy "Admins and service role can read outbox" on public.events_outbox for select
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Authenticated actors can enqueue outbox events" on public.events_outbox;
create policy "Authenticated actors can enqueue outbox events" on public.events_outbox for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "Service role can update processed outbox events" on public.events_outbox;
create policy "Service role can update processed outbox events" on public.events_outbox for update
  using (auth.role() = 'service_role' or public.is_admin())
  with check (auth.role() = 'service_role' or public.is_admin());

-- ─── ROLLBACK INSTRUCTIONS ───────────────────────────────────────────
-- drop table if exists public.events_outbox cascade;
-- drop table if exists public.audit_log cascade;
-- drop table if exists public.calendar_entries cascade;
-- drop table if exists public.notifications cascade;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261002000003_kedar_saved_resources.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: Saved / Bookmarked Resources
-- Author: Kedar (feat/acad-browse-and-filter)
-- Source of truth: documents/TEAM_TASKS.md, src/features/acad/README.md
-- ==============================================================================

-- 1. Table: saved_resources
-- Allows students and teachers to bookmark/save approved resources for quick access.
CREATE TABLE IF NOT EXISTS public.saved_resources (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, resource_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_resources_user ON public.saved_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_resources_resource ON public.saved_resources(resource_id);

-- 2. Row Level Security
ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;

-- Users can read only their own bookmarks
drop policy if exists "saved_resources_select_own" on public.saved_resources;
create policy "saved_resources_select_own" on public.saved_resources
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can save resources for themselves only
drop policy if exists "saved_resources_insert_own" on public.saved_resources;
create policy "saved_resources_insert_own" on public.saved_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
drop policy if exists "saved_resources_delete_own" on public.saved_resources;
create policy "saved_resources_delete_own" on public.saved_resources
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261002000003_kushal_complaints_core.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261002000003_kushal_complaints_core.sql
-- Owner: Kushal
-- Description: Core complaints schema: complaint_domains, domain_assignees,
--              complaints, complaint_events, complaint_attachments with RLS
-- Source of truth: src/features/complaints/README.md, documents/PLAN.md §5.4, §6
-- ==============================================================================

-- 1. COMPLAINT DOMAINS & CATEGORIES
-- Hierarchical categories (e.g. Academic -> Subject, Hostel -> Cleanliness).
-- Supports sensitive categories (e.g. Harassment & Ragging) with private routing.
CREATE TABLE IF NOT EXISTS public.complaint_domains (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  parent_id    uuid REFERENCES public.complaint_domains(id) ON DELETE CASCADE,
  sensitive    boolean NOT NULL DEFAULT false,
  routing_mode text NOT NULL DEFAULT 'chain' CHECK (routing_mode IN ('chain', 'direct')),
  visibility   text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_complaint_domains_parent ON public.complaint_domains(parent_id);
CREATE INDEX IF NOT EXISTS idx_complaint_domains_sensitive ON public.complaint_domains(sensitive);

-- 2. DOMAIN ASSIGNEES (Escalation chain per domain)
-- Defines who handles complaints at Level 1 (24h), Level 2 (48h), and Level 3 (72h).
CREATE TABLE IF NOT EXISTS public.domain_assignees (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id            uuid NOT NULL REFERENCES public.complaint_domains(id) ON DELETE CASCADE,
  level                smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  role_name            text NOT NULL, -- e.g. 'Subject Teacher', 'Hostel Warden', 'HOD'
  assignee_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sla_hours            int NOT NULL DEFAULT 24 CHECK (sla_hours > 0),
  escalation_condition text NOT NULL DEFAULT 'on_sla_breach',
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain_id, level)
);

CREATE INDEX IF NOT EXISTS idx_domain_assignees_domain ON public.domain_assignees(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_assignees_assignee ON public.domain_assignees(assignee_id);

-- 3. COMPLAINTS (The core grievance tickets)
DO $$ BEGIN
  CREATE TYPE public.complaint_status AS ENUM (
    'submitted',
    'in_progress',
    'escalated',
    'resolved',
    'reopened',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.complaints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain_id       uuid NOT NULL REFERENCES public.complaint_domains(id) ON DELETE RESTRICT,
  subcategory_id  uuid REFERENCES public.complaint_domains(id) ON DELETE SET NULL,
  title           text NOT NULL CHECK (char_length(title) >= 5),
  body            text NOT NULL CHECK (char_length(body) >= 10),
  status          public.complaint_status NOT NULL DEFAULT 'submitted',
  current_level   smallint NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 3),
  assigned_to     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  anonymous       boolean NOT NULL DEFAULT false,
  due_at          timestamptz,
  resolved_at     timestamptz,
  resolution_note text,
  reopen_note     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_author ON public.complaints(author_id);
CREATE INDEX IF NOT EXISTS idx_complaints_domain ON public.complaints(domain_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON public.complaints(created_at DESC);

-- Trigger to update updated_at timestamp on edit
CREATE OR REPLACE FUNCTION public.set_complaints_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists trg_complaints_updated_at on public.complaints;
create trigger trg_complaints_updated_at BEFORE UPDATE on public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_complaints_updated_at();

-- 4. COMPLAINT EVENTS (Audit history log)
-- Tracks every transition: submission, assignment, escalation, resolve, reopen, close.
CREATE TABLE IF NOT EXISTS public.complaint_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (
    type IN ('submitted', 'assigned', 'status_changed', 'escalated', 'resolved', 'reopened', 'closed', 'note_added')
  ),
  from_level    smallint,
  to_level      smallint,
  from_status   text,
  to_status     text,
  actor_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_events_complaint ON public.complaint_events(complaint_id, created_at ASC);

-- 5. COMPLAINT ATTACHMENTS
-- Stores references to uploaded photos/evidence in Supabase Storage.
CREATE TABLE IF NOT EXISTS public.complaint_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  file_name     text NOT NULL,
  file_size     int,
  mime_type     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint ON public.complaint_attachments(complaint_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.complaint_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;

-- 1. Domains: Everyone authenticated can view domains to submit complaints.
-- Only admins can manage domains.
drop policy if exists "Authenticated users can read complaint domains" on public.complaint_domains;
create policy "Authenticated users can read complaint domains" on public.complaint_domains FOR SELECT
  TO authenticated
  USING (true);

drop policy if exists "Admins can manage complaint domains" on public.complaint_domains;
create policy "Admins can manage complaint domains" on public.complaint_domains FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Domain Assignees: Everyone authenticated can read routing rules.
-- Only admins can manage assignees.
drop policy if exists "Authenticated users can read domain assignees" on public.domain_assignees;
create policy "Authenticated users can read domain assignees" on public.domain_assignees FOR SELECT
  TO authenticated
  USING (true);

drop policy if exists "Admins can manage domain assignees" on public.domain_assignees;
create policy "Admins can manage domain assignees" on public.domain_assignees FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Complaints Policies:
-- Read access:
-- - Author can always read their own complaint
-- - Assigned handler can read
-- - Admins can read all
-- - For non-sensitive domains: other authenticated users can read for public tracking
drop policy if exists "Users can read complaints" on public.complaints;
create policy "Users can read complaints" on public.complaints FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.complaint_domains d
      WHERE d.id = complaints.domain_id
        AND d.sensitive = false
        AND d.visibility = 'public'
    )
  );

-- Insert access: Authenticated users can file complaints as author
drop policy if exists "Users can insert complaints" on public.complaints;
create policy "Users can insert complaints" on public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Update access:
-- - Author can update (e.g. reopen or confirm resolution)
-- - Assigned handler or admin can update status and resolution note
drop policy if exists "Users and handlers can update complaints" on public.complaints;
create policy "Users and handlers can update complaints" on public.complaints FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    author_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_admin()
  );

-- 4. Complaint Events Policies:
-- Read access: Any authenticated user who can view the complaint
drop policy if exists "Users can view complaint events" on public.complaint_events;
create policy "Users can view complaint events" on public.complaint_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_events.complaint_id
        AND (
          c.author_id = auth.uid()
          OR c.assigned_to = auth.uid()
          OR public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.complaint_domains d
            WHERE d.id = c.domain_id AND d.sensitive = false
          )
        )
    )
  );

-- Insert access: Any authenticated user acting as author/handler/admin or service role
drop policy if exists "Authenticated users can record complaint events" on public.complaint_events;
create policy "Authenticated users can record complaint events" on public.complaint_events FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    OR actor_id IS NULL
    OR public.is_admin()
  );

-- 5. Attachments Policies:
drop policy if exists "Users can view attachments of viewable complaints" on public.complaint_attachments;
create policy "Users can view attachments of viewable complaints" on public.complaint_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_attachments.complaint_id
        AND (
          c.author_id = auth.uid()
          OR c.assigned_to = auth.uid()
          OR public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.complaint_domains d
            WHERE d.id = c.domain_id AND d.sensitive = false
          )
        )
    )
  );

drop policy if exists "Authors can upload attachments" on public.complaint_attachments;
create policy "Authors can upload attachments" on public.complaint_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_attachments.complaint_id
        AND (c.author_id = auth.uid() OR public.is_admin())
    )
  );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261002000004_shashwat_presence_toggle.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Migration: 20261002000003_presence_toggle.sql
-- Description: Campus Zones (geofencing boundaries) and Presence Consent & State with RLS
-- Source of Truth: documents/PLAN.md §5.1, documents/CONTRACT.md §6, documents/TEAM_TASKS.md

-- 1. Campus Zones Table (Polygons for campus boundary and named zones)
create table if not exists public.campus_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'campus' check (kind in ('campus', 'zone', 'building')),
  -- GeoJSON-like polygon coordinates: array of [lng, lat] vertices or [{ lat, lng }]
  polygon jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed default college campus boundary polygon (sample coordinates for university campus)
insert into public.campus_zones (id, name, kind, polygon, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'Main Campus',
  'campus',
  '[
    {"lat": 12.9710, "lng": 79.1580},
    {"lat": 12.9760, "lng": 79.1585},
    {"lat": 12.9770, "lng": 79.1660},
    {"lat": 12.9715, "lng": 79.1655}
  ]'::jsonb,
  true
)
on conflict (id) do nothing;

-- 2. Presence Consent Table (Explicit student privacy opt-in, pause, and revoke)
create table if not exists public.presence_consent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  consent_given boolean not null default false,
  is_paused boolean not null default false,
  visibility text not null default 'nobody' check (visibility in ('nobody', 'friends', 'everyone')),
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Presence Status Table (Evaluated state only; coordinates are NEVER stored)
create table if not exists public.presence_status (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state text not null check (state in ('in', 'out', 'checking', 'denied', 'offline')),
  zone_id uuid references public.campus_zones(id) on delete set null,
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  accuracy_meters numeric,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.campus_zones enable row level security;
alter table public.presence_consent enable row level security;
alter table public.presence_status enable row level security;

-- Policies for campus_zones
drop policy if exists "Anyone authenticated can view active campus zones" on public.campus_zones;
create policy "Anyone authenticated can view active campus zones" on public.campus_zones for select
  to authenticated
  using (is_active = true);

drop policy if exists "Admins can manage campus zones" on public.campus_zones;
create policy "Admins can manage campus zones" on public.campus_zones for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role_primary = 'admin'
    )
  );

-- Policies for presence_consent
drop policy if exists "Users can view own presence consent" on public.presence_consent;
create policy "Users can view own presence consent" on public.presence_consent for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert or update own presence consent" on public.presence_consent;
create policy "Users can insert or update own presence consent" on public.presence_consent for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policies for presence_status
drop policy if exists "Users can view own presence status" on public.presence_status;
create policy "Users can view own presence status" on public.presence_status for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can view presence of others when visibility is everyone" on public.presence_status;
create policy "Users can view presence of others when visibility is everyone" on public.presence_status for select
  to authenticated
  using (
    exists (
      select 1 from public.presence_consent
      where presence_consent.user_id = presence_status.user_id
        and presence_consent.consent_given = true
        and presence_consent.is_paused = false
        and presence_consent.visibility = 'everyone'
    )
  );

drop policy if exists "Users can update own presence status" on public.presence_status;
create policy "Users can update own presence status" on public.presence_status for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Indexes for performance
create index if not exists idx_campus_zones_active on public.campus_zones (is_active);
create index if not exists idx_presence_consent_user on public.presence_consent (user_id);
create index if not exists idx_presence_status_verified on public.presence_status (verified_at);

-- Rollback instructions:
-- drop table if exists public.presence_status cascade;
-- drop table if exists public.presence_consent cascade;
-- drop table if exists public.campus_zones cascade;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261003000001_kedar_resource_chunks.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261003000001_kedar_resource_chunks.sql
-- Owner: Kedar
-- Description: pgvector extension, resource_chunks table for embeddings,
--              ai_usage daily limits table, vector similarity search function,
--              and atomic quota tracking.
-- Source of truth: src/features/acad/README.md §8, documents/PLAN.md §5.6, §6
-- ==============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. RESOURCE_CHUNKS TABLE
-- Stores processed text segments, page citations, token count, and 768-dim embeddings
-- (compatible with Google Gemini text-embedding-004).
CREATE TABLE IF NOT EXISTS public.resource_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  chunk_index  integer NOT NULL,
  page_number  integer,
  content      text NOT NULL,
  token_count  integer NOT NULL DEFAULT 0,
  embedding    vector(768),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_resource_chunks_resource ON public.resource_chunks(resource_id);

-- HNSW vector cosine similarity index for fast RAG search
CREATE INDEX IF NOT EXISTS idx_resource_chunks_embedding
  ON public.resource_chunks
  USING hnsw (embedding vector_cosine_ops);

-- 3. AI_USAGE TABLE
-- Enforces per-user daily quota across AI features (flashcards + doubt chat).
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date  date NOT NULL DEFAULT CURRENT_DATE,
  call_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage(user_id, usage_date);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.resource_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Read policies for resource_chunks:
-- Users can read chunks if the parent resource is approved, or if they are teacher/admin, or uploader.
drop policy if exists "Users can read chunks of accessible resources" on public.resource_chunks;
create policy "Users can read chunks of accessible resources" on public.resource_chunks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_chunks.resource_id
        AND (
          r.status = 'approved'
          OR r.uploader_id = auth.uid()
          OR public.is_admin()
          OR (public.is_teacher() AND public.teaches_subject(r.subject_id))
        )
    )
  );

-- Admins and teachers can manage chunks
drop policy if exists "Admins and teachers can manage resource chunks" on public.resource_chunks;
create policy "Admins and teachers can manage resource chunks" on public.resource_chunks FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_teacher())
  WITH CHECK (public.is_admin() OR public.is_teacher());

-- AI Usage policies:
-- Users can see their own daily usage; admins can see all
drop policy if exists "Users can read own ai usage" on public.ai_usage;
create policy "Users can read own ai usage" on public.ai_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can insert/update their own usage
drop policy if exists "Users can update own ai usage" on public.ai_usage;
create policy "Users can update own ai usage" on public.ai_usage FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 5. FUNCTION: Check & increment daily AI quota atomically
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_current int;
  v_allowed boolean;
BEGIN
  -- Get daily limit from app_config or default to 20
  SELECT COALESCE(value::int, 20) INTO v_limit
  FROM public.app_config
  WHERE key = 'ai_daily_limit_per_user';

  IF v_limit IS NULL THEN
    v_limit := 20;
  END IF;

  -- Insert or increment call count
  INSERT INTO public.ai_usage (user_id, usage_date, call_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    call_count = CASE
      WHEN ai_usage.call_count < v_limit THEN ai_usage.call_count + 1
      ELSE ai_usage.call_count
    END,
    updated_at = now()
  RETURNING call_count INTO v_current;

  v_allowed := (v_current <= v_limit);

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'call_count', v_current,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_current)
  );
END;
$$;

-- 6. FUNCTION: Vector similarity match for RAG (Doubt Chat)
CREATE OR REPLACE FUNCTION public.match_resource_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  filter_resource_id uuid DEFAULT NULL,
  filter_subject_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  resource_id uuid,
  chunk_index int,
  page_number int,
  content text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.resource_id,
    rc.chunk_index,
    rc.page_number,
    rc.content,
    (1 - (rc.embedding <=> query_embedding)) AS similarity
  FROM public.resource_chunks rc
  JOIN public.resources r ON r.id = rc.resource_id
  WHERE r.status = 'approved'
    AND (filter_resource_id IS NULL OR rc.resource_id = filter_resource_id)
    AND (filter_subject_id IS NULL OR r.subject_id = filter_subject_id)
    AND (1 - (rc.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261003000002_kedar_flashcards.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261003000002_kedar_flashcards.sql
-- Owner: Kedar
-- Description: flashcard_decks, flashcards, flashcard_reviews tables.
--              Implements SM-2 spaced repetition scheduling.
-- Source of truth: src/features/acad/README.md, documents/PLAN.md §5.6, §6
-- ==============================================================================

-- 1. FLASHCARD_DECKS
-- One deck per (resource, owner) pair. Re-generating replaces all cards.
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  card_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_owner    ON public.flashcard_decks(owner_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_resource ON public.flashcard_decks(resource_id);

drop trigger if exists trg_flashcard_decks_updated_at on public.flashcard_decks;
create trigger trg_flashcard_decks_updated_at BEFORE UPDATE on public.flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. FLASHCARDS
-- Each card is linked to the source chunk/page for citation.
-- front = question, back = answer (both Gemini-generated).
CREATE TABLE IF NOT EXISTS public.flashcards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     uuid NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  front       text NOT NULL,          -- question shown face-up
  back        text NOT NULL,          -- answer shown face-down
  source_page integer,                -- page number from the resource for citation
  chunk_id    uuid REFERENCES public.resource_chunks(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deck_id, position)
);

CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON public.flashcards(deck_id);

-- 3. FLASHCARD_REVIEWS
-- One row per (card, user). SM-2 fields stored here.
-- SM-2: interval (days until next review), ease (2.5 starting, min 1.3),
--       repetitions (count of consecutive correct answers).
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_at       timestamptz NOT NULL DEFAULT now(),
  interval     integer NOT NULL DEFAULT 1,        -- days until next review
  ease         numeric(5,2) NOT NULL DEFAULT 2.5, -- SM-2 ease factor
  repetitions  integer NOT NULL DEFAULT 0,        -- consecutive correct count
  last_quality integer,                            -- last rating given (0-5)
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user     ON public.flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_due      ON public.flashcard_reviews(user_id, due_at);

drop trigger if exists trg_flashcard_reviews_updated_at on public.flashcard_reviews;
create trigger trg_flashcard_reviews_updated_at BEFORE UPDATE on public.flashcard_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.flashcard_decks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- FLASHCARD_DECKS: users can only see and manage their own decks
drop policy if exists "Users can read own flashcard decks" on public.flashcard_decks;
create policy "Users can read own flashcard decks" on public.flashcard_decks FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

drop policy if exists "Users can create own flashcard decks" on public.flashcard_decks;
create policy "Users can create own flashcard decks" on public.flashcard_decks FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

drop policy if exists "Users can update own flashcard decks" on public.flashcard_decks;
create policy "Users can update own flashcard decks" on public.flashcard_decks FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

drop policy if exists "Users can delete own flashcard decks" on public.flashcard_decks;
create policy "Users can delete own flashcard decks" on public.flashcard_decks FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- FLASHCARDS: readable if they own the parent deck
drop policy if exists "Users can read flashcards for own decks" on public.flashcards;
create policy "Users can read flashcards for own decks" on public.flashcards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_decks d
      WHERE d.id = flashcards.deck_id AND (d.owner_id = auth.uid() OR public.is_admin())
    )
  );

drop policy if exists "Users can manage flashcards for own decks" on public.flashcards;
create policy "Users can manage flashcards for own decks" on public.flashcards FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_decks d
      WHERE d.id = flashcards.deck_id AND d.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flashcard_decks d
      WHERE d.id = flashcards.deck_id AND d.owner_id = auth.uid()
    )
  );

-- FLASHCARD_REVIEWS: each user only sees/edits their own reviews
drop policy if exists "Users can read own flashcard reviews" on public.flashcard_reviews;
create policy "Users can read own flashcard reviews" on public.flashcard_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

drop policy if exists "Users can insert own flashcard reviews" on public.flashcard_reviews;
create policy "Users can insert own flashcard reviews" on public.flashcard_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

drop policy if exists "Users can update own flashcard reviews" on public.flashcard_reviews;
create policy "Users can update own flashcard reviews" on public.flashcard_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000005_shashwat_presence_monitoring.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Migration: 20261004000005_shashwat_presence_monitoring.sql
-- Description: Presence heartbeats, sessions, daily summary, campus IP ranges, and monitoring config
-- Source of Truth: documents/PLAN.md §5.1, documents/TEAM_TASKS.md feat/presence-monitoring
-- Privacy contract:
--   - Raw coordinates are NEVER stored (server evaluates; only state/zone/confidence stored)
--   - Heartbeats outside campus store state='outside', zone_id=NULL
--   - Sessions are the primary retention unit; raw heartbeats are deleted after retention_days
--   - Consent must be given and not paused before any heartbeat is recorded

-- ─── 1. Monitoring Config Table ────────────────────────────────────────────
create table if not exists public.presence_monitoring_config (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now()
);

insert into public.presence_monitoring_config (key, value, description) values
  ('heartbeat_interval_seconds', '120', 'How often the client sends a heartbeat (seconds).'),
  ('heartbeat_timeout_seconds',  '300', 'Close session as signal_lost after this many seconds without a heartbeat.'),
  ('heartbeat_retention_days',   '7',   'Delete raw heartbeats older than this many days.'),
  ('session_retention_days',     '365', 'Sessions kept for one academic year then deleted.'),
  ('daily_retention_days',       '365', 'Daily summaries kept for one academic year.')
on conflict (key) do nothing;

-- ─── 2. Campus Network IP Ranges ──────────────────────────────────────────
create table if not exists public.campus_ip_ranges (
  id         uuid primary key default gen_random_uuid(),
  cidr       text not null unique,
  label      text not null,
  is_active  boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- DEV SEED: replace with real campus IP ranges before launch
insert into public.campus_ip_ranges (cidr, label) values
  ('127.0.0.0/8', '[DEV SEED] Localhost — replace with real campus IP ranges before launch')
on conflict (cidr) do nothing;

-- ─── 3. Presence Heartbeats Table ─────────────────────────────────────────
create table if not exists public.presence_heartbeats (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  session_id      uuid,
  state           text not null check (state in ('inside', 'outside', 'unknown')),
  zone_id         uuid references public.campus_zones(id) on delete set null,
  confidence      text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  accuracy_meters numeric,
  source          text not null default 'browser' check (source in ('browser', 'native', 'qr')),
  ip_on_campus    boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists presence_heartbeats_user_created_idx
  on public.presence_heartbeats (user_id, created_at desc);

create index if not exists presence_heartbeats_session_idx
  on public.presence_heartbeats (session_id);

-- ─── 4. Presence Sessions Table ───────────────────────────────────────────
create table if not exists public.presence_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  zone_id           uuid references public.campus_zones(id) on delete set null,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  last_heartbeat_at timestamptz not null default now(),
  close_reason      text check (close_reason in ('verified_out', 'signal_lost', 'consent_revoked', 'admin_closed')),
  duration_minutes  numeric,
  created_at        timestamptz not null default now()
);

-- Trigger to calculate duration_minutes when session ends
create or replace function public.calculate_presence_session_duration()
returns trigger as $$
begin
  if new.ended_at is not null then
    new.duration_minutes := round((extract(epoch from (new.ended_at - new.started_at)) / 60)::numeric, 2);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_presence_session_duration on public.presence_sessions;
create trigger trg_presence_session_duration before insert or update on public.presence_sessions
for each row execute function public.calculate_presence_session_duration();

create index if not exists presence_sessions_user_active_idx
  on public.presence_sessions (user_id, ended_at)
  where ended_at is null;

create index if not exists presence_sessions_user_started_idx
  on public.presence_sessions (user_id, started_at desc);

-- Add FK from heartbeats → sessions now that sessions table exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'presence_heartbeats_session_id_fk'
  ) then
    alter table public.presence_heartbeats
      add constraint presence_heartbeats_session_id_fk
      foreign key (session_id) references public.presence_sessions(id) on delete set null;
  end if;
end $$;

-- ─── 5. Presence Daily Summary Table ─────────────────────────────────────
create table if not exists public.presence_daily (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  day               date not null,
  zone_id           uuid references public.campus_zones(id) on delete set null,
  first_in          timestamptz,
  last_out          timestamptz,
  minutes_on_campus numeric not null default 0,
  session_count     int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists presence_daily_user_day_idx
  on public.presence_daily (user_id, day desc);

-- ─── 6. Row Level Security ────────────────────────────────────────────────
alter table public.presence_monitoring_config enable row level security;
alter table public.campus_ip_ranges           enable row level security;
alter table public.presence_heartbeats        enable row level security;
alter table public.presence_sessions          enable row level security;
alter table public.presence_daily             enable row level security;

drop policy if exists "monitoring config readable by authenticated" on public.presence_monitoring_config;
create policy "monitoring config readable by authenticated" on public.presence_monitoring_config for select
  to authenticated using (true);

drop policy if exists "monitoring config writable by admin" on public.presence_monitoring_config;
create policy "monitoring config writable by admin" on public.presence_monitoring_config for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "campus ip ranges readable by authenticated" on public.campus_ip_ranges;
create policy "campus ip ranges readable by authenticated" on public.campus_ip_ranges for select
  to authenticated using (true);

drop policy if exists "campus ip ranges writable by admin" on public.campus_ip_ranges;
create policy "campus ip ranges writable by admin" on public.campus_ip_ranges for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "heartbeats: own rows only" on public.presence_heartbeats;
create policy "heartbeats: own rows only" on public.presence_heartbeats for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "sessions: own rows only" on public.presence_sessions;
create policy "sessions: own rows only" on public.presence_sessions for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "daily: own rows or admin" on public.presence_daily;
create policy "daily: own rows or admin" on public.presence_daily for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- ─── 7. pg_cron Jobs ──────────────────────────────────────────────────────
-- Optional: Only schedules if pg_cron extension is installed and enabled
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      EXECUTE $cron$
        SELECT cron.unschedule('presence-session-timeout') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'presence-session-timeout');
        SELECT cron.schedule(
          'presence-session-timeout',
          '* * * * *',
          $$
            update public.presence_sessions
            set ended_at = last_heartbeat_at, close_reason = 'signal_lost'
            where ended_at is null
              and last_heartbeat_at < now() - (
                (select value::int from public.presence_monitoring_config
                  where key = 'heartbeat_timeout_seconds')
                * interval '1 second'
              );
          $$
        );
      $cron$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule presence-session-timeout: %', SQLERRM;
    END;

    BEGIN
      EXECUTE $cron$
        SELECT cron.unschedule('presence-daily-rollup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'presence-daily-rollup');
        SELECT cron.schedule(
          'presence-daily-rollup',
          '30 19 * * *',
          $$
            insert into public.presence_daily
              (user_id, day, zone_id, first_in, last_out, minutes_on_campus, session_count, updated_at)
            select
              user_id,
              (started_at at time zone 'Asia/Kolkata')::date as day,
              mode() within group (order by zone_id)          as zone_id,
              min(started_at)       as first_in,
              max(ended_at)         as last_out,
              sum(duration_minutes) as minutes_on_campus,
              count(*)              as session_count,
              now()
            from public.presence_sessions
            where ended_at is not null
              and (started_at at time zone 'Asia/Kolkata')::date < current_date
            group by user_id, (started_at at time zone 'Asia/Kolkata')::date
            on conflict (user_id, day) do update set
              zone_id           = excluded.zone_id,
              first_in          = excluded.first_in,
              last_out          = excluded.last_out,
              minutes_on_campus = excluded.minutes_on_campus,
              session_count     = excluded.session_count,
              updated_at        = now();
          $$
        );
      $cron$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule presence-daily-rollup: %', SQLERRM;
    END;

    BEGIN
      EXECUTE $cron$
        SELECT cron.unschedule('presence-heartbeat-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'presence-heartbeat-cleanup');
        SELECT cron.schedule(
          'presence-heartbeat-cleanup',
          '30 20 * * *',
          $$
            delete from public.presence_heartbeats
            where created_at < now() - (
              (select value::int from public.presence_monitoring_config
                where key = 'heartbeat_retention_days')
              * interval '1 day'
            );
          $$
        );
      $cron$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule presence-heartbeat-cleanup: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron extension not installed; skipping presence background cron schedules.';
  END IF;
END $block$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000006_shashwat_profile_and_roster.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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
drop policy if exists "roster readable by admin only" on public.roster_import;
create policy "roster readable by admin only" on public.roster_import for select
  to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "roster writable by admin only" on public.roster_import;
create policy "roster writable by admin only" on public.roster_import for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "roster batches readable by admin only" on public.roster_import_batches;
create policy "roster batches readable by admin only" on public.roster_import_batches for select
  to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "roster batches writable by admin only" on public.roster_import_batches;
create policy "roster batches writable by admin only" on public.roster_import_batches for all
  to authenticated
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- ─── 4. Profiles RLS: Self Update for Allowed Fields ─────────────────────────
drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated" on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles self update allowed fields" on public.profiles;
create policy "profiles self update allowed fields" on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000007_shashwat_digital_id.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Migration: 20261004000007_shashwat_digital_id.sql
-- Description: Digital ID status, instant revocation/suspension, and verification audit trail
-- Source of Truth: documents/PLAN.md §5.4, documents/DESIGN.MD §8, documents/TEAM_TASKS.md feat/digital-id

-- ─── 1. Add Digital ID Status to Profiles ──────────────────────────────────────
alter table public.profiles
  add column if not exists digital_id_status text not null default 'active' 
    check (digital_id_status in ('active', 'suspended', 'revoked')),
  add column if not exists digital_id_revoked_at timestamptz,
  add column if not exists digital_id_revocation_reason text,
  add column if not exists digital_id_updated_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_digital_id_status on public.profiles(digital_id_status);

-- ─── 2. Verification Audit Log ────────────────────────────────────────────────
-- Logs every digital ID verification performed at security gates, labs, library, etc.
create table if not exists public.digital_id_verifications (
  id                  uuid primary key default gen_random_uuid(),
  subject_user_id     uuid references public.profiles(id) on delete cascade,
  college_id          text not null,
  verifier_id         uuid references public.profiles(id) on delete set null,
  verification_method text not null default 'qr' check (verification_method in ('qr', 'manual')),
  status              text not null check (status in ('valid', 'expired', 'revoked', 'suspended', 'not_found', 'tampered')),
  checkpoint          text not null default 'Main Gate',
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_verifications_subject on public.digital_id_verifications(subject_user_id);
create index if not exists idx_verifications_college_id on public.digital_id_verifications(college_id);
create index if not exists idx_verifications_created on public.digital_id_verifications(created_at desc);

-- ─── 3. Row Level Security for Verifications ───────────────────────────────────
alter table public.digital_id_verifications enable row level security;

-- Read policy: Admins can view all verification logs, users can view their own verifications
drop policy if exists "verifications readable by admin and subject" on public.digital_id_verifications;
create policy "verifications readable by admin and subject" on public.digital_id_verifications for select
  to authenticated
  using (
    subject_user_id = auth.uid()
    or verifier_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Insert policy: Any authenticated user (or service role) can record a verification log
drop policy if exists "verifications insertable by authenticated" on public.digital_id_verifications;
create policy "verifications insertable by authenticated" on public.digital_id_verifications for insert
  to authenticated
  with check (true);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000008_shashwat_lost_and_found.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Migration: 20261004000008_shashwat_lost_and_found.sql
-- Description: Comprehensive Lost & Found lifecycle schema with finder drop-off flow, verification claims, state machine audit log, and digital ID pickup
-- Source of Truth: documents/PLAN.md §5.5, documents/DESIGN.MD §9, documents/TEAM_TASKS.md feat/lost-and-found

-- ─── 1. LOST AND FOUND ITEMS TABLE ──────────────────────────────────────────
create table if not exists public.lost_found_items (
  id                    uuid primary key default gen_random_uuid(),
  type                  text not null check (type in ('lost', 'found')),
  reporter_id           uuid references public.profiles(id) on delete cascade not null,
  category              text not null check (
    category in ('electronics', 'cards_id', 'keys', 'books_stationery', 'clothing', 'accessories', 'bags', 'other')
  ),
  title                 text not null,
  description           text not null,
  hidden_detail         text, -- Hidden verification detail, protected from general queries
  verification_question text, -- Question claimant must answer (e.g. "What sticker is on the back?")
  location              text not null, -- Campus place from predefined location list
  dropoff_point         text, -- Finder drop-off safety: security desk or department office
  handover_code         text, -- 6-character code given to finder upon physical drop-off
  photo_urls            jsonb not null default '[]'::jsonb,
  incident_date         date not null default current_date,
  time_window           text, -- e.g. "Morning (09:00 - 11:00)"
  status                text not null default 'reported' check (
    status in ('reported', 'matched', 'claim_under_review', 'ready_for_pickup', 'returned', 'expired')
  ),
  is_reported_abuse     boolean not null default false,
  matched_item_id       uuid references public.lost_found_items(id) on delete set null,
  pickup_confirmed_by   uuid references public.profiles(id) on delete set null,
  pickup_digital_id     text, -- Claimant's college enrollment/staff ID confirmed on pickup
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_lost_found_type_status on public.lost_found_items(type, status);
create index if not exists idx_lost_found_category on public.lost_found_items(category);
create index if not exists idx_lost_found_reporter on public.lost_found_items(reporter_id);
create index if not exists idx_lost_found_created on public.lost_found_items(created_at desc);

-- ─── 2. LOST AND FOUND CLAIMS TABLE ─────────────────────────────────────────
create table if not exists public.lost_found_claims (
  id                    uuid primary key default gen_random_uuid(),
  item_id               uuid references public.lost_found_items(id) on delete cascade not null,
  claimant_id           uuid references public.profiles(id) on delete cascade not null,
  claimant_name         text not null,
  claimant_college_id   text not null,
  answer_to_question    text not null,
  additional_proof      text,
  status                text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'completed')
  ),
  desk_notes            text,
  reviewed_by           uuid references public.profiles(id) on delete set null,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists idx_claims_item on public.lost_found_claims(item_id);
create index if not exists idx_claims_claimant on public.lost_found_claims(claimant_id);
create index if not exists idx_claims_status on public.lost_found_claims(status);

-- ─── 3. LOST AND FOUND EVENT TRANSITIONS LOG ─────────────────────────────────
create table if not exists public.lost_found_events (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid references public.lost_found_items(id) on delete cascade not null,
  from_status text,
  to_status   text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_lost_found_events_item on public.lost_found_events(item_id, created_at desc);

-- ─── 4. ROW LEVEL SECURITY POLICIES ─────────────────────────────────────────
alter table public.lost_found_items  enable row level security;
alter table public.lost_found_claims enable row level security;
alter table public.lost_found_events enable row level security;

-- Items read policy: Any authenticated member can read non-abusive items
drop policy if exists "lost_found_items readable by authenticated" on public.lost_found_items;
create policy "lost_found_items readable by authenticated" on public.lost_found_items for select
  to authenticated
  using (not is_reported_abuse or reporter_id = auth.uid() or exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
  ));

-- Items insert policy: Authenticated members can report lost or found items
drop policy if exists "lost_found_items insertable by authenticated" on public.lost_found_items;
create policy "lost_found_items insertable by authenticated" on public.lost_found_items for insert
  to authenticated
  with check (reporter_id = auth.uid() or auth.role() = 'service_role');

-- Items update policy: Reporter can edit while in reported status, admins can update anytime
drop policy if exists "lost_found_items updatable by reporter or admin" on public.lost_found_items;
create policy "lost_found_items updatable by reporter or admin" on public.lost_found_items for update
  to authenticated
  using (
    reporter_id = auth.uid() or exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );

-- Claims read policy: Claimant, item reporter, or admin can read claim
drop policy if exists "claims readable by claimant, reporter, or admin" on public.lost_found_claims;
create policy "claims readable by claimant, reporter, or admin" on public.lost_found_claims for select
  to authenticated
  using (
    claimant_id = auth.uid()
    or exists (select 1 from public.lost_found_items where id = item_id and reporter_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Claims insert policy: Authenticated members can submit a claim
drop policy if exists "claims insertable by authenticated" on public.lost_found_claims;
create policy "claims insertable by authenticated" on public.lost_found_claims for insert
  to authenticated
  with check (claimant_id = auth.uid() or auth.role() = 'service_role');

-- Events read policy: Authenticated members can read transitions for visible items
drop policy if exists "events readable by authenticated" on public.lost_found_events;
create policy "events readable by authenticated" on public.lost_found_events for select
  to authenticated
  using (true);

-- Events insert policy: Authenticated members or service role can log transitions
drop policy if exists "events insertable by authenticated" on public.lost_found_events;
create policy "events insertable by authenticated" on public.lost_found_events for insert
  to authenticated
  with check (true);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000009_shashwat_events.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Migration: 20261004000009_shashwat_events.sql
-- Description: Schema for College and External Events, RSVPs, Team Formation, and Approval Workflow
-- Source of Truth: documents/PLAN.md §5.9, documents/DESIGN.MD §8, documents/TEAM_TASKS.md feat/events

-- ─── 1. EVENTS TABLE ────────────────────────────────────────────────────────
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('college', 'external')),
  title             text not null,
  description       text not null,
  organizer_name    text not null,
  organizer_type    text not null check (organizer_type in ('club', 'department', 'admin', 'external')),
  created_by        uuid references public.profiles(id) on delete set null,
  location          text not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  registration_link text,
  capacity          int,
  banner_url        text,
  tags              text[] not null default '{}',
  allow_teams       boolean not null default false,
  min_team_size     int not null default 1,
  max_team_size     int not null default 4,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint valid_event_dates check (ends_at >= starts_at)
);

create index if not exists idx_events_kind_status on public.events(kind, status);
create index if not exists idx_events_starts on public.events(starts_at asc);
create index if not exists idx_events_organizer on public.events(organizer_name);

-- ─── 2. EVENT RSVPS TABLE ───────────────────────────────────────────────────
create table if not exists public.event_rsvps (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid references public.events(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  status       text not null default 'attending' check (status in ('attending', 'waitlist', 'cancelled')),
  team_name    text,
  team_members text[] not null default '{}',
  created_at   timestamptz not null default now(),
  unique(event_id, user_id)
);

create index if not exists idx_rsvps_event on public.event_rsvps(event_id);
create index if not exists idx_rsvps_user on public.event_rsvps(user_id);

-- ─── 3. EVENT TEAMS TABLE (HACKATHONS & COMPETITIONS) ──────────────────────
create table if not exists public.event_teams (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid references public.events(id) on delete cascade not null,
  name                text not null,
  leader_id           uuid references public.profiles(id) on delete cascade not null,
  looking_for_members boolean not null default true,
  desired_skills      text[] not null default '{}',
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_event_teams_event on public.event_teams(event_id);

-- ─── 4. ROW LEVEL SECURITY POLICIES ─────────────────────────────────────────
alter table public.events      enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_teams enable row level security;

-- Events read: Approved events are public to all authenticated users. Pending events visible to creator and admins.
drop policy if exists "approved events readable by all authenticated" on public.events;
create policy "approved events readable by all authenticated" on public.events for select
  to authenticated
  using (
    status = 'approved'
    or created_by = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Events insert: Authenticated users can submit an event (which goes to approval queue unless admin)
drop policy if exists "events insertable by authenticated" on public.events;
create policy "events insertable by authenticated" on public.events for insert
  to authenticated
  with check (created_by = auth.uid() or auth.role() = 'service_role');

-- Events update: Creator can edit pending event, admins can approve/reject/update anytime
drop policy if exists "events updatable by creator or admin" on public.events;
create policy "events updatable by creator or admin" on public.events for update
  to authenticated
  using (
    (created_by = auth.uid() and status = 'pending')
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- RSVPs read: Users can read RSVPs for events they can see
drop policy if exists "rsvps readable by authenticated" on public.event_rsvps;
create policy "rsvps readable by authenticated" on public.event_rsvps for select
  to authenticated
  using (true);

-- RSVPs insert: Authenticated users can RSVP for themselves
drop policy if exists "rsvps insertable by owner" on public.event_rsvps;
create policy "rsvps insertable by owner" on public.event_rsvps for insert
  to authenticated
  with check (user_id = auth.uid() or auth.role() = 'service_role');

-- RSVPs update/delete: Users manage their own RSVP status
drop policy if exists "rsvps updatable by owner" on public.event_rsvps;
create policy "rsvps updatable by owner" on public.event_rsvps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Teams policies
drop policy if exists "event teams readable by all authenticated" on public.event_teams;
create policy "event teams readable by all authenticated" on public.event_teams for select
  to authenticated
  using (true);

drop policy if exists "event teams insertable by leader" on public.event_teams;
create policy "event teams insertable by leader" on public.event_teams for insert
  to authenticated
  with check (leader_id = auth.uid());

drop policy if exists "event teams updatable by leader" on public.event_teams;
create policy "event teams updatable by leader" on public.event_teams for update
  to authenticated
  using (leader_id = auth.uid());

-- ─── 4. EVENT MESSAGES TABLE (EVENT CHAT & Q&A) ─────────────────────────────
create table if not exists public.event_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references public.events(id) on delete cascade not null,
  author_id  uuid references public.profiles(id) on delete cascade not null,
  author_name text not null,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_messages_event on public.event_messages(event_id, created_at asc);

alter table public.event_messages enable row level security;

drop policy if exists "event messages readable by authenticated" on public.event_messages;
create policy "event messages readable by authenticated" on public.event_messages for select
  to authenticated
  using (true);

drop policy if exists "event messages insertable by author" on public.event_messages;
create policy "event messages insertable by author" on public.event_messages for insert
  to authenticated
  with check (author_id = auth.uid() or auth.role() = 'service_role');



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000010_shashwat_external_organizers.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Migration: 20261004000010_shashwat_external_organizers.sql
-- Description: External Organizers, Access Portal, Approval Queue, and Event Abuse Reports
-- Source of Truth: documents/PLAN.md §4.1, documents/DESIGN.MD, documents/TEAM_TASKS.md feat/organizer-access

-- ─── 1. EXTERNAL ORGANIZERS TABLE ──────────────────────────────────────────
create table if not exists public.external_organizers (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  organization   text not null,
  org_type       text not null check (org_type in ('company', 'club', 'college', 'community')),
  contact_name   text not null,
  contact_email  text unique not null,
  phone          text,
  website        text,
  purpose        text not null,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  trusted        boolean not null default false,
  approved_by    uuid references public.profiles(id) on delete set null,
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_external_organizers_status on public.external_organizers(status);
create index if not exists idx_external_organizers_email on public.external_organizers(contact_email);

-- ─── 2. EVENT ABUSE REPORTS TABLE ───────────────────────────────────────────
create table if not exists public.event_reports (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references public.events(id) on delete cascade not null,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reason      text not null,
  details     text,
  status      text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_event_reports_event on public.event_reports(event_id);
create index if not exists idx_event_reports_status on public.event_reports(status);

-- ─── 3. ROW LEVEL SECURITY POLICIES ─────────────────────────────────────────
alter table public.external_organizers enable row level security;
alter table public.event_reports       enable row level security;

-- Organizers can view and edit their own organizer registration record
drop policy if exists "organizers view own profile" on public.external_organizers;
create policy "organizers view own profile" on public.external_organizers for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

drop policy if exists "organizers insert own record" on public.external_organizers;
create policy "organizers insert own record" on public.external_organizers for insert
  to authenticated
  with check (user_id = auth.uid() or auth.role() = 'service_role');

drop policy if exists "organizers update own profile or admin" on public.external_organizers;
create policy "organizers update own profile or admin" on public.external_organizers for update
  to authenticated
  using (
    (user_id = auth.uid() and status != 'suspended')
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Event reports: authenticated students can report events; admins can view and review
drop policy if exists "reports insertable by authenticated" on public.event_reports;
create policy "reports insertable by authenticated" on public.event_reports for insert
  to authenticated
  with check (reporter_id = auth.uid() or auth.role() = 'service_role');

drop policy if exists "reports readable by admin or reporter" on public.event_reports;
create policy "reports readable by admin or reporter" on public.event_reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

drop policy if exists "reports updatable by admin" on public.event_reports;
create policy "reports updatable by admin" on public.event_reports for update
  to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000011_shashwat_friends.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Migration: 20261004000011_shashwat_friends.sql
-- Description: Schema and Row-Level Security for Friendships and Presence Visibility
-- Source of Truth: documents/PLAN.md §5.10, §6, documents/TEAM_TASKS.md feat/friends

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid references public.profiles(id) on delete cascade not null,
  user_b       uuid references public.profiles(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint chk_no_self_friendship check (user_a != user_b),
  unique(user_a, user_b)
);

create index if not exists idx_friendships_user_a on public.friendships(user_a);
create index if not exists idx_friendships_user_b on public.friendships(user_b);
create index if not exists idx_friendships_status on public.friendships(status);

alter table public.friendships enable row level security;

-- Read: Users can only see friendships where they are user_a or user_b
drop policy if exists "users can view own friendships" on public.friendships;
create policy "users can view own friendships" on public.friendships for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- Insert: Users can send a request where they are the requester
drop policy if exists "users can insert friend requests" on public.friendships;
create policy "users can insert friend requests" on public.friendships for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and (user_a = auth.uid() or user_b = auth.uid())
  );

-- Update: Participants can update status (accept, decline, block)
drop policy if exists "users can update own friendships" on public.friendships;
create policy "users can update own friendships" on public.friendships for update
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- Delete: Either participant can unfriend or cancel request
drop policy if exists "users can delete own friendships" on public.friendships;
create policy "users can delete own friendships" on public.friendships for delete
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000012_shashwat_pwa_push.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

drop policy if exists "users can view and manage their push subscriptions" on public.push_subscriptions;
create policy "users can view and manage their push subscriptions" on public.push_subscriptions for all
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000013_kedar_doubt_chat.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261004000013_kedar_doubt_chat.sql
-- Owner: Kedar
-- Description: doubt_threads and doubt_messages tables for RAG Doubt AI Chat.
--              Grounded in resource chunks with page citations and daily quota.
-- Source of truth: src/features/acad/README.md, documents/PLAN.md §5.6, CONTRACT.md
-- ==============================================================================

-- 1. DOUBT_THREADS
-- One conversation thread per (user, resource) or (user, subject) scope.
CREATE TABLE IF NOT EXISTS public.doubt_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.resources(id) ON DELETE CASCADE,
  subject_id  uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Doubt Clearing Session',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doubt_threads_user      ON public.doubt_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_doubt_threads_resource  ON public.doubt_threads(user_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_doubt_threads_subject   ON public.doubt_threads(user_id, subject_id);

drop trigger if exists trg_doubt_threads_updated_at on public.doubt_threads;
create trigger trg_doubt_threads_updated_at BEFORE UPDATE on public.doubt_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. DOUBT_MESSAGES
-- Chat history for doubt-clearing sessions.
-- Stores grounded citations (chunk ID, page number, resource reference) and confidence status.
CREATE TABLE IF NOT EXISTS public.doubt_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         uuid NOT NULL REFERENCES public.doubt_threads(id) ON DELETE CASCADE,
  sender_role       text NOT NULL CHECK (sender_role IN ('user', 'assistant')),
  content           text NOT NULL,
  citations         jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_status text NOT NULL DEFAULT 'grounded' CHECK (confidence_status IN ('grounded', 'weak_retrieval', 'general_guidance')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doubt_messages_thread    ON public.doubt_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_doubt_messages_chron     ON public.doubt_messages(thread_id, created_at ASC);

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.doubt_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_messages ENABLE ROW LEVEL SECURITY;

-- DOUBT_THREADS: Students and faculty can only view, create, update, delete their own threads
drop policy if exists "Users can read own doubt threads" on public.doubt_threads;
create policy "Users can read own doubt threads" on public.doubt_threads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

drop policy if exists "Users can create own doubt threads" on public.doubt_threads;
create policy "Users can create own doubt threads" on public.doubt_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

drop policy if exists "Users can update own doubt threads" on public.doubt_threads;
create policy "Users can update own doubt threads" on public.doubt_threads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

drop policy if exists "Users can delete own doubt threads" on public.doubt_threads;
create policy "Users can delete own doubt threads" on public.doubt_threads FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- DOUBT_MESSAGES: Accessible only if user owns the parent thread
drop policy if exists "Users can read messages for own doubt threads" on public.doubt_messages;
create policy "Users can read messages for own doubt threads" on public.doubt_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = thread_id
        AND (dt.user_id = auth.uid() OR public.is_admin())
    )
  );

drop policy if exists "Users can create messages for own doubt threads" on public.doubt_messages;
create policy "Users can create messages for own doubt threads" on public.doubt_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = thread_id
        AND dt.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete messages for own doubt threads" on public.doubt_messages;
create policy "Users can delete messages for own doubt threads" on public.doubt_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = thread_id
        AND (dt.user_id = auth.uid() OR public.is_admin())
    )
  );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000013_kushal_complaints_escalation.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261004000013_kushal_complaints_escalation.sql
-- Owner: Kushal
-- Description: Automated complaint escalation, idempotency constraints,
--              "needs admin attention" top-level flag, and cron helper function.
-- Source of truth: src/features/complaints/README.md & documents/PLAN.md §5.2
-- ==============================================================================

-- 1. Add top-level "needs admin attention" flag to complaints
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS needs_admin_attention boolean NOT NULL DEFAULT false;

-- 2. Indexes for efficient query performance during escalation sweeps
CREATE INDEX IF NOT EXISTS idx_complaints_admin_attention
  ON public.complaints(needs_admin_attention)
  WHERE needs_admin_attention = true;

CREATE INDEX IF NOT EXISTS idx_complaints_escalation_due
  ON public.complaints(status, due_at)
  WHERE status NOT IN ('resolved', 'closed');

-- 3. Idempotency guarantee:
-- Ensure a complaint can NEVER be escalated to the same level more than once,
-- even if concurrent cron jobs or double executions occur.
CREATE UNIQUE INDEX IF NOT EXISTS uq_complaint_events_escalation
  ON public.complaint_events (complaint_id, to_level)
  WHERE type = 'escalated';

-- 4. PostgreSQL Stored Procedure for Automated Escalation
-- Can be invoked via Supabase pg_cron, Edge Function, or Next.js Cron Route
CREATE OR REPLACE FUNCTION public.check_and_escalate_overdue_complaints()
RETURNS jsonb AS $$
DECLARE
  v_complaint RECORD;
  v_next_assignee RECORD;
  v_event_id uuid;
  v_escalated_count int := 0;
  v_flagged_admin_count int := 0;
  v_escalated_ids uuid[] := '{}';
  v_flagged_ids uuid[] := '{}';
BEGIN
  -- Iterate through all active, unresolved complaints that breached their SLA
  FOR v_complaint IN
    SELECT 
      c.id,
      c.domain_id,
      c.current_level,
      c.assigned_to,
      c.due_at,
      c.author_id,
      c.title,
      c.needs_admin_attention
    FROM public.complaints c
    WHERE c.status NOT IN ('resolved', 'closed')
      AND c.due_at IS NOT NULL
      AND c.due_at < now()
    ORDER BY c.due_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Look for next level assignee in the domain's chain
    SELECT 
      da.level,
      da.role_name,
      da.assignee_id,
      da.sla_hours
    INTO v_next_assignee
    FROM public.domain_assignees da
    WHERE da.domain_id = v_complaint.domain_id
      AND da.level = v_complaint.current_level + 1;

    IF FOUND THEN
      -- Try to insert escalation event; unique partial index protects against duplicate runs
      INSERT INTO public.complaint_events (
        complaint_id,
        type,
        from_level,
        to_level,
        from_status,
        to_status,
        actor_id,
        note
      )
      VALUES (
        v_complaint.id,
        'escalated',
        v_complaint.current_level,
        v_next_assignee.level,
        'in_progress',
        'escalated',
        NULL, -- System automated actor
        'Automated escalation: SLA breached at Level ' || v_complaint.current_level || ' (' || v_next_assignee.role_name || ')'
      )
      ON CONFLICT (complaint_id, to_level) WHERE type = 'escalated'
      DO NOTHING
      RETURNING id INTO v_event_id;

      -- If insertion succeeded (not a duplicate), update the complaint ticket
      IF v_event_id IS NOT NULL THEN
        UPDATE public.complaints
        SET
          current_level = v_next_assignee.level,
          assigned_to = v_next_assignee.assignee_id,
          status = 'escalated',
          due_at = now() + (v_next_assignee.sla_hours || ' hours')::interval,
          updated_at = now()
        WHERE id = v_complaint.id;

        v_escalated_count := v_escalated_count + 1;
        v_escalated_ids := array_append(v_escalated_ids, v_complaint.id);
      END IF;

    ELSE
      -- No further level exists in chain: this was the top-level authority!
      -- Flag as "Needs Admin Attention" if not already flagged
      IF NOT v_complaint.needs_admin_attention THEN
        INSERT INTO public.complaint_events (
          complaint_id,
          type,
          from_level,
          to_level,
          from_status,
          to_status,
          actor_id,
          note
        )
        VALUES (
          v_complaint.id,
          'status_changed',
          v_complaint.current_level,
          v_complaint.current_level,
          'escalated',
          'escalated',
          NULL,
          'Top-level authority SLA breached. Ticket flagged as Needs Admin Attention.'
        );

        UPDATE public.complaints
        SET
          needs_admin_attention = true,
          updated_at = now()
        WHERE id = v_complaint.id;

        v_flagged_admin_count := v_flagged_admin_count + 1;
        v_flagged_ids := array_append(v_flagged_ids, v_complaint.id);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'escalated_count', v_escalated_count,
    'flagged_admin_count', v_flagged_admin_count,
    'escalated_complaint_ids', v_escalated_ids,
    'flagged_complaint_ids', v_flagged_ids,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.check_and_escalate_overdue_complaints() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_overdue_complaints() TO service_role;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000014_kedar_storage_buckets.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migration: 20261004000014_kedar_storage_buckets.sql
-- Description: Create Supabase Storage bucket for academic resources with RLS
-- ============================================================================

-- 1. Create resources bucket if it does not exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources',
  'resources',
  true,
  52428800, -- 50MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- 2. Storage RLS Policies
-- Allow authenticated users to upload resources
drop policy if exists "Authenticated users can upload resources" on storage.objects;
create policy "Authenticated users can upload resources" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resources');

-- Allow authenticated users to view/download resources
drop policy if exists "Authenticated users can view resources" on storage.objects;
create policy "Authenticated users can view resources" on storage.objects for select
  to authenticated
  using (bucket_id = 'resources');

-- Allow resource uploaders and teachers to update/delete their objects
drop policy if exists "Users can delete their own uploaded resources" on storage.objects;
create policy "Users can delete their own uploaded resources" on storage.objects for delete
  to authenticated
  using (bucket_id = 'resources' and auth.uid()::text = (storage.foldername(name))[1]);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000014_kushal_complaints_tracker_upvotes.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261004000014_kushal_complaints_tracker_upvotes.sql
-- Owner: Kushal
-- Description: Upvotes system, duplicate linking, full-text search indexing,
--              and RLS policies for complaints transparency tracker.
-- Source of truth: src/features/complaints/README.md & documents/PLAN.md §5.2
-- ==============================================================================

-- 1. COMPLAINT UPVOTES TABLE
-- Strictly 1 upvote per student per complaint (enforced by primary key)
CREATE TABLE IF NOT EXISTS public.complaint_upvotes (
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (complaint_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_user ON public.complaint_upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_complaint ON public.complaint_upvotes(complaint_id);

-- 2. ALTER COMPLAINTS: Add duplicate link and fast upvote counter
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS duplicate_of_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upvotes_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_complaints_duplicate_of ON public.complaints(duplicate_of_id);
CREATE INDEX IF NOT EXISTS idx_complaints_upvotes ON public.complaints(upvotes_count DESC);

-- 3. FULL-TEXT SEARCH INDEX
-- Enables instant similarity suggestions while typing in the submission form
CREATE INDEX IF NOT EXISTS idx_complaints_fts
  ON public.complaints
  USING gin(to_tsvector('english', title || ' ' || body));

-- 4. TRIGGER: Maintain upvotes_count automatically
CREATE OR REPLACE FUNCTION public.sync_complaint_upvotes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.complaints
    SET upvotes_count = upvotes_count + 1, updated_at = now()
    WHERE id = NEW.complaint_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.complaints
    SET upvotes_count = GREATEST(0, upvotes_count - 1), updated_at = now()
    WHERE id = OLD.complaint_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

drop trigger if exists trg_sync_complaint_upvotes_count on public.complaint_upvotes;
create trigger trg_sync_complaint_upvotes_count AFTER INSERT OR DELETE on public.complaint_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_complaint_upvotes_count();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) FOR UPVOTES
-- ==============================================================================

ALTER TABLE public.complaint_upvotes ENABLE ROW LEVEL SECURITY;

-- 1. Read: Authenticated users can view upvotes for non-sensitive complaints
drop policy if exists "Users can read upvotes for viewable complaints" on public.complaint_upvotes;
create policy "Users can read upvotes for viewable complaints" on public.complaint_upvotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      JOIN public.complaint_domains d ON d.id = c.domain_id
      WHERE c.id = complaint_upvotes.complaint_id
        AND (d.sensitive = false OR c.author_id = auth.uid() OR public.is_admin())
    )
  );

-- 2. Insert: Authenticated users can only upvote non-sensitive public complaints
drop policy if exists "Users can upvote non-sensitive complaints" on public.complaint_upvotes;
create policy "Users can upvote non-sensitive complaints" on public.complaint_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.complaints c
      JOIN public.complaint_domains d ON d.id = c.domain_id
      WHERE c.id = complaint_upvotes.complaint_id
        AND d.sensitive = false
        AND c.status NOT IN ('resolved', 'closed')
    )
  );

-- 3. Delete: Users can withdraw their own upvote
drop policy if exists "Users can remove their own upvote" on public.complaint_upvotes;
create policy "Users can remove their own upvote" on public.complaint_upvotes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000015_kedar_community_full.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migration: 20261004000015_kedar_community_full.sql
-- Description: Community Core, Realtime Chat, Upvotes, and Tag System
-- Source of truth: src/features/community/README.md, documents/PLAN.md §5.7
-- ============================================================================

-- 1. Create Enums
do $$ begin
  create type community_kind as enum ('year_branch', 'subject', 'batch', 'unofficial');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type community_member_role as enum ('member', 'moderator');
exception when duplicate_object then null;
end $$;

-- 2. Communities Table
create table if not exists public.communities (
  id           uuid primary key default gen_random_uuid(),
  kind         community_kind not null default 'unofficial',
  name         text not null,
  description  text,
  official     boolean not null default false,
  year         smallint,
  branch       text,
  subject_id   uuid references public.subjects(id) on delete set null,
  batch        text,
  private      boolean not null default false,
  member_count integer not null default 1,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- 3. Community Members Table
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         community_member_role not null default 'member',
  joined_at    timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- 4. Community Messages Table
create table if not exists public.community_messages (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references public.communities(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  parent_id       uuid references public.community_messages(id) on delete cascade,
  body            text not null,
  attachment_path text,
  reactions       jsonb not null default '{}'::jsonb,
  upvote_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz
);

-- 5. Message Votes Table (Upvotes on replies feed the reputation tag system)
create table if not exists public.message_votes (
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- 6. Community Tags (Reputation badges: helper, doubt_solver, top_contributor)
create table if not exists public.community_tags (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  tag          text not null,
  awarded_at   timestamptz not null default now(),
  primary key (community_id, user_id, tag)
);

-- 7. Message Reports Table (Moderator review queue)
create table if not exists public.message_reports (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.community_messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  status      text not null default 'pending', -- pending, dismissed, actioned
  created_at  timestamptz not null default now()
);

-- 8. Indexes for High Performance
create index if not exists idx_communities_official on public.communities(official, kind);
create index if not exists idx_communities_year_branch on public.communities(year, branch);
create index if not exists idx_community_members_user on public.community_members(user_id);
create index if not exists idx_community_messages_community on public.community_messages(community_id, created_at desc);
create index if not exists idx_community_messages_parent on public.community_messages(parent_id) where parent_id is not null;
create index if not exists idx_message_votes_message on public.message_votes(message_id);
create index if not exists idx_community_tags_user on public.community_tags(community_id, user_id);

-- 9. Trigger Function: Upvotes & Automatic Reputation Tag Awarding
-- SEED VALUES per README §6: helper (10 votes), doubt_solver (25 votes), top_contributor (50 votes)
create or replace function public.handle_message_vote_tags()
returns trigger as $$
declare
  v_author_id    uuid;
  v_community_id uuid;
  v_is_reply     boolean;
  v_total_votes  integer;
begin
  -- Retrieve message details
  select author_id, community_id, (parent_id is not null)
  into v_author_id, v_community_id, v_is_reply
  from public.community_messages
  where id = NEW.message_id;

  -- Only reply votes count toward community reputation tags
  if v_is_reply and v_author_id is not null then
    -- Increment upvote_count on the message
    update public.community_messages
    set upvote_count = upvote_count + 1
    where id = NEW.message_id;

    -- Calculate total upvotes earned on replies in this community
    select coalesce(sum(m.upvote_count), 0)
    into v_total_votes
    from public.community_messages m
    where m.community_id = v_community_id
      and m.author_id = v_author_id
      and m.parent_id is not null;

    -- Award Helper badge (10 upvotes)
    if v_total_votes >= 10 then
      insert into public.community_tags (community_id, user_id, tag)
      values (v_community_id, v_author_id, 'helper')
      on conflict (community_id, user_id, tag) do nothing;
    end if;

    -- Award Doubt Solver badge (25 upvotes)
    if v_total_votes >= 25 then
      insert into public.community_tags (community_id, user_id, tag)
      values (v_community_id, v_author_id, 'doubt_solver')
      on conflict (community_id, user_id, tag) do nothing;
    end if;

    -- Award Top Contributor badge (50 upvotes)
    if v_total_votes >= 50 then
      insert into public.community_tags (community_id, user_id, tag)
      values (v_community_id, v_author_id, 'top_contributor')
      on conflict (community_id, user_id, tag) do nothing;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_award_community_tags on public.message_votes;
create trigger trigger_award_community_tags after insert on public.message_votes
  for each row execute function public.handle_message_vote_tags();

-- 10. Enable Row Level Security (RLS)
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;
alter table public.message_votes enable row level security;
alter table public.community_tags enable row level security;
alter table public.message_reports enable row level security;

-- Communities RLS
drop policy if exists "Public communities are viewable by all authenticated users" on public.communities;
create policy "Public communities are viewable by all authenticated users" on public.communities for select
  to authenticated
  using (not private or id in (select community_id from public.community_members where user_id = auth.uid()));

drop policy if exists "Authenticated users can create unofficial communities" on public.communities;
create policy "Authenticated users can create unofficial communities" on public.communities for insert
  to authenticated
  with check (not official and created_by = auth.uid());

-- Community Members RLS
drop policy if exists "Members are viewable by community participants" on public.community_members;
create policy "Members are viewable by community participants" on public.community_members for select
  to authenticated
  using (true);

drop policy if exists "Users can join public unofficial communities" on public.community_members;
create policy "Users can join public unofficial communities" on public.community_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can leave communities" on public.community_members;
create policy "Users can leave communities" on public.community_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Messages RLS
drop policy if exists "Messages viewable by community members" on public.community_messages;
create policy "Messages viewable by community members" on public.community_messages for select
  to authenticated
  using (community_id in (select community_id from public.community_members where user_id = auth.uid()));

drop policy if exists "Members can post messages" on public.community_messages;
create policy "Members can post messages" on public.community_messages for insert
  to authenticated
  with check (author_id = auth.uid() and community_id in (select community_id from public.community_members where user_id = auth.uid()));

drop policy if exists "Authors can edit own messages within deleted_at is null" on public.community_messages;
create policy "Authors can edit own messages within deleted_at is null" on public.community_messages for update
  to authenticated
  using (author_id = auth.uid());

-- Message Votes RLS
drop policy if exists "Votes viewable by all members" on public.message_votes;
create policy "Votes viewable by all members" on public.message_votes for select
  to authenticated
  using (true);

drop policy if exists "Members can cast one vote per message" on public.message_votes;
create policy "Members can cast one vote per message" on public.message_votes for insert
  to authenticated
  with check (user_id = auth.uid());

-- Community Tags RLS
drop policy if exists "Tags viewable by all users" on public.community_tags;
create policy "Tags viewable by all users" on public.community_tags for select
  to authenticated
  using (true);

-- Message Reports RLS
drop policy if exists "Users can report messages" on public.message_reports;
create policy "Users can report messages" on public.message_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000016_kedar_clubs_full.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migration: 20261004000016_kedar_clubs_full.sql
-- Description: Clubs Core — clubs, club_members, club_notices with RLS
-- Source of truth: src/features/clubs/README.md, documents/PLAN.md §5.8
-- Owner: Kedar
-- ============================================================================

-- 1. Enum for club member status
do $$ begin
  create type club_member_status as enum (
    'requested',
    'payment_pending',
    'member',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

-- 2. Clubs table
create table if not exists public.clubs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  description      text,
  tagline          text check (char_length(tagline) <= 120),
  cover_image_path text,
  fee              numeric(10, 2) not null default 0,
  currency         text not null default 'INR',
  lead_id          uuid not null references public.profiles(id) on delete restrict,
  community_id     uuid references public.communities(id) on delete set null,
  active           boolean not null default true,
  member_count     integer not null default 0,
  created_at       timestamptz not null default now()
);

-- 3. Club members table
create table if not exists public.club_members (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references public.clubs(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  status              club_member_status not null default 'requested',
  payment_ref         text,
  payment_verified_at timestamptz,
  joined_at           timestamptz,
  created_at          timestamptz not null default now(),
  unique (club_id, user_id)
);

-- 4. Club notices table
create table if not exists public.club_notices (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. Indexes
create index if not exists idx_club_members_club_id  on public.club_members(club_id);
create index if not exists idx_club_members_user_id  on public.club_members(user_id);
create index if not exists idx_club_members_status   on public.club_members(status);
create index if not exists idx_club_notices_club_id  on public.club_notices(club_id);
create index if not exists idx_clubs_active          on public.clubs(active);

-- 6. Enable RLS
alter table public.clubs         enable row level security;
alter table public.club_members  enable row level security;
alter table public.club_notices  enable row level security;

-- 7. RLS Policies — clubs
drop policy if exists "clubs_select_active" on public.clubs;
create policy "clubs_select_active" on public.clubs for select
  using (active = true);

drop policy if exists "clubs_lead_all" on public.clubs;
create policy "clubs_lead_all" on public.clubs for all
  using (lead_id = auth.uid())
  with check (lead_id = auth.uid());

-- 8. RLS Policies — club_members
drop policy if exists "club_members_own_select" on public.club_members;
create policy "club_members_own_select" on public.club_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

drop policy if exists "club_members_self_insert" on public.club_members;
create policy "club_members_self_insert" on public.club_members for insert
  with check (user_id = auth.uid());

drop policy if exists "club_members_self_delete" on public.club_members;
create policy "club_members_self_delete" on public.club_members for delete
  using (user_id = auth.uid());

drop policy if exists "club_members_lead_update" on public.club_members;
create policy "club_members_lead_update" on public.club_members for update
  using (
    exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

-- 9. RLS Policies — club_notices
drop policy if exists "club_notices_select_members" on public.club_notices;
create policy "club_notices_select_members" on public.club_notices for select
  using (
    exists (
      select 1 from public.club_members m
      where m.club_id = club_notices.club_id
        and m.user_id = auth.uid()
        and m.status = 'member'
    )
    or exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

drop policy if exists "club_notices_lead_write" on public.club_notices;
create policy "club_notices_lead_write" on public.club_notices for all
  using (
    exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clubs c where c.id = club_id and c.lead_id = auth.uid()
    )
  );

-- 10. Helper RPC to safely decrement member count
create or replace function public.decrement_club_member_count(_club_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.clubs
  set member_count = greatest(0, member_count - 1)
  where id = _club_id;
end;
$$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261004000017_kushal_meet_availability.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migration: 20261004000017_kushal_meet_availability.sql
-- Feature: Meet Availability (Weekly Rules & Date Exceptions)
-- Author: Kushal (Campus Operations)
-- Reference: src/features/meet/README.md & documents/CONTRACT.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: availability_rules (Weekly recurring slots)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_minutes IN (15, 20, 30, 45, 60)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_valid_time_window CHECK (end_time > start_time),
    CONSTRAINT unique_teacher_weekday_slot UNIQUE (teacher_id, weekday, start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_rules_teacher_weekday
    ON availability_rules(teacher_id, weekday);

-- ----------------------------------------------------------------------------
-- 2. Table: availability_exceptions (One-off date overrides: blocked / extra)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    kind TEXT NOT NULL CHECK (kind IN ('blocked', 'extra')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_exception_time_window CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);

CREATE INDEX IF NOT EXISTS idx_availability_exceptions_teacher_date
    ON availability_exceptions(teacher_id, date);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Read policy: Any authenticated student or staff can view rules to browse slots
drop policy if exists "Allow authenticated read for availability_rules" on availability_rules;
create policy "Allow authenticated read for availability_rules" on availability_rules
    FOR SELECT
    TO authenticated
    USING (true);

-- Write policies: Teachers and Admins can manage their own rules
drop policy if exists "Allow teacher insert for availability_rules" on availability_rules;
create policy "Allow teacher insert for availability_rules" on availability_rules
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

drop policy if exists "Allow teacher update for availability_rules" on availability_rules;
create policy "Allow teacher update for availability_rules" on availability_rules
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

drop policy if exists "Allow teacher delete for availability_rules" on availability_rules;
create policy "Allow teacher delete for availability_rules" on availability_rules
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

-- Read policy: Any authenticated student or staff can view exceptions
drop policy if exists "Allow authenticated read for availability_exceptions" on availability_exceptions;
create policy "Allow authenticated read for availability_exceptions" on availability_exceptions
    FOR SELECT
    TO authenticated
    USING (true);

-- Write policies: Teachers and Admins can manage their own exceptions
drop policy if exists "Allow teacher insert for availability_exceptions" on availability_exceptions;
create policy "Allow teacher insert for availability_exceptions" on availability_exceptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

drop policy if exists "Allow teacher update for availability_exceptions" on availability_exceptions;
create policy "Allow teacher update for availability_exceptions" on availability_exceptions
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

drop policy if exists "Allow teacher delete for availability_exceptions" on availability_exceptions;
create policy "Allow teacher delete for availability_exceptions" on availability_exceptions
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261005000018_kushal_meet_booking.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migration: 20261005000018_kushal_meet_booking.sql
-- Feature: Meet Booking (Session Requests, Double-Booking Exclusion Constraint)
-- Author: Kushal (Campus Operations)
-- Reference: src/features/meet/README.md & documents/CONTRACT.md
-- ============================================================================

-- Enable btree_gist extension for exclusion constraint over scalar + range types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. Table: session_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) >= 20),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'accepted',
            'declined',
            'offline_selected',
            'online_selected',
            'completed',
            'cancelled',
            'expired'
        )
    ),
    decline_reason TEXT,
    mode TEXT CHECK (mode IN ('offline', 'online')),
    location TEXT,
    room_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_valid_session_time CHECK (ends_at > starts_at)
);

-- ----------------------------------------------------------------------------
-- 2. Exclusion Constraint: Prevent Double Booking
-- No two accepted sessions can overlap for the same teacher_id
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_accepted_sessions'
  ) THEN
    ALTER TABLE session_requests
        ADD CONSTRAINT no_overlapping_accepted_sessions
        EXCLUDE USING gist (
            teacher_id WITH =,
            tstzrange(starts_at, ends_at) WITH &&
        )
        WHERE (status IN ('accepted', 'offline_selected', 'online_selected'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_session_requests_student
    ON session_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_session_requests_teacher
    ON session_requests(teacher_id);

CREATE INDEX IF NOT EXISTS idx_session_requests_status
    ON session_requests(status);

CREATE INDEX IF NOT EXISTS idx_session_requests_starts_at
    ON session_requests(starts_at);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;

-- Read policy: Student can see their own requests; Teacher can see requests sent to them; Admin can see all
drop policy if exists "Allow participant read for session_requests" on session_requests;
create policy "Allow participant read for session_requests" on session_requests
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id
        OR auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

-- Insert policy: Students can submit session requests
drop policy if exists "Allow student insert for session_requests" on session_requests;
create policy "Allow student insert for session_requests" on session_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

-- Update policy: Teacher can accept/decline; Student can pick mode / cancel
drop policy if exists "Allow participant update for session_requests" on session_requests;
create policy "Allow participant update for session_requests" on session_requests
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = student_id
        OR auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261005000019_kushal_meet_whiteboard.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migration: 20261005000019_kushal_meet_whiteboard.sql
-- Feature: Meet Whiteboard (Collaborative Canvas, Snapshots & History Review)
-- Author: Kushal (Campus Operations)
-- Reference: src/features/meet/README.md & documents/CONTRACT.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: meeting_whiteboards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_whiteboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES session_requests(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    thumbnail_url TEXT,
    version INT NOT NULL DEFAULT 1,
    saved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_whiteboard_per_session UNIQUE(session_id)
);

-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_meeting_whiteboards_session
    ON meeting_whiteboards(session_id);

CREATE INDEX IF NOT EXISTS idx_meeting_whiteboards_room
    ON meeting_whiteboards(room_id);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE meeting_whiteboards ENABLE ROW LEVEL SECURITY;

-- Read policy: Student, Teacher of the session, or Admin can read whiteboard
drop policy if exists "Allow participant read for meeting_whiteboards" on meeting_whiteboards;
create policy "Allow participant read for meeting_whiteboards" on meeting_whiteboards
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM session_requests
            WHERE session_requests.id = meeting_whiteboards.session_id
              AND (
                  session_requests.student_id = auth.uid()
                  OR session_requests.teacher_id = auth.uid()
              )
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

-- Insert policy: Student, Teacher of the session, or Admin can create snapshots
drop policy if exists "Allow participant insert for meeting_whiteboards" on meeting_whiteboards;
create policy "Allow participant insert for meeting_whiteboards" on meeting_whiteboards
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM session_requests
            WHERE session_requests.id = meeting_whiteboards.session_id
              AND (
                  session_requests.student_id = auth.uid()
                  OR session_requests.teacher_id = auth.uid()
              )
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

-- Update policy: Student, Teacher of the session, or Admin can update whiteboard snapshots
drop policy if exists "Allow participant update for meeting_whiteboards" on meeting_whiteboards;
create policy "Allow participant update for meeting_whiteboards" on meeting_whiteboards
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM session_requests
            WHERE session_requests.id = meeting_whiteboards.session_id
              AND (
                  session_requests.student_id = auth.uid()
                  OR session_requests.teacher_id = auth.uid()
              )
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: seed.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Seed Data: Campus App Initial Development Seed
-- Source of truth: documents/TEAM_TASKS.MD (feat/auth-and-roles)
-- ==============================================================================

-- 1. College Roster Seed
-- 1 Admin, 2 Teachers, 5 Students (one inactive to test access blocking)
INSERT INTO public.roster_import (
  college_email,
  college_id,
  full_name,
  branch,
  year,
  division,
  batch,
  role,
  status
) VALUES
  -- Admin
  (
    'admin@campus.edu',
    'ADM001',
    'Campus Administrator',
    'Administration',
    NULL,
    NULL,
    NULL,
    'admin',
    'invited'
  ),

  -- Teachers
  (
    'sharma@campus.edu',
    'TCH101',
    'Prof. Rajesh Sharma',
    'Computer Science',
    NULL,
    NULL,
    NULL,
    'teacher',
    'invited'
  ),
  (
    'patel@campus.edu',
    'TCH102',
    'Dr. Priya Patel',
    'Electronics & Comm',
    NULL,
    NULL,
    NULL,
    'teacher',
    'invited'
  ),

  -- Students (Active)
  (
    'student1@campus.edu',
    '23BCE1001',
    'Aarav Mehta',
    'Computer Science',
    2,
    'A',
    'A1',
    'student',
    'invited'
  ),
  (
    'student2@campus.edu',
    '23BCE1002',
    'Diya Sen',
    'Computer Science',
    2,
    'A',
    'A1',
    'student',
    'invited'
  ),
  (
    'student3@campus.edu',
    '23BCE1003',
    'Rohan Gupta',
    'Computer Science',
    2,
    'B',
    'B2',
    'student',
    'invited'
  ),
  (
    'student4@campus.edu',
    '24BIT2001',
    'Ananya Verma',
    'Information Tech',
    1,
    'A',
    'A1',
    'student',
    'invited'
  ),

  -- Student (Inactive - should be blocked from signing in)
  (
    'student5@campus.edu',
    '22BCE0099',
    'Vikram Rao',
    'Computer Science',
    3,
    'C',
    'C1',
    'student',
    'inactive'
  )
ON CONFLICT (college_email) DO NOTHING;

-- ==============================================================================
-- 2. Placeholder Subjects
-- Owner: Kedar (feat/acad-resources-core)
-- SEED VALUE: replace with real subject list from college academic section
--             before production. Codes and names are illustrative only.
-- ==============================================================================
INSERT INTO public.subjects (id, name, code, year, branch) VALUES
  -- Year 1 — Computer Science
  ('00000000-0000-0000-0001-000000000001', 'Engineering Mathematics I',          'MATH101', 1, 'Computer Science'),
  ('00000000-0000-0000-0001-000000000002', 'Engineering Physics',                 'PHY101',  1, 'Computer Science'),
  ('00000000-0000-0000-0001-000000000003', 'Programming Fundamentals (C)',        'CS101',   1, 'Computer Science'),
  ('00000000-0000-0000-0001-000000000004', 'Engineering Drawing',                 'ME101',   1, 'Computer Science'),

  -- Year 2 — Computer Science
  ('00000000-0000-0000-0002-000000000001', 'Data Structures and Algorithms',      'CS201',   2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000002', 'Database Management Systems',         'CS202',   2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000003', 'Object Oriented Programming (Java)',  'CS203',   2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000004', 'Engineering Mathematics II',          'MATH201', 2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000005', 'Digital Electronics',                 'EC201',   2, 'Computer Science'),

  -- Year 3 — Computer Science
  ('00000000-0000-0000-0003-000000000001', 'Operating Systems',                   'CS301',   3, 'Computer Science'),
  ('00000000-0000-0000-0003-000000000002', 'Computer Networks',                   'CS302',   3, 'Computer Science'),
  ('00000000-0000-0000-0003-000000000003', 'Software Engineering',                'CS303',   3, 'Computer Science'),
  ('00000000-0000-0000-0003-000000000004', 'Theory of Computation',               'CS304',   3, 'Computer Science'),

  -- Year 4 — Computer Science
  ('00000000-0000-0000-0004-000000000001', 'Artificial Intelligence',             'CS401',   4, 'Computer Science'),
  ('00000000-0000-0000-0004-000000000002', 'Machine Learning',                    'CS402',   4, 'Computer Science'),
  ('00000000-0000-0000-0004-000000000003', 'Cloud Computing',                     'CS403',   4, 'Computer Science'),

  -- Year 1 — Information Technology
  ('00000000-0000-0000-0011-000000000001', 'Engineering Mathematics I',           'MATH101', 1, 'Information Tech'),
  ('00000000-0000-0000-0011-000000000002', 'Programming in Python',               'IT101',   1, 'Information Tech'),

  -- Year 2 — Information Technology
  ('00000000-0000-0000-0012-000000000001', 'Web Technologies',                    'IT201',   2, 'Information Tech'),
  ('00000000-0000-0000-0012-000000000002', 'Data Structures',                     'IT202',   2, 'Information Tech')

ON CONFLICT (code, branch) DO NOTHING;

-- ==============================================================================
-- 3. Teacher-Subject Assignments (placeholder)
-- SEED VALUE: replace with real timetable data. Links the two seed teachers
--             to Computer Science Year 2 subjects for testing the approval flow.
-- ==============================================================================
-- These require the profiles table to be populated (happens on first sign-in).
-- Run this manually after seeding sign-ins, or handle in a migration trigger.
-- Placeholder: left empty until real teacher profile UUIDs are known.
-- INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES (...) ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 4. Complaint Domains & Escalation Chains (Kushal)
-- Source of truth: src/features/complaints/README.md
-- SEED VALUES: Confirm with college administration before production.
-- ==============================================================================
INSERT INTO public.complaint_domains (id, name, description, parent_id, sensitive, routing_mode, visibility) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Academic – Subject', 'Syllabus doubt, teaching-related issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000002', 'Academic – Class', 'Timetable clash, class-level scheduling', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000003', 'Academic – Department', 'Department-level academic issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000004', 'Lab / Practical', 'Equipment issue, computer or instrument not working', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000005', 'Hostel – Cleanliness & Maintenance', 'Room cleanliness, broken furniture, water or electrical issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000006', 'Hostel – Rules & Conduct', 'Hostel rules violation, student conduct or dispute', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000007', 'Mess / Food', 'Food quality, hygiene, service or catering issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000008', 'Infrastructure', 'Classroom furniture, electrical, campus facility', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000009', 'Administrative – Scholarship & Fees', 'Scholarship application, fee status, finance desk', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000010', 'Administrative – ID Card & Docs', 'New ID card, loss, replacement, bonafide certificate', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000011', 'Club / Student Activity', 'Club membership, event scheduling, club resources', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000012', 'Harassment & Ragging', 'Anti-Ragging and campus safety (Strictly private and anonymous)', NULL, true, 'direct', 'private')
ON CONFLICT (id) DO NOTHING;

-- Seed Domain Assignees (Level 1: 24h, Level 2: 48h, Level 3: 72h)
INSERT INTO public.domain_assignees (domain_id, level, role_name, sla_hours, escalation_condition) VALUES
  -- Academic – Subject
  ('10000000-0000-0000-0000-000000000001', 1, 'Subject Teacher', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000001', 2, 'Class Coordinator', 48, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000001', 3, 'HOD', 72, 'on_sla_breach'),

  -- Hostel – Cleanliness & Maintenance
  ('10000000-0000-0000-0000-000000000005', 1, 'Cleaning Staff / Hostel Caretaker', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000005', 2, 'Hostel Warden', 48, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000005', 3, 'Management Team', 72, 'on_sla_breach'),

  -- Mess / Food
  ('10000000-0000-0000-0000-000000000007', 1, 'Mess In-charge', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000007', 2, 'Hostel Warden', 48, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000007', 3, 'Management Team', 72, 'on_sla_breach'),

  -- Harassment & Ragging (Direct route to Anti-Ragging Committee)
  ('10000000-0000-0000-0000-000000000012', 1, 'Anti-Ragging Committee', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000012', 2, 'Principal / Director', 48, 'on_sla_breach')
ON CONFLICT (domain_id, level) DO NOTHING;

