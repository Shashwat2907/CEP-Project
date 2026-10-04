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

CREATE TRIGGER trg_doubt_threads_updated_at
  BEFORE UPDATE ON public.doubt_threads
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
CREATE POLICY "Users can read own doubt threads"
  ON public.doubt_threads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create own doubt threads"
  ON public.doubt_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own doubt threads"
  ON public.doubt_threads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own doubt threads"
  ON public.doubt_threads FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- DOUBT_MESSAGES: Accessible only if user owns the parent thread
CREATE POLICY "Users can read messages for own doubt threads"
  ON public.doubt_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = thread_id
        AND (dt.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users can create messages for own doubt threads"
  ON public.doubt_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = thread_id
        AND dt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages for own doubt threads"
  ON public.doubt_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = thread_id
        AND (dt.user_id = auth.uid() OR public.is_admin())
    )
  );
