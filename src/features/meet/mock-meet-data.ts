/**
 * Mock Meet Data & In-Memory Store
 * Used for zero-dependency local development when Supabase is offline.
 * Source of truth: src/features/meet/README.md & documents/CONTRACT.md
 */

import type {
  TeacherSummary,
  AvailabilityRule,
  GeneratedSlot,
  SessionRequest,
} from './schema'

export const MOCK_TEACHERS: TeacherSummary[] = [
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Prof. Rajesh Sharma',
    department: 'Computer Science & Engineering',
    office_hours_text: 'Mon, Wed, Fri 2:00 PM – 4:00 PM · Room 102, Block A',
    avatar_url: null,
    email: 'sharma@campus.edu',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Dr. Priya Patel',
    department: 'Electronics & Communication',
    office_hours_text: 'Tue, Thu 11:00 AM – 1:00 PM · Room 304, Tech Park',
    avatar_url: null,
    email: 'patel@campus.edu',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    full_name: 'Dr. Ramesh Iyer',
    department: 'Information Technology',
    office_hours_text: 'Mon to Thu 3:00 PM – 5:00 PM · Lab 3, Innovation Block',
    avatar_url: null,
    email: 'iyer@campus.edu',
  },
]

export const MOCK_AVAILABILITY_RULES: AvailabilityRule[] = [
  {
    id: 'r1000000-0000-0000-0000-000000000001',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    weekday: 1, // Monday
    start_time: '14:00:00',
    end_time: '16:00:00',
    slot_minutes: 30,
  },
  {
    id: 'r1000000-0000-0000-0000-000000000002',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    weekday: 3, // Wednesday
    start_time: '14:00:00',
    end_time: '16:00:00',
    slot_minutes: 30,
  },
  {
    id: 'r1000000-0000-0000-0000-000000000003',
    teacher_id: '00000000-0000-0000-0000-000000000003',
    weekday: 2, // Tuesday
    start_time: '11:00:00',
    end_time: '13:00:00',
    slot_minutes: 30,
  },
]

export const MOCK_SESSION_REQUESTS: SessionRequest[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    student_id: '00000000-0000-0000-0000-000000000010', // student Aarav Mehta
    teacher_id: '00000000-0000-0000-0000-000000000002', // Prof. Rajesh Sharma
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 86400000 + 1800000).toISOString(),
    reason: 'Distributed Systems Raft Consensus Doubt Discussion and Semester Project Mentorship',
    status: 'accepted',
    mode: 'online',
    room_id: 'meet-s1000000-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    teacher: {
      full_name: 'Prof. Rajesh Sharma',
      department: 'Computer Science & Engineering',
      office_hours_text: 'Mon-Thu 2:00 PM - 4:00 PM (Cabin CS-204)',
    },
    student: {
      full_name: 'Aarav Mehta',
      email: 'student@campus.edu',
    },
  },
  {
    id: 'a2000000-0000-0000-0000-000000000002',
    student_id: '00000000-0000-0000-0000-000000000010',
    teacher_id: '00000000-0000-0000-0000-000000000003',
    starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 2 * 86400000 + 1800000).toISOString(),
    reason: 'Digital Signal Processing Filter Design Review and Questions regarding assignment',
    status: 'pending',
    mode: 'offline',
    location: 'Cabin EC-108',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    teacher: {
      full_name: 'Dr. Priya Patel',
      department: 'Electronics & Communication',
      office_hours_text: 'Tue-Fri 11:00 AM - 1:00 PM (Cabin EC-108)',
    },
    student: {
      full_name: 'Aarav Mehta',
      email: 'student@campus.edu',
    },
  },
]

export const mockSessionRequestsStore: SessionRequest[] = [...MOCK_SESSION_REQUESTS]
export const mockAvailabilityRulesStore: AvailabilityRule[] = [...MOCK_AVAILABILITY_RULES]
