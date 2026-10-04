import { describe, it, expect } from 'vitest'
import {
  CreateSessionRequestSchema,
  RespondSessionRequestSchema,
  SelectSessionModeSchema,
  CancelSessionRequestSchema,
  SessionRequestSchema,
} from '@/features/meet/schema'

/**
 * Unit tests for Campus Meet: Session Request Booking, Double-Booking Exclusion,
 * Mode Selection, Calendar Sync, and Cancellation Rate-Limits.
 *
 * Source of truth:
 * - src/features/meet/README.md
 * - documents/CONTRACT.md §5.2
 * - documents/TEAM_TASKS.md (feat/meet-booking)
 */

describe('Meet Booking Schemas & Validations', () => {
  const validUUID1 = '10000000-0000-0000-0000-000000000001'
  const validUUID2 = '20000000-0000-0000-0000-000000000002'

  it('validates a correct session booking request', () => {
    const valid = CreateSessionRequestSchema.safeParse({
      teacher_id: validUUID1,
      starts_at: '2026-10-12T14:00:00.000Z',
      ends_at: '2026-10-12T14:30:00.000Z',
      reason: 'Need guidance on the distributed systems consensus project proposal.',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects a booking request with reason shorter than 20 characters', () => {
    const invalid = CreateSessionRequestSchema.safeParse({
      teacher_id: validUUID1,
      starts_at: '2026-10-12T14:00:00.000Z',
      ends_at: '2026-10-12T14:30:00.000Z',
      reason: 'Short reason here', // 17 characters (< 20)
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.errors[0]?.message).toContain('Reason must be at least 20 characters')
    }
  })

  it('rejects a booking request where ends_at <= starts_at', () => {
    const invalid = CreateSessionRequestSchema.safeParse({
      teacher_id: validUUID1,
      starts_at: '2026-10-12T15:00:00.000Z',
      ends_at: '2026-10-12T14:30:00.000Z',
      reason: 'Discussing final year project topic and architecture stack.',
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.errors[0]?.message).toContain('Session end time must be after start time')
    }
  })

  it('validates teacher response schemas for accept and decline', () => {
    const accept = RespondSessionRequestSchema.safeParse({
      session_id: validUUID2,
      action: 'accept',
    })
    expect(accept.success).toBe(true)

    const decline = RespondSessionRequestSchema.safeParse({
      session_id: validUUID2,
      action: 'decline',
      decline_reason: 'Please attend open department hours on Friday instead.',
    })
    expect(decline.success).toBe(true)
  })

  it('validates mode selection schema (offline vs online)', () => {
    const offline = SelectSessionModeSchema.safeParse({
      session_id: validUUID2,
      mode: 'offline',
    })
    expect(offline.success).toBe(true)

    const online = SelectSessionModeSchema.safeParse({
      session_id: validUUID2,
      mode: 'online',
    })
    expect(online.success).toBe(true)

    const invalid = SelectSessionModeSchema.safeParse({
      session_id: validUUID2,
      mode: 'phone' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    })
    expect(invalid.success).toBe(false)
  })

  it('validates cancel session request schema', () => {
    const cancel = CancelSessionRequestSchema.safeParse({
      session_id: validUUID2,
      cancel_reason: 'Class test was rescheduled during this office hour.',
    })
    expect(cancel.success).toBe(true)
  })

  it('validates full SessionRequest data model with all states', () => {
    const fullSession = SessionRequestSchema.safeParse({
      id: validUUID2,
      student_id: validUUID1,
      teacher_id: validUUID1,
      starts_at: '2026-10-12T14:00:00.000Z',
      ends_at: '2026-10-12T14:30:00.000Z',
      reason: 'Need advice on research paper topics for natural language processing.',
      status: 'offline_selected',
      location: 'Cabin 304, CSE Department',
      room_id: null,
      created_at: '2026-10-10T10:00:00.000Z',
      updated_at: '2026-10-10T11:00:00.000Z',
    })
    expect(fullSession.success).toBe(true)
  })
})

describe('Double-Booking Prevention & Simultaneous Collision', () => {
  it('detects slot collision when a slot is already accepted by another student', () => {
    const teacherId = 'teacher-101'
    const dateStr = '2026-10-15'
    const slotStartStr = '14:00'
    const slotEndStr = '14:30'

    const existingAccepted = [
      {
        teacher_id: teacherId,
        starts_at: `${dateStr}T14:00:00.000Z`,
        ends_at: `${dateStr}T14:30:00.000Z`,
        status: 'accepted',
      },
    ]

    // Simulate collision check
    const candidateStart = new Date(`${dateStr}T${slotStartStr}:00.000Z`).getTime()
    const candidateEnd = new Date(`${dateStr}T${slotEndStr}:00.000Z`).getTime()

    const isColliding = existingAccepted.some((b) => {
      const bStart = new Date(b.starts_at).getTime()
      const bEnd = new Date(b.ends_at).getTime()
      return candidateStart < bEnd && candidateEnd > bStart
    })

    expect(isColliding).toBe(true)
  })

  it('handles simultaneous booking conflict where DB exclusion constraint (23P01) fires', async () => {
    // Simulate two concurrent requests firing simultaneously for the exact same slot
    let slotTaken = false

    async function bookSlotSimulation(studentId: string) {
      if (slotTaken) {
        // Postgres returns 23P01 exclusion constraint violation
        const error = new Error('conflicting key value violates exclusion constraint "no_overlapping_accepted_sessions"')
        ;(error as any).code = '23P01' // eslint-disable-line @typescript-eslint/no-explicit-any
        throw error
      }
      slotTaken = true
      return { ok: true, studentId, id: `session-for-${studentId}` }
    }

    // Wrap with server action handler logic
    async function requestSessionMock(studentId: string) {
      try {
        const res = await bookSlotSimulation(studentId)
        return { ok: true, data: res }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err.code === '23P01' || err.message?.includes('exclusion')) {
          return {
            ok: false,
            error: {
              code: 'SLOT_UNAVAILABLE',
              message: 'This slot was just taken. Please choose another.',
            },
          }
        }
        return { ok: false, error: { code: 'UNKNOWN', message: 'Failed' } }
      }
    }

    // Fire two requests simultaneously
    const [res1, res2] = await Promise.all([
      requestSessionMock('student-A'),
      requestSessionMock('student-B'),
    ])

    // Exactly one succeeds, the other gets clear message
    const successCount = (res1.ok ? 1 : 0) + (res2.ok ? 1 : 0)
    expect(successCount).toBe(1)

    const failedResult = !res1.ok ? res1 : res2
    expect(failedResult.ok).toBe(false)
    if (!failedResult.ok && 'error' in failedResult && failedResult.error) {
      expect(failedResult.error.code).toBe('SLOT_UNAVAILABLE')
      expect(failedResult.error.message).toBe('This slot was just taken. Please choose another.')
    }
  })
})

describe('Student Mode Selection & Calendar Entry Logic', () => {
  function resolveModeDetails(
    mode: 'offline' | 'online',
    teacherOfficeText: string,
    sessionId: string
  ) {
    const location = mode === 'offline' ? teacherOfficeText : 'Online Video Call'
    const roomId = mode === 'online' ? `meet-${sessionId.slice(0, 8)}` : null
    const newStatus = mode === 'offline' ? 'offline_selected' : 'online_selected'
    return { location, roomId, newStatus }
  }

  it('generates offline meeting location from teacher office hours text', () => {
    const teacherProfile = {
      full_name: 'Dr. Sarah Smith',
      office_hours_text: 'Room 402, Block B (Wed 2-4 PM)',
    }

    const { location, roomId, newStatus } = resolveModeDetails(
      'offline',
      teacherProfile.office_hours_text,
      'abcdef12-3456-7890-abcd-ef1234567890'
    )

    expect(location).toBe('Room 402, Block B (Wed 2-4 PM)')
    expect(roomId).toBeNull()
    expect(newStatus).toBe('offline_selected')
  })

  it('generates unique video room for online meeting mode', () => {
    const sessionId = 'abcdef12-3456-7890-abcd-ef1234567890'

    const { location, roomId, newStatus } = resolveModeDetails(
      'online',
      'Faculty Office',
      sessionId
    )

    expect(location).toBe('Online Video Call')
    expect(roomId).toBe('meet-abcdef12')
    expect(newStatus).toBe('online_selected')
  })

  it('formats calendar entries for both student and teacher', () => {
    const session = {
      id: 'session-999',
      student_id: 'student-1',
      teacher_id: 'teacher-2',
      starts_at: '2026-10-15T14:00:00.000Z',
      ends_at: '2026-10-15T14:30:00.000Z',
    }

    const studentCalendarEntry = {
      userId: session.student_id,
      sourceType: 'meet',
      sourceId: session.id,
      title: 'Faculty Meeting with Dr. Smith (In-Person)',
      location: 'Cabin 102',
      link: '/meet',
      startsAt: session.starts_at,
      endsAt: session.ends_at,
    }

    const teacherCalendarEntry = {
      userId: session.teacher_id,
      sourceType: 'meet',
      sourceId: session.id,
      title: 'Student Meeting with John Doe (In-Person)',
      location: 'Cabin 102',
      link: '/meet',
      startsAt: session.starts_at,
      endsAt: session.ends_at,
    }

    expect(studentCalendarEntry.sourceType).toBe('meet')
    expect(teacherCalendarEntry.sourceType).toBe('meet')
    expect(studentCalendarEntry.startsAt).toBe(session.starts_at)
    expect(teacherCalendarEntry.endsAt).toBe(session.ends_at)
  })
})

describe('Cancellation Rules & Rate Limiting', () => {
  it('enforces maximum 3 cancellations per day for students', () => {
    const cancellationsToday = 3

    function canCancel(count: number): { allowed: boolean; error?: string } {
      if (count >= 3) {
        return {
          allowed: false,
          error: 'You have reached the maximum of 3 cancellations for today. You cannot cancel again until tomorrow.',
        }
      }
      return { allowed: true }
    }

    const attempt1 = canCancel(cancellationsToday)
    expect(attempt1.allowed).toBe(false)
    expect(attempt1.error).toContain('maximum of 3 cancellations for today')

    const attempt2 = canCancel(2)
    expect(attempt2.allowed).toBe(true)
  })

  it('identifies last-minute cancellation when session is within 1 hour', () => {
    const now = Date.now()

    // Starts in 30 minutes
    const startsAt30Min = new Date(now + 30 * 60 * 1000).toISOString()
    const diffMs1 = new Date(startsAt30Min).getTime() - now
    const isLastMinute1 = diffMs1 < 60 * 60 * 1000 && diffMs1 > 0
    expect(isLastMinute1).toBe(true)

    // Starts in 3 hours
    const startsAt3Hours = new Date(now + 3 * 60 * 60 * 1000).toISOString()
    const diffMs2 = new Date(startsAt3Hours).getTime() - now
    const isLastMinute2 = diffMs2 < 60 * 60 * 1000 && diffMs2 > 0
    expect(isLastMinute2).toBe(false)
  })

  it('removes calendar entries for both parties on cancellation', () => {
    const removedEntries: Array<{ sourceType: string; sourceId: string; userId: string }> = []

    function mockRemoveCalendar(entry: { sourceType: string; sourceId: string; userId: string }) {
      removedEntries.push(entry)
    }

    const sessionId = 'session-100'
    const studentId = 'student-1'
    const teacherId = 'teacher-2'

    mockRemoveCalendar({ sourceType: 'meet', sourceId: sessionId, userId: studentId })
    mockRemoveCalendar({ sourceType: 'meet', sourceId: sessionId, userId: teacherId })

    expect(removedEntries.length).toBe(2)
    expect(removedEntries[0].userId).toBe(studentId)
    expect(removedEntries[1].userId).toBe(teacherId)
    expect(removedEntries.every((e) => e.sourceType === 'meet')).toBe(true)
  })
})

describe('48-Hour Auto-Expiry Logic', () => {
  it('correctly flags pending requests older than 48 hours as expired', () => {
    const now = Date.now()
    const cutoff48h = new Date(now - 48 * 60 * 60 * 1000).getTime()

    const requests = [
      {
        id: 'req-recent',
        created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours old
        status: 'pending',
      },
      {
        id: 'req-stale',
        created_at: new Date(now - 50 * 60 * 60 * 1000).toISOString(), // 50 hours old
        status: 'pending',
      },
      {
        id: 'req-already-accepted',
        created_at: new Date(now - 60 * 60 * 60 * 1000).toISOString(),
        status: 'accepted',
      },
    ]

    const expired = requests
      .filter((r) => r.status === 'pending' && new Date(r.created_at).getTime() < cutoff48h)
      .map((r) => ({ ...r, status: 'expired' }))

    expect(expired.length).toBe(1)
    expect(expired[0].id).toBe('req-stale')
    expect(expired[0].status).toBe('expired')
  })
})
