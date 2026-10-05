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

DROP TRIGGER IF EXISTS trg_complaints_updated_at ON public.complaints;
CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON public.complaints
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
CREATE POLICY "Authenticated users can read complaint domains"
  ON public.complaint_domains FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage complaint domains"
  ON public.complaint_domains FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Domain Assignees: Everyone authenticated can read routing rules.
-- Only admins can manage assignees.
CREATE POLICY "Authenticated users can read domain assignees"
  ON public.domain_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage domain assignees"
  ON public.domain_assignees FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Complaints Policies:
-- Read access:
-- - Author can always read their own complaint
-- - Assigned handler can read
-- - Admins can read all
-- - For non-sensitive domains: other authenticated users can read for public tracking
CREATE POLICY "Users can read complaints"
  ON public.complaints FOR SELECT
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
CREATE POLICY "Users can insert complaints"
  ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Update access:
-- - Author can update (e.g. reopen or confirm resolution)
-- - Assigned handler or admin can update status and resolution note
CREATE POLICY "Users and handlers can update complaints"
  ON public.complaints FOR UPDATE
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
CREATE POLICY "Users can view complaint events"
  ON public.complaint_events FOR SELECT
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
CREATE POLICY "Authenticated users can record complaint events"
  ON public.complaint_events FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    OR actor_id IS NULL
    OR public.is_admin()
  );

-- 5. Attachments Policies:
CREATE POLICY "Users can view attachments of viewable complaints"
  ON public.complaint_attachments FOR SELECT
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

CREATE POLICY "Authors can upload attachments"
  ON public.complaint_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_attachments.complaint_id
        AND (c.author_id = auth.uid() OR public.is_admin())
    )
  );
