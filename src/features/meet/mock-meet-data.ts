import type {
  AvailabilityRule,
  AvailabilityException,
  SessionRequest,
  TeacherSummary,
  WhiteboardRecord,
} from './schema'

/**
 * In-memory Mock Store for Campus Meet Feature
 * Enables zero-dependency local development and testing when Supabase is not running.
 * Mirrors supabase/seed.sql and mock-roster.ts.
 */

export const MOCK_TEACHERS: TeacherSummary[] = [
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Prof. Rajesh Sharma',
    department: 'Computer Science',
    office_hours_text: 'Cabin 304, Department of Computer Engineering (Mon & Wed 2-4 PM)',
    avatar_url: null,
    email: 'sharma@campus.edu',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Dr. Priya Patel',
    department: 'Electronics & Comm',
    office_hours_text: 'Cabin 412, Department of ENTC (Tue & Thu 10-12 AM)',
    avatar_url: null,
    email: 'patel@campus.edu',
  },
]

export const MOCK_AVAILABILITY_RULES: AvailabilityRule[] = [
  {
    id: '11111111-0000-0000-0000-000000000001',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    weekday: 1, // Monday
    start_time: '14:00',
    end_time: '16:00',
    slot_minutes: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000002',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    weekday: 3, // Wednesday
    start_time: '14:00',
    end_time: '16:00',
    slot_minutes: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000003',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    weekday: 5, // Friday
    start_time: '15:00',
    end_time: '17:00',
    slot_minutes: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-0000-0000-0000-000000000001',
    teacher_id: '00000000-0000-0000-0000-000000000003',
    weekday: 2, // Tuesday
    start_time: '10:00',
    end_time: '12:00',
    slot_minutes: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    teacher_id: '00000000-0000-0000-0000-000000000003',
    weekday: 4, // Thursday
    start_time: '10:00',
    end_time: '12:00',
    slot_minutes: 30,
    created_at: new Date().toISOString(),
  },
]

export const MOCK_AVAILABILITY_EXCEPTIONS: AvailabilityException[] = []

export const MOCK_SESSION_REQUESTS: SessionRequest[] = []

export const MOCK_WHITEBOARDS = new Map<string, WhiteboardRecord>()
