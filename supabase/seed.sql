-- Campus Super-App: seed data for development
-- Safe to run repeatedly (uses INSERT ... ON CONFLICT DO NOTHING)
-- NEVER run against production; production has real roster data.

-- ============================================================
-- Seed users must be created through Supabase Auth in local dev.
-- Run: supabase auth user create --email admin@college.edu
-- Then copy the UUID here.
-- ============================================================

-- Placeholder: profiles will be auto-created from roster on first OTP sign-in.
-- seed.sql is used for reference data only at this stage.

-- Example domain seeds (SEED VALUE: confirm routing chains with administration)
-- INSERT INTO complaint_domains (id, parent_id, name, visibility, routing_mode)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', NULL, 'Hostel',         'public',    'chain'),
--   ('00000000-0000-0000-0000-000000000002', NULL, 'Mess',           'public',    'chain'),
--   ('00000000-0000-0000-0000-000000000003', NULL, 'Infrastructure', 'public',    'chain'),
--   ('00000000-0000-0000-0000-000000000004', NULL, 'Academics',      'public',    'chain'),
--   ('00000000-0000-0000-0000-000000000005', NULL, 'Administration', 'public',    'chain'),
--   ('00000000-0000-0000-0000-000000000006', NULL, 'Ragging',        'sensitive', 'direct_committee'),
--   ('00000000-0000-0000-0000-000000000007', NULL, 'Harassment',     'sensitive', 'direct_committee')
-- ON CONFLICT DO NOTHING;
