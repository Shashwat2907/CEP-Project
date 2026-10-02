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
