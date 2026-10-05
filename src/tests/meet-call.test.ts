import { describe, it, expect } from 'vitest'
import type { SessionRequest } from '@/features/meet/schema'

/**
 * Unit tests for Campus Meet: Online Call Room Access, Time-Window Guards,
 * Two-Party Authorization, and Token Generation.
 *
 * Source of truth:
 * - src/features/meet/README.md
 * - documents/CONTRACT.md §5.2
 * - documents/TEAM_TASKS.md (feat/meet-online-call)
 */

describe('Meet Online Call: Participant Access & Time-Window Logic', () => {
  const studentId = '11111111-1111-1111-1111-111111111111'
  const teacherId = '22222222-2222-2222-2222-222222222222'
  const strangerId = '33333333-3333-3333-3333-333333333333'
  const adminId = '99999999-9999-9999-9999-999999999999'

  const baseSession: SessionRequest = {
    id: '44444444-4444-4444-4444-444444444444',
    student_id: studentId,
    teacher_id: teacherId,
    starts_at: '2026-10-15T14:00:00.000Z',
    ends_at: '2026-10-15T14:30:00.000Z',
    reason: 'Deep dive into consensus algorithms for distributed ledger project.',
    status: 'online_selected',
    mode: 'online',
    room_id: 'meet-room-alpha-123',
    created_at: '2026-10-10T10:00:00.000Z',
    updated_at: '2026-10-10T11:00:00.000Z',
    student: {
      full_name: 'Alex Student',
      email: 'alex@campus.edu',
    },
    teacher: {
      full_name: 'Dr. Jane Teacher',
      department: 'Computer Science',
      office_hours_text: 'Room 304',
    },
  }

  // Pure function simulating getSessionCallAccess logic
  function checkCallAccess(
    session: SessionRequest | null,
    user: { id: string; role_primary: string; full_name: string },
    currentTimeMs: number
  ) {
    if (!session) {
      return {
        ok: false as const,
        code: 'NOT_FOUND',
        message: 'Meeting session not found.',
      }
    }

    const isStudent = session.student_id === user.id
    const isTeacher = session.teacher_id === user.id
    const isAdmin = user.role_primary === 'admin'

    if (!isStudent && !isTeacher && !isAdmin) {
      return {
        ok: false as const,
        code: 'UNAUTHORIZED',
        message: 'You are not a participant in this scheduled meeting.',
        session,
      }
    }

    const isOnline = session.mode === 'online' || session.status === 'online_selected'
    if (!isOnline && session.status !== 'completed') {
      return {
        ok: false as const,
        code: 'NOT_ONLINE_SESSION',
        message: 'This meeting was scheduled for an in-person office hour, not an online call.',
        session,
      }
    }

    const startsAtMs = new Date(session.starts_at).getTime()
    const endsAtMs = new Date(session.ends_at).getTime()
    const BUFFER_BEFORE_MS = 10 * 60 * 1000 // 10 minutes

    if (currentTimeMs < startsAtMs - BUFFER_BEFORE_MS) {
      return {
        ok: false as const,
        code: 'TOO_EARLY',
        message: 'The meeting room has not opened yet. It will open 10 minutes before the scheduled start time.',
        startsAt: session.starts_at,
        endsAt: session.ends_at,
        session,
      }
    }

    if (currentTimeMs > endsAtMs) {
      return {
        ok: false as const,
        code: 'EXPIRED',
        message: 'This scheduled meeting session has concluded.',
        startsAt: session.starts_at,
        endsAt: session.ends_at,
        session,
      }
    }

    const userRole: 'teacher' | 'student' | 'admin' = isTeacher
      ? 'teacher'
      : isStudent
      ? 'student'
      : 'admin'

    const studentName = session.student?.full_name || 'Student'
    const teacherName = session.teacher?.full_name || 'Faculty Member'
    const otherParticipantName = isStudent ? teacherName : studentName
    const otherParticipantRole = isStudent ? 'Faculty Member' : 'Student'

    const roomName = session.room_id || `meet-${session.id.slice(0, 8)}`
    const token = Buffer.from(
      JSON.stringify({
        room: roomName,
        userId: user.id,
        userName: user.full_name,
        role: userRole,
        exp: Math.floor(endsAtMs / 1000),
      })
    ).toString('base64')

    return {
      ok: true as const,
      session,
      currentUserId: user.id,
      userRole,
      otherParticipantName,
      otherParticipantRole,
      roomName,
      token,
      isWindowActive: true,
    }
  }

  describe('Participant Authorization Guards', () => {
    const startsAtMs = new Date(baseSession.starts_at).getTime()
    const inWindowTime = startsAtMs - 5 * 60 * 1000 // 5 minutes before start (within 10-min window)

    it('grants access to the booked student', () => {
      const res = checkCallAccess(
        baseSession,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        inWindowTime
      )
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.userRole).toBe('student')
        expect(res.otherParticipantName).toBe('Dr. Jane Teacher')
        expect(res.otherParticipantRole).toBe('Faculty Member')
        expect(res.roomName).toBe('meet-room-alpha-123')
      }
    })

    it('grants access to the assigned faculty member', () => {
      const res = checkCallAccess(
        baseSession,
        { id: teacherId, role_primary: 'teacher', full_name: 'Dr. Jane Teacher' },
        inWindowTime
      )
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.userRole).toBe('teacher')
        expect(res.otherParticipantName).toBe('Alex Student')
        expect(res.otherParticipantRole).toBe('Student')
      }
    })

    it('grants access to an admin with administrative role', () => {
      const res = checkCallAccess(
        baseSession,
        { id: adminId, role_primary: 'admin', full_name: 'Dean Smith' },
        inWindowTime
      )
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.userRole).toBe('admin')
      }
    })

    it('strictly denies unauthorized third-party users with UNAUTHORIZED code', () => {
      const res = checkCallAccess(
        baseSession,
        { id: strangerId, role_primary: 'student', full_name: 'Unrelated Student' },
        inWindowTime
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('UNAUTHORIZED')
        expect(res.message).toContain('not a participant')
      }
    })
  })

  describe('Meeting Mode Enforcement', () => {
    const startsAtMs = new Date(baseSession.starts_at).getTime()
    const inWindowTime = startsAtMs - 5 * 60 * 1000

    it('rejects in-person/offline meeting sessions from video room entry', () => {
      const offlineSession: SessionRequest = {
        ...baseSession,
        mode: 'offline',
        status: 'offline_selected',
        location: 'Department Office 304',
      }

      const res = checkCallAccess(
        offlineSession,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        inWindowTime
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('NOT_ONLINE_SESSION')
        expect(res.message).toContain('in-person office hour')
      }
    })
  })

  describe('Time-Window Constraints (10 min prior to ends_at)', () => {
    const startsAtMs = new Date(baseSession.starts_at).getTime()
    const endsAtMs = new Date(baseSession.ends_at).getTime()

    it('returns TOO_EARLY when visiting 15 minutes before starts_at', () => {
      const tooEarlyTime = startsAtMs - 15 * 60 * 1000 // 15 mins prior
      const res = checkCallAccess(
        baseSession,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        tooEarlyTime
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('TOO_EARLY')
        expect(res.startsAt).toBe(baseSession.starts_at)
      }
    })

    it('grants access exactly at the 10-minute early entry window mark', () => {
      const exactOpenTime = startsAtMs - 10 * 60 * 1000 // Exactly 10 mins prior
      const res = checkCallAccess(
        baseSession,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        exactOpenTime
      )
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.isWindowActive).toBe(true)
      }
    })

    it('grants access during the meeting session', () => {
      const midSessionTime = startsAtMs + 15 * 60 * 1000 // In the middle of meeting
      const res = checkCallAccess(
        baseSession,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        midSessionTime
      )
      expect(res.ok).toBe(true)
    })

    it('returns EXPIRED when visiting after ends_at', () => {
      const postSessionTime = endsAtMs + 1000 // 1 second after ends_at
      const res = checkCallAccess(
        baseSession,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        postSessionTime
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('EXPIRED')
        expect(res.message).toContain('concluded')
      }
    })
  })

  describe('Room Token Payload & Expiry Validation', () => {
    it('generates a valid base64 token containing correct room credentials', () => {
      const startsAtMs = new Date(baseSession.starts_at).getTime()
      const endsAtMs = new Date(baseSession.ends_at).getTime()
      const inWindowTime = startsAtMs - 2 * 60 * 1000

      const res = checkCallAccess(
        baseSession,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        inWindowTime
      )

      expect(res.ok).toBe(true)
      if (res.ok) {
        const decoded = JSON.parse(Buffer.from(res.token, 'base64').toString('utf-8'))
        expect(decoded.room).toBe('meet-room-alpha-123')
        expect(decoded.userId).toBe(studentId)
        expect(decoded.userName).toBe('Alex Student')
        expect(decoded.role).toBe('student')
        expect(decoded.exp).toBe(Math.floor(endsAtMs / 1000))
      }
    })

    it('returns NOT_FOUND when session does not exist', () => {
      const res = checkCallAccess(
        null,
        { id: studentId, role_primary: 'student', full_name: 'Alex Student' },
        Date.now()
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('NOT_FOUND')
      }
    })
  })
})
