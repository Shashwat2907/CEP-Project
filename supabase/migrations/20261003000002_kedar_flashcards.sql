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

CREATE TRIGGER trg_flashcard_decks_updated_at
  BEFORE UPDATE ON public.flashcard_decks
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

CREATE TRIGGER trg_flashcard_reviews_updated_at
  BEFORE UPDATE ON public.flashcard_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.flashcard_decks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- FLASHCARD_DECKS: users can only see and manage their own decks
CREATE POLICY "Users can read own flashcard decks"
  ON public.flashcard_decks FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create own flashcard decks"
  ON public.flashcard_decks FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own flashcard decks"
  ON public.flashcard_decks FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own flashcard decks"
  ON public.flashcard_decks FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- FLASHCARDS: readable if they own the parent deck
CREATE POLICY "Users can read flashcards for own decks"
  ON public.flashcards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_decks d
      WHERE d.id = flashcards.deck_id AND (d.owner_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users can manage flashcards for own decks"
  ON public.flashcards FOR ALL TO authenticated
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
CREATE POLICY "Users can read own flashcard reviews"
  ON public.flashcard_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can insert own flashcard reviews"
  ON public.flashcard_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own flashcard reviews"
  ON public.flashcard_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
