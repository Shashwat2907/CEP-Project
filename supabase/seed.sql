-- ==============================================================================
-- Seed Data: Campus App Initial Development Seed
-- Source of truth: documents/TEAM_TASKS.MD (feat/auth-and-roles)
-- ==============================================================================

-- 1. College Roster Seed
-- 1 Admin, 2 Teachers, 5 Students (one inactive to test access blocking)
INSERT INTO public.roster_import (
  college_email,
  college_id,
  full_name,
  branch,
  year,
  division,
  batch,
  role,
  status
) VALUES
  -- Admin
  (
    'admin@campus.edu',
    'ADM001',
    'Campus Administrator',
    'Administration',
    NULL,
    NULL,
    NULL,
    'admin',
    'invited'
  ),

  -- Teachers
  (
    'sharma@campus.edu',
    'TCH101',
    'Prof. Rajesh Sharma',
    'Computer Science',
    NULL,
    NULL,
    NULL,
    'teacher',
    'invited'
  ),
  (
    'patel@campus.edu',
    'TCH102',
    'Dr. Priya Patel',
    'Electronics & Comm',
    NULL,
    NULL,
    NULL,
    'teacher',
    'invited'
  ),

  -- Students (Active)
  (
    'student1@campus.edu',
    '23BCE1001',
    'Aarav Mehta',
    'Computer Science',
    2,
    'A',
    'A1',
    'student',
    'invited'
  ),
  (
    'student2@campus.edu',
    '23BCE1002',
    'Diya Sen',
    'Computer Science',
    2,
    'A',
    'A1',
    'student',
    'invited'
  ),
  (
    'student3@campus.edu',
    '23BCE1003',
    'Rohan Gupta',
    'Computer Science',
    2,
    'B',
    'B2',
    'student',
    'invited'
  ),
  (
    'student4@campus.edu',
    '24BIT2001',
    'Ananya Verma',
    'Information Tech',
    1,
    'A',
    'A1',
    'student',
    'invited'
  ),

  -- Student (Inactive - should be blocked from signing in)
  (
    'student5@campus.edu',
    '22BCE0099',
    'Vikram Rao',
    'Computer Science',
    3,
    'C',
    'C1',
    'student',
    'inactive'
  )
ON CONFLICT (college_email) DO NOTHING;

-- ==============================================================================
-- 2. Placeholder Subjects
-- Owner: Kedar (feat/acad-resources-core)
-- SEED VALUE: replace with real subject list from college academic section
--             before production. Codes and names are illustrative only.
-- ==============================================================================
INSERT INTO public.subjects (id, name, code, year, branch) VALUES
  -- Year 1 — Computer Science
  ('00000000-0000-0000-0001-000000000001', 'Engineering Mathematics I',          'MATH101', 1, 'Computer Science'),
  ('00000000-0000-0000-0001-000000000002', 'Engineering Physics',                 'PHY101',  1, 'Computer Science'),
  ('00000000-0000-0000-0001-000000000003', 'Programming Fundamentals (C)',        'CS101',   1, 'Computer Science'),
  ('00000000-0000-0000-0001-000000000004', 'Engineering Drawing',                 'ME101',   1, 'Computer Science'),

  -- Year 2 — Computer Science
  ('00000000-0000-0000-0002-000000000001', 'Data Structures and Algorithms',      'CS201',   2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000002', 'Database Management Systems',         'CS202',   2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000003', 'Object Oriented Programming (Java)',  'CS203',   2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000004', 'Engineering Mathematics II',          'MATH201', 2, 'Computer Science'),
  ('00000000-0000-0000-0002-000000000005', 'Digital Electronics',                 'EC201',   2, 'Computer Science'),

  -- Year 3 — Computer Science
  ('00000000-0000-0000-0003-000000000001', 'Operating Systems',                   'CS301',   3, 'Computer Science'),
  ('00000000-0000-0000-0003-000000000002', 'Computer Networks',                   'CS302',   3, 'Computer Science'),
  ('00000000-0000-0000-0003-000000000003', 'Software Engineering',                'CS303',   3, 'Computer Science'),
  ('00000000-0000-0000-0003-000000000004', 'Theory of Computation',               'CS304',   3, 'Computer Science'),

  -- Year 4 — Computer Science
  ('00000000-0000-0000-0004-000000000001', 'Artificial Intelligence',             'CS401',   4, 'Computer Science'),
  ('00000000-0000-0000-0004-000000000002', 'Machine Learning',                    'CS402',   4, 'Computer Science'),
  ('00000000-0000-0000-0004-000000000003', 'Cloud Computing',                     'CS403',   4, 'Computer Science'),

  -- Year 1 — Information Technology
  ('00000000-0000-0000-0011-000000000001', 'Engineering Mathematics I',           'MATH101', 1, 'Information Tech'),
  ('00000000-0000-0000-0011-000000000002', 'Programming in Python',               'IT101',   1, 'Information Tech'),

  -- Year 2 — Information Technology
  ('00000000-0000-0000-0012-000000000001', 'Web Technologies',                    'IT201',   2, 'Information Tech'),
  ('00000000-0000-0000-0012-000000000002', 'Data Structures',                     'IT202',   2, 'Information Tech')

ON CONFLICT (code, branch) DO NOTHING;

-- ==============================================================================
-- 3. Teacher-Subject Assignments (placeholder)
-- SEED VALUE: replace with real timetable data. Links the two seed teachers
--             to Computer Science Year 2 subjects for testing the approval flow.
-- ==============================================================================
-- These require the profiles table to be populated (happens on first sign-in).
-- Run this manually after seeding sign-ins, or handle in a migration trigger.
-- Placeholder: left empty until real teacher profile UUIDs are known.
-- INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES (...) ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 4. Complaint Domains & Escalation Chains (Kushal)
-- Source of truth: src/features/complaints/README.md
-- SEED VALUES: Confirm with college administration before production.
-- ==============================================================================
INSERT INTO public.complaint_domains (id, name, description, parent_id, sensitive, routing_mode, visibility) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Academic – Subject', 'Syllabus doubt, teaching-related issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000002', 'Academic – Class', 'Timetable clash, class-level scheduling', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000003', 'Academic – Department', 'Department-level academic issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000004', 'Lab / Practical', 'Equipment issue, computer or instrument not working', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000005', 'Hostel – Cleanliness & Maintenance', 'Room cleanliness, broken furniture, water or electrical issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000006', 'Hostel – Rules & Conduct', 'Hostel rules violation, student conduct or dispute', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000007', 'Mess / Food', 'Food quality, hygiene, service or catering issue', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000008', 'Infrastructure', 'Classroom furniture, electrical, campus facility', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000009', 'Administrative – Scholarship & Fees', 'Scholarship application, fee status, finance desk', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000010', 'Administrative – ID Card & Docs', 'New ID card, loss, replacement, bonafide certificate', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000011', 'Club / Student Activity', 'Club membership, event scheduling, club resources', NULL, false, 'chain', 'public'),
  ('10000000-0000-0000-0000-000000000012', 'Harassment & Ragging', 'Anti-Ragging and campus safety (Strictly private and anonymous)', NULL, true, 'direct', 'private')
ON CONFLICT (id) DO NOTHING;

-- Seed Domain Assignees (Level 1: 24h, Level 2: 48h, Level 3: 72h)
INSERT INTO public.domain_assignees (domain_id, level, role_name, sla_hours, escalation_condition) VALUES
  -- Academic – Subject
  ('10000000-0000-0000-0000-000000000001', 1, 'Subject Teacher', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000001', 2, 'Class Coordinator', 48, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000001', 3, 'HOD', 72, 'on_sla_breach'),

  -- Hostel – Cleanliness & Maintenance
  ('10000000-0000-0000-0000-000000000005', 1, 'Cleaning Staff / Hostel Caretaker', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000005', 2, 'Hostel Warden', 48, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000005', 3, 'Management Team', 72, 'on_sla_breach'),

  -- Mess / Food
  ('10000000-0000-0000-0000-000000000007', 1, 'Mess In-charge', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000007', 2, 'Hostel Warden', 48, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000007', 3, 'Management Team', 72, 'on_sla_breach'),

  -- Harassment & Ragging (Direct route to Anti-Ragging Committee)
  ('10000000-0000-0000-0000-000000000012', 1, 'Anti-Ragging Committee', 24, 'on_sla_breach'),
  ('10000000-0000-0000-0000-000000000012', 2, 'Principal / Director', 48, 'on_sla_breach')
ON CONFLICT (domain_id, level) DO NOTHING;
