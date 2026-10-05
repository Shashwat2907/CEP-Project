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
CREATE POLICY "saved_resources_select_own"
  ON public.saved_resources
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can save resources for themselves only
CREATE POLICY "saved_resources_insert_own"
  ON public.saved_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "saved_resources_delete_own"
  ON public.saved_resources
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
