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
CREATE POLICY "Allow authenticated read for availability_rules"
    ON availability_rules
    FOR SELECT
    TO authenticated
    USING (true);

-- Write policies: Teachers and Admins can manage their own rules
CREATE POLICY "Allow teacher insert for availability_rules"
    ON availability_rules
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

CREATE POLICY "Allow teacher update for availability_rules"
    ON availability_rules
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

CREATE POLICY "Allow teacher delete for availability_rules"
    ON availability_rules
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
CREATE POLICY "Allow authenticated read for availability_exceptions"
    ON availability_exceptions
    FOR SELECT
    TO authenticated
    USING (true);

-- Write policies: Teachers and Admins can manage their own exceptions
CREATE POLICY "Allow teacher insert for availability_exceptions"
    ON availability_exceptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

CREATE POLICY "Allow teacher update for availability_exceptions"
    ON availability_exceptions
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );

CREATE POLICY "Allow teacher delete for availability_exceptions"
    ON availability_exceptions
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role_primary = 'admin'
        )
    );
