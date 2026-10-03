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
CREATE POLICY "Users can read chunks of accessible resources"
  ON public.resource_chunks FOR SELECT TO authenticated
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
CREATE POLICY "Admins and teachers can manage resource chunks"
  ON public.resource_chunks FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_teacher())
  WITH CHECK (public.is_admin() OR public.is_teacher());

-- AI Usage policies:
-- Users can see their own daily usage; admins can see all
CREATE POLICY "Users can read own ai usage"
  ON public.ai_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can insert/update their own usage
CREATE POLICY "Users can update own ai usage"
  ON public.ai_usage FOR ALL TO authenticated
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
