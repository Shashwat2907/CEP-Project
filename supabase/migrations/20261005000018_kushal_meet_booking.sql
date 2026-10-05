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
CREATE POLICY "Allow participant read for session_requests"
    ON session_requests
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
CREATE POLICY "Allow student insert for session_requests"
    ON session_requests
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
CREATE POLICY "Allow participant update for session_requests"
    ON session_requests
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
