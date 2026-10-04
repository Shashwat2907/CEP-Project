import { describe, it, expect, vi } from 'vitest'
import { parseCsvRows } from '@/features/profile/csv'
import {
  importRosterCsv,
  getProfile,
  updateProfile,
  type ProfileDbClient,
} from '@/features/profile/actions'
import { RosterRowSchema, ProfileUpdateSchema } from '@/features/profile/schema'

describe('Roster Import & Profiles Feature Suite (PLAN.md §4.1, §5.4)', () => {
  // 1. CSV Parser
  describe('CSV Row Parser', () => {
    it('correctly parses headers and rows', () => {
      const csv = `college_email,college_id,full_name,role\naarav@college.edu,23BCE1001,Aarav Sharma,student`
      const rows = parseCsvRows(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].college_email).toBe('aarav@college.edu')
      expect(rows[0].college_id).toBe('23BCE1001')
      expect(rows[0].full_name).toBe('Aarav Sharma')
      expect(rows[0].role).toBe('student')
    })

    it('handles commas within quotes without splitting', () => {
      const csv = `full_name,branch\n"Sharma, Aarav","Computer Science, Engineering"`
      const rows = parseCsvRows(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].full_name).toBe('Sharma, Aarav')
      expect(rows[0].branch).toBe('Computer Science, Engineering')
    })

    it('returns empty array when file has fewer than 2 lines', () => {
      expect(parseCsvRows('')).toEqual([])
      expect(parseCsvRows('college_email,college_id')).toEqual([])
    })
  })

  // 2. Schema Validation
  describe('RosterRowSchema', () => {
    it('validates a valid student row', () => {
      const result = RosterRowSchema.safeParse({
        college_email: 'student@college.edu',
        college_id: '23BCE1001',
        full_name: 'Student Name',
        role: 'student',
        branch: 'CSE',
        year: 2,
        division: 'A',
        batch: 'B1',
      })
      expect(result.success).toBe(true)
    })

    it('validates a valid teacher row with department', () => {
      const result = RosterRowSchema.safeParse({
        college_email: 'prof.rao@college.edu',
        college_id: 'FAC-042',
        full_name: 'Dr. Sunita Rao',
        role: 'teacher',
        department: 'Computer Science',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email addresses', () => {
      const result = RosterRowSchema.safeParse({
        college_email: 'not-an-email',
        college_id: '23BCE1001',
        full_name: 'Student',
        role: 'student',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid roles outside student/teacher/admin', () => {
      const result = RosterRowSchema.safeParse({
        college_email: 'guest@college.edu',
        college_id: 'GUEST-1',
        full_name: 'Guest User',
        role: 'guest',
      })
      expect(result.success).toBe(false)
    })
  })

  // 3. importRosterCsv Business Logic
  describe('importRosterCsv', () => {
    it('rejects empty CSV content', async () => {
      const res = await importRosterCsv('', 'empty.csv', undefined, '00000000-0000-0000-0000-000000000001')
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('EMPTY_FILE')
      }
    })

    it('rejects duplicate college emails within the same CSV file', async () => {
      const csv = `college_email,college_id,full_name,role
dup@college.edu,ID-001,Student One,student
dup@college.edu,ID-002,Student Two,student`

      const res = await importRosterCsv(csv, 'dup-email.csv', undefined, '00000000-0000-0000-0000-000000000001')
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.errors).toHaveLength(1)
        expect(res.data.errors[0].error).toContain("Duplicate college email 'dup@college.edu'")
      }
    })

    it('rejects duplicate college IDs within the same CSV file', async () => {
      const csv = `college_email,college_id,full_name,role
first@college.edu,SAME-ID,Student One,student
second@college.edu,SAME-ID,Student Two,student`

      const res = await importRosterCsv(csv, 'dup-id.csv', undefined, '00000000-0000-0000-0000-000000000001')
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.errors).toHaveLength(1)
        expect(res.data.errors[0].error).toContain("Duplicate college ID 'SAME-ID'")
      }
    })

    it('inserts new roster members with status invited and logs to audit trail', async () => {
      let auditLogged = false
      const insertedRows: Array<Record<string, unknown>> = []

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'roster_import') {
            return {
              select: () => vi.fn().mockResolvedValue({ data: [], error: null }),
              insert: (row: Record<string, unknown>) => {
                insertedRows.push(row)
                return Promise.resolve({ data: row, error: null })
              },
            }
          }
          if (table === 'roster_import_batches') {
            return {
              insert: () => Promise.resolve({ data: null, error: null }),
            }
          }
          if (table === 'audit_log') {
            return {
              insert: () => {
                auditLogged = true
                return {
                  select: () => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'audit-roster-1', at: new Date().toISOString() },
                      error: null,
                    }),
                  }),
                }
              },
            }
          }
          return {}
        }),
      }

      const csv = `college_email,college_id,full_name,role,branch,year
new.student@college.edu,23BCE9999,New Student,student,Computer Science,1`

      const res = await importRosterCsv(
        csv,
        'batch-1.csv',
        mockClient as unknown as ProfileDbClient,
        '00000000-0000-0000-0000-000000000001'
      )

      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.inserted).toBe(1)
        expect(res.data.errors).toHaveLength(0)
      }
      expect(insertedRows).toHaveLength(1)
      expect(insertedRows[0].status).toBe('invited')
      expect(insertedRows[0].college_email).toBe('new.student@college.edu')
      expect(auditLogged).toBe(true)
    })

    it('sets status to inactive for people removed from the incoming roster (PLAN.md §4.1)', async () => {
      const updatedStatuses: Record<string, string> = {}

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'roster_import') {
            return {
              select: () =>
                Promise.resolve({
                  data: [
                    { college_email: 'retained@college.edu', status: 'active' },
                    { college_email: 'dropped.student@college.edu', status: 'active' },
                  ],
                  error: null,
                }),
              update: (fields: Record<string, unknown>) => ({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  updatedStatuses[val] = fields.status as string
                  return Promise.resolve({ data: null, error: null })
                }),
              }),
              insert: () => Promise.resolve({ data: null, error: null }),
            }
          }
          if (table === 'roster_import_batches' || table === 'audit_log') {
            return {
              insert: () => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      // Incoming CSV only contains retained@college.edu; dropped.student@college.edu is absent
      const csv = `college_email,college_id,full_name,role\nretained@college.edu,ID-1,Retained Student,student`

      const res = await importRosterCsv(
        csv,
        'roster-sync.csv',
        mockClient as unknown as ProfileDbClient,
        '00000000-0000-0000-0000-000000000001'
      )

      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.deactivated).toBe(1)
      }
      expect(updatedStatuses['dropped.student@college.edu']).toBe('inactive')
    })
  })

  // 4. User Profiles & Limited Self-Edit
  describe('Profile Self-Update & Invariants', () => {
    it('validates bio and office hours within limits', () => {
      const valid = ProfileUpdateSchema.safeParse({
        bio: 'Hello, I am a CS student.',
        office_hours: 'Tuesdays 2-4 PM',
        phone: '+91 9876543210',
      })
      expect(valid.success).toBe(true)
    })

    it('rejects bio exceeding 500 characters', () => {
      const invalid = ProfileUpdateSchema.safeParse({
        bio: 'a'.repeat(501),
      })
      expect(invalid.success).toBe(false)
    })

    it('updates allowed fields on user profile', async () => {
      let updatedFields: Record<string, unknown> | null = null

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              update: (fields: Record<string, unknown>) => {
                updatedFields = fields
                return {
                  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                }
              },
            }
          }
          return {}
        }),
      }

      const res = await updateProfile(
        {
          bio: 'Passionate about distributed systems',
          phone: '+91 99999 88888',
          office_hours: null,
          photo_url: 'https://example.com/me.png',
          department: null,
        },
        mockClient as unknown as ProfileDbClient,
        '00000000-0000-0000-0000-000000000002'
      )

      expect(res.ok).toBe(true)
      expect(updatedFields).toHaveProperty('bio', 'Passionate about distributed systems')
      expect(updatedFields).toHaveProperty('phone', '+91 99999 88888')
      // Critical security invariant: college_id and college_email must NEVER be in update payload
      expect(updatedFields).not.toHaveProperty('college_id')
      expect(updatedFields).not.toHaveProperty('college_email')
      expect(updatedFields).not.toHaveProperty('role_primary')
    })

    it('loads full profile including teacher fields and user roles', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'prof-1',
                      college_email: 'sunita.rao@college.edu',
                      college_id: 'FAC-CS-042',
                      full_name: 'Dr. Sunita Rao',
                      role_primary: 'teacher',
                      department: 'Computer Science',
                      office_hours: 'MWF 10-12',
                      bio: 'Associate Professor',
                      status: 'active',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'user_roles') {
            return {
              select: () => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { role: 'teacher', scope: 'CS' },
                    { role: 'authority', scope: 'Class Coordinator' },
                  ],
                  error: null,
                }),
              }),
            }
          }
          return {}
        }),
      }

      const res = await getProfile('prof-1', mockClient as unknown as ProfileDbClient)
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.fullName).toBe('Dr. Sunita Rao')
        expect(res.data.rolePrimary).toBe('teacher')
        expect(res.data.department).toBe('Computer Science')
        expect(res.data.officeHours).toBe('MWF 10-12')
        expect(res.data.roles).toHaveLength(2)
      }
    })
  })
})
