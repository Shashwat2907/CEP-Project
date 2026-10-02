import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  RequestCodeSchema,
  VerifyCodeSchema,
  UserRoleTypeSchema,
  UserProfileSchema,
} from '../shared/auth/schema'
import { requestCodeAction, verifyCodeAction } from '../features/identity/actions'

// Mock Supabase server client
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
})
const mockSelect = vi.fn()
const mockSignInWithOtp = vi.fn()
const mockVerifyOtp = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue({ error: null })

const mockSupabase = {
  from: vi.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
  auth: {
    signInWithOtp: mockSignInWithOtp,
    verifyOtp: mockVerifyOtp,
    signOut: mockSignOut,
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}))

describe('Auth & Roles — Zod Validation Schemas', () => {
  it('validates college email address format', () => {
    const valid = RequestCodeSchema.safeParse({ email: 'student1@campus.edu' })
    expect(valid.success).toBe(true)

    const invalid = RequestCodeSchema.safeParse({ email: 'not-an-email' })
    expect(invalid.success).toBe(false)
  })

  it('validates 6-digit OTP code strictly', () => {
    expect(
      VerifyCodeSchema.safeParse({ email: 'student@campus.edu', code: '123456' }).success
    ).toBe(true)

    // Less than 6 digits
    expect(
      VerifyCodeSchema.safeParse({ email: 'student@campus.edu', code: '12345' }).success
    ).toBe(false)

    // Letters instead of digits
    expect(
      VerifyCodeSchema.safeParse({ email: 'student@campus.edu', code: '12345a' }).success
    ).toBe(false)
  })

  it('validates allowed user roles', () => {
    expect(UserRoleTypeSchema.safeParse('student').success).toBe(true)
    expect(UserRoleTypeSchema.safeParse('teacher').success).toBe(true)
    expect(UserRoleTypeSchema.safeParse('admin').success).toBe(true)
    expect(UserRoleTypeSchema.safeParse('authority').success).toBe(true)
    expect(UserRoleTypeSchema.safeParse('superhero').success).toBe(false)
  })

  it('validates full user profile shape', () => {
    const profile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      college_email: 'student1@campus.edu',
      college_id: '23BCE1001',
      full_name: 'Aarav Mehta',
      role_primary: 'student',
      branch: 'Computer Science',
      year: 2,
      division: 'A',
      batch: 'A1',
      status: 'active',
    }
    expect(UserProfileSchema.safeParse(profile).success).toBe(true)
  })
})

describe('Auth & Roles — Request OTP Action Security Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns generic success message even if email is NOT on roster (prevents email enumeration)', async () => {
    // Roster query returns null
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    const res = await requestCodeAction({ email: 'unknown@campus.edu' })

    // User gets generic message
    expect(res.success).toBe(true)
    expect(res.message).toContain('If this email is registered')
    // OTP service is NEVER called
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
    // Audit attempt is logged
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'unknown@campus.edu',
        kind: 'code_request',
        success: false,
        error_reason: 'not_on_roster',
      })
    )
  })

  it('blocks OTP request when roster marks person as inactive', async () => {
    // Roster returns inactive entry
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'roster-5', college_email: 'student5@campus.edu', status: 'inactive' },
          error: null,
        }),
      }),
    })

    const res = await requestCodeAction({ email: 'student5@campus.edu' })

    expect(res.success).toBe(true)
    expect(res.message).toContain('If this email is registered')
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        error_reason: 'inactive_roster_status',
      })
    )
  })

  it('dispatches OTP code when email is on roster and invited/active', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'roster-1', college_email: 'student1@campus.edu', status: 'invited', role: 'student' },
          error: null,
        }),
      }),
    })
    mockSignInWithOtp.mockResolvedValue({ error: null })

    const res = await requestCodeAction({ email: 'student1@campus.edu' })

    expect(res.success).toBe(true)
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'student1@campus.edu',
      options: { shouldCreateUser: true },
    })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'code_request',
        success: true,
      })
    )
  })
})

describe('Auth & Roles — Verify OTP & Auto-Provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails verification and logs attempt on wrong OTP code', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Token has expired or is invalid' },
    })

    const res = await verifyCodeAction({ email: 'student1@campus.edu', code: '000000' })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Invalid or expired code')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'code_verify',
        success: false,
      })
    )
  })

  it('provisions profile and role from roster on first successful verification', async () => {
    const fakeUser = { id: 'user-uuid-1', email: 'student1@campus.edu' }
    mockVerifyOtp.mockResolvedValue({
      data: { user: fakeUser, session: { access_token: 'fake-token' } },
      error: null,
    })

    // Roster query returns Aarav Mehta
    const rosterData = {
      id: 'roster-1',
      college_email: 'student1@campus.edu',
      college_id: '23BCE1001',
      full_name: 'Aarav Mehta',
      branch: 'Computer Science',
      year: 2,
      division: 'A',
      batch: 'A1',
      role: 'student',
      status: 'invited',
    }

    mockSelect.mockImplementation(() => ({
      eq: vi.fn().mockImplementation((col: string) => ({
        single: vi.fn().mockImplementation(() => {
          if (col === 'college_email') {
            return Promise.resolve({ data: rosterData, error: null })
          }
          // Profile query returns null (first sign-in)
          return Promise.resolve({ data: null, error: null })
        }),
      })),
    }))

    const res = await verifyCodeAction({ email: 'student1@campus.edu', code: '123456' })

    expect(res.success).toBe(true)
    // Profile created with roster values
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: fakeUser.id,
        college_id: '23BCE1001',
        full_name: 'Aarav Mehta',
        role_primary: 'student',
      })
    )
    // Primary role assigned
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: fakeUser.id,
        role: 'student',
      })
    )
  })

  it('rejects sign-in and terminates session if user is inactive in roster', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: 'user-5' }, session: {} },
      error: null,
    })

    // Roster returns inactive
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'roster-5', college_email: 'student5@campus.edu', status: 'inactive' },
          error: null,
        }),
      }),
    })

    const res = await verifyCodeAction({ email: 'student5@campus.edu', code: '123456' })

    expect(res.success).toBe(false)
    expect(res.error).toContain('account has been deactivated')
    // Global sign out called to invalidate any session
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' })
  })
})
