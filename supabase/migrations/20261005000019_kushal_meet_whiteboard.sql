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
CREATE POLICY "Allow participant read for meeting_whiteboards"
    ON meeting_whiteboards
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
CREATE POLICY "Allow participant insert for meeting_whiteboards"
    ON meeting_whiteboards
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
CREATE POLICY "Allow participant update for meeting_whiteboards"
    ON meeting_whiteboards
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
