/**
 * Mock Roster and Local Dev Authentication Store
 * Mirrors supabase/seed.sql for zero-dependency local development and testing.
 * Source of truth: documents/PLAN.MD §4, §4.1, supabase/seed.sql
 */

export interface MockRosterEntry {
  id: string
  college_email: string
  college_id: string
  full_name: string
  branch: string
  year: number | null
  division: string | null
  batch: string | null
  role: 'student' | 'teacher' | 'admin'
  status: 'active' | 'invited' | 'inactive'
}

export const MOCK_ROSTER: MockRosterEntry[] = [
  // Admin
  {
    id: '00000000-0000-0000-0000-000000000001',
    college_email: 'admin@campus.edu',
    college_id: 'ADM001',
    full_name: 'Campus Administrator',
    branch: 'Administration',
    year: null,
    division: null,
    batch: null,
    role: 'admin',
    status: 'active',
  },
  // Teachers
  {
    id: '00000000-0000-0000-0000-000000000002',
    college_email: 'sharma@campus.edu',
    college_id: 'TCH101',
    full_name: 'Prof. Rajesh Sharma',
    branch: 'Computer Science',
    year: null,
    division: null,
    batch: null,
    role: 'teacher',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    college_email: 'patel@campus.edu',
    college_id: 'TCH102',
    full_name: 'Dr. Priya Patel',
    branch: 'Electronics & Comm',
    year: null,
    division: null,
    batch: null,
    role: 'teacher',
    status: 'active',
  },
  // Students (Active)
  {
    id: '00000000-0000-0000-0000-000000000010',
    college_email: 'student1@campus.edu',
    college_id: '23BCE1001',
    full_name: 'Aarav Mehta',
    branch: 'Computer Science',
    year: 2,
    division: 'A',
    batch: 'A1',
    role: 'student',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    college_email: 'student2@campus.edu',
    college_id: '23BCE1002',
    full_name: 'Diya Sen',
    branch: 'Computer Science',
    year: 2,
    division: 'A',
    batch: 'A1',
    role: 'student',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    college_email: 'student3@campus.edu',
    college_id: '23BCE1003',
    full_name: 'Rohan Gupta',
    branch: 'Computer Science',
    year: 2,
    division: 'B',
    batch: 'B2',
    role: 'student',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    college_email: 'student4@campus.edu',
    college_id: '24BIT2001',
    full_name: 'Ananya Verma',
    branch: 'Information Tech',
    year: 1,
    division: 'A',
    batch: 'A1',
    role: 'student',
    status: 'active',
  },
  // Inactive Student (blocked)
  {
    id: '00000000-0000-0000-0000-000000000099',
    college_email: 'student5@campus.edu',
    college_id: '22BCE0099',
    full_name: 'Vikram Rao',
    branch: 'Computer Science',
    year: 3,
    division: 'C',
    batch: 'C1',
    role: 'student',
    status: 'inactive',
  },
]

// In-memory mock OTP store for local development
export const mockIdentityOtpStore = new Map<
  string,
  { code: string; expiresAt: number }
>()
