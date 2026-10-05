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

DROP TRIGGER IF EXISTS trg_sync_complaint_upvotes_count ON public.complaint_upvotes;
CREATE TRIGGER trg_sync_complaint_upvotes_count
  AFTER INSERT OR DELETE ON public.complaint_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_complaint_upvotes_count();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) FOR UPVOTES
-- ==============================================================================

ALTER TABLE public.complaint_upvotes ENABLE ROW LEVEL SECURITY;

-- 1. Read: Authenticated users can view upvotes for non-sensitive complaints
CREATE POLICY "Users can read upvotes for viewable complaints"
  ON public.complaint_upvotes FOR SELECT
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
CREATE POLICY "Users can upvote non-sensitive complaints"
  ON public.complaint_upvotes FOR INSERT
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
CREATE POLICY "Users can remove their own upvote"
  ON public.complaint_upvotes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
