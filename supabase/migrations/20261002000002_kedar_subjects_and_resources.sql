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
CREATE TYPE IF NOT EXISTS public.resource_type AS ENUM ('notes', 'pyq', 'slides', 'other');
CREATE TYPE IF NOT EXISTS public.resource_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE IF NOT EXISTS public.processing_status AS ENUM ('not_started', 'processing', 'ready', 'failed');

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

CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON public.resources
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
CREATE POLICY "All authenticated users can read subjects"
  ON public.subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- TEACHER_SUBJECTS: teachers read their own; admins manage all
CREATE POLICY "Teachers can read their own subject assignments"
  ON public.teacher_subjects FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage teacher_subjects"
  ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- APP_CONFIG: all authenticated users can read; only admin can write
CREATE POLICY "All authenticated users can read app_config"
  ON public.app_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage app_config"
  ON public.app_config FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RESOURCES policies:

-- Students: can read their own pending uploads + all approved resources
CREATE POLICY "Students can read approved resources and own pending"
  ON public.resources FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR uploader_id = auth.uid()
  );

-- Teachers: can read all resources for subjects they teach (plus approved of all)
CREATE POLICY "Teachers can read resources for their subjects"
  ON public.resources FOR SELECT TO authenticated
  USING (
    public.is_teacher() AND (
      status = 'approved'
      OR public.teaches_subject(subject_id)
      OR uploader_id = auth.uid()
    )
  );

-- Admins can read everything
CREATE POLICY "Admins can read all resources"
  ON public.resources FOR SELECT TO authenticated
  USING (public.is_admin());

-- Any authenticated user can insert (uploader_id must equal their own uid)
CREATE POLICY "Authenticated users can upload resources"
  ON public.resources FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid());

-- Uploader can delete their own PENDING resource
CREATE POLICY "Uploader can delete own pending resource"
  ON public.resources FOR DELETE TO authenticated
  USING (uploader_id = auth.uid() AND status = 'pending');

-- Teacher can update (approve/reject) resources for subjects they teach
CREATE POLICY "Teachers can approve or reject resources for their subjects"
  ON public.resources FOR UPDATE TO authenticated
  USING (public.is_teacher() AND public.teaches_subject(subject_id))
  WITH CHECK (public.is_teacher() AND public.teaches_subject(subject_id));

-- Admin can update anything
CREATE POLICY "Admins can update any resource"
  ON public.resources FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin can delete anything
CREATE POLICY "Admins can delete any resource"
  ON public.resources FOR DELETE TO authenticated
  USING (public.is_admin());
