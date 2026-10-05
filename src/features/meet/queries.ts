'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseOnline } from '@/lib/supabase/status'
import { requireAuth } from '@/shared/auth/guards'
import type {
  AvailabilityRule,
  AvailabilityException,
  GeneratedSlot,
  TeacherSummary,
  SessionRequest,
  CallAccessResult,
  WhiteboardRecord,
} from './schema'
import {
  MOCK_TEACHERS,
  mockAvailabilityRulesStore,
  mockSessionRequestsStore,
  MOCK_WHITEBOARDS,
} from './mock-meet-data'

/**
 * Read-side queries and slot generation engine for Campus Meet.
 * Source of truth: src/features/meet/README.md §6
 */

// ---------------------------------------------------------------------------
// 1. Teacher Directory & Profiles
// ---------------------------------------------------------------------------

/** Fetch all verified teachers available for student booking. */
export async function getTeachersList(): Promise<TeacherSummary[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, office_hours_text, avatar_url, email')
        .eq('role_primary', 'teacher')
        .order('full_name', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        return (data as TeacherSummary[]) ?? []
      }
    } catch {
      // Offline fallback
    }
  }

  return MOCK_TEACHERS
}

/** Fetch specific teacher summary. */
export async function getTeacherProfile(teacherId: string): Promise<TeacherSummary | null> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, office_hours_text, avatar_url, email')
        .eq('id', teacherId)
        .single()

      if (!error && data) {
        return data as TeacherSummary
      }
    } catch {
      // Offline fallback
    }
  }

  return MOCK_TEACHERS.find((t) => t.id === teacherId) ?? null
}

// ---------------------------------------------------------------------------
// 2. Teacher Availability Rules & Exceptions
// ---------------------------------------------------------------------------

/** Fetch weekly recurring availability rules for a teacher. */
export async function getTeacherAvailabilityRules(
  teacherId: string
): Promise<AvailabilityRule[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true })

      if (!error && Array.isArray(data)) {
        return data as AvailabilityRule[]
      }
    } catch {
      // Offline fallback
    }
  }

  return mockAvailabilityRulesStore.filter((r) => r.teacher_id === teacherId)
}

/** Fetch date exceptions for a teacher within a date range. */
export async function getTeacherExceptions(
  teacherId: string,
  startDate?: string,
  endDate?: string
): Promise<AvailabilityException[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('availability_exceptions')
        .select('*')
        .eq('teacher_id', teacherId)

      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }

      const { data, error } = await query.order('date', { ascending: true })

      if (!error && Array.isArray(data)) {
        return (data as AvailabilityException[]) ?? []
      }
    } catch {
      // Offline fallback
    }
  }

  return []
}

// ---------------------------------------------------------------------------
// 3. Slot Generation Engine (On-the-fly calculation)
// ---------------------------------------------------------------------------

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function getDayOfWeek(dateStr: string): number {
  // Parse YYYY-MM-DD cleanly without local timezone shifts
  const [y, m, d] = dateStr.split('-').map(Number)
  const dateObj = new Date(Date.UTC(y, m - 1, d))
  return dateObj.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

/**
 * Generates open, bookable slots for a teacher on a specific date.
 * Per src/features/meet/README.md:
 * 1. Find teacher's weekly recurring rules matching the weekday.
 * 2. Segment rules into slot_minutes intervals.
 * 3. Filter out any 'blocked' exceptions (whole-day or overlapping time ranges).
 * 4. Add any 'extra' exception slots.
 * 5. Return sorted GeneratedSlot list.
 */
export async function generateTeacherSlots(
  teacherId: string,
  dateStr: string
): Promise<GeneratedSlot[]> {
  const supabase = await createClient()
  const weekday = getDayOfWeek(dateStr)

  // 1. Fetch recurring rules for this weekday
  const { data: rulesData } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('weekday', weekday)

  const rules: AvailabilityRule[] = rulesData ?? []

  // 2. Fetch exceptions for this specific date
  const { data: exceptionsData } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('date', dateStr)

  const exceptions: AvailabilityException[] = exceptionsData ?? []

  // Check if entire day is blocked
  const fullDayBlocked = exceptions.some(
    (e) => e.kind === 'blocked' && (!e.start_time || !e.end_time)
  )

  // 3. Fetch active accepted session requests for this date to exclude booked slots
  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`
  const { data: bookedData } = await supabase
    .from('session_requests')
    .select('starts_at, ends_at')
    .eq('teacher_id', teacherId)
    .gte('starts_at', startOfDay)
    .lte('starts_at', endOfDay)
    .in('status', ['accepted', 'offline_selected', 'online_selected'])

  const bookedSessions: Array<{ starts_at: string; ends_at: string }> = bookedData ?? []

  const slots: GeneratedSlot[] = []

  // 4. Generate recurring slots if day is not fully blocked
  if (!fullDayBlocked) {
    for (const rule of rules) {
      const startMin = timeToMinutes(rule.start_time)
      const endMin = timeToMinutes(rule.end_time)
      const step = rule.slot_minutes

      for (let curr = startMin; curr + step <= endMin; curr += step) {
        const slotStartStr = minutesToTime(curr)
        const slotEndStr = minutesToTime(curr + step)

        // Check if blocked by a partial-time exception
        const isBlocked = exceptions.some((e) => {
          if (e.kind !== 'blocked' || !e.start_time || !e.end_time) return false
          const bStart = timeToMinutes(e.start_time)
          const bEnd = timeToMinutes(e.end_time)
          // Overlaps if slot starts before block ends AND slot ends after block starts
          return curr < bEnd && curr + step > bStart
        })

        // Check if already booked by an accepted session
        const isBooked = bookedSessions.some((b) => {
          const bStart = new Date(b.starts_at).getTime()
          const bEnd = new Date(b.ends_at).getTime()
          const slotStart = new Date(`${dateStr}T${slotStartStr}:00Z`).getTime()
          const slotEnd = new Date(`${dateStr}T${slotEndStr}:00Z`).getTime()
          return slotStart < bEnd && slotEnd > bStart
        })

        if (!isBlocked && !isBooked) {
          slots.push({
            id: `${teacherId}-${dateStr}-${slotStartStr}`,
            teacher_id: teacherId,
            date: dateStr,
            start_time: slotStartStr,
            end_time: slotEndStr,
            slot_minutes: step,
            is_available: true,
            override_type: 'regular',
          })
        }
      }
    }
  }

  // 5. Add extra slots from exceptions
  const extraExceptions = exceptions.filter(
    (e) => e.kind === 'extra' && e.start_time && e.end_time
  )

  for (const extra of extraExceptions) {
    const startMin = timeToMinutes(extra.start_time!)
    const endMin = timeToMinutes(extra.end_time!)
    const step = 30 // default 30 min for extra sessions

    for (let curr = startMin; curr + step <= endMin; curr += step) {
      const slotStartStr = minutesToTime(curr)
      const slotEndStr = minutesToTime(curr + step)

      const isBooked = bookedSessions.some((b) => {
        const bStart = new Date(b.starts_at).getTime()
        const bEnd = new Date(b.ends_at).getTime()
        const slotStart = new Date(`${dateStr}T${slotStartStr}:00Z`).getTime()
        const slotEnd = new Date(`${dateStr}T${slotEndStr}:00Z`).getTime()
        return slotStart < bEnd && slotEnd > bStart
      })

      // Avoid duplicates if already generated
      if (!isBooked && !slots.some((s) => s.start_time === slotStartStr)) {
        slots.push({
          id: `${teacherId}-${dateStr}-${slotStartStr}`,
          teacher_id: teacherId,
          date: dateStr,
          start_time: slotStartStr,
          end_time: slotEndStr,
          slot_minutes: step,
          is_available: true,
          override_type: 'extra',
        })
      }
    }
  }

  // 6. Sort by start_time ASC
  return slots.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
}

// ---------------------------------------------------------------------------
// 4. Session Requests Queries
// ---------------------------------------------------------------------------

/** Fetch session requests for the currently logged-in student. */
export async function getMySessionRequests(): Promise<SessionRequest[]> {
  const { user, profile } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('session_requests')
        .select(`
          *,
          teacher:profiles!session_requests_teacher_id_fkey(full_name, department, office_hours_text)
        `)
        .eq('student_id', user.id)
        .order('starts_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return (data as unknown as SessionRequest[]) ?? []
      }
    } catch {
      // Offline fallback
    }
  }

  return mockSessionRequestsStore.filter(
    (s) =>
      s.student_id === user.id ||
      s.student?.email === user.email ||
      s.student?.full_name === profile.full_name
  )
}

/** Fetch incoming session requests for the currently logged-in teacher. */
export async function getTeacherSessionRequests(): Promise<SessionRequest[]> {
  const { user, profile } = await requireAuth()
  if (profile.role_primary !== 'teacher' && profile.role_primary !== 'admin') {
    return []
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('session_requests')
        .select(`
          *,
          student:profiles!session_requests_student_id_fkey(full_name, email)
        `)
        .eq('teacher_id', user.id)
        .order('starts_at', { ascending: true })

      if (!error && Array.isArray(data)) {
        return (data as unknown as SessionRequest[]) ?? []
      }
    } catch {
      // Offline fallback
    }
  }

  return mockSessionRequestsStore
}

/** Fetch specific session request by ID. */
export async function getSessionRequestById(id: string): Promise<SessionRequest | null> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('session_requests')
        .select(`
          *,
          student:profiles!session_requests_student_id_fkey(full_name, email),
          teacher:profiles!session_requests_teacher_id_fkey(full_name, department, office_hours_text)
        `)
        .eq('id', id)
        .single()

      if (!error && data) {
        return data as unknown as SessionRequest
      }
    } catch {
      // Offline fallback
    }
  }

  const found = mockSessionRequestsStore.find((s) => s.id === id)
  if (found) return found

  // In development mode: synthesize a mock session if not found in memory (e.g. after server restart or direct URL test)
  if (process.env.NODE_ENV !== 'production' && id) {
    const now = new Date()
    const ends = new Date(now.getTime() + 30 * 60 * 1000)
    const fallbackSession: SessionRequest = {
      id,
      student_id: '00000000-0000-0000-0000-000000000010',
      teacher_id: '00000000-0000-0000-0000-000000000002',
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      status: 'online_selected',
      mode: 'online',
      room_id: `meet-${id.slice(0, 8)}`,
      reason: 'Academic Mentoring & Project Review Session',
      location: 'Online Video Call Room',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      student: {
        full_name: 'Aarav Mehta',
        email: 'student@campus.edu',
      },
      teacher: {
        full_name: 'Prof. Rajesh Sharma',
        department: 'Computer Science & Engineering',
        office_hours_text: 'Room 304, Academic Block',
      },
    }
    mockSessionRequestsStore.push(fallbackSession)
    return fallbackSession
  }

  return null
}

// ---------------------------------------------------------------------------
// 5. Video Call Room Access
// ---------------------------------------------------------------------------

/**
 * Verifies participant access and time window for a live video call.
 * Supports force bypass for local preview / testing.
 * Source of truth: src/features/meet/README.md & documents/CONTRACT.md
 */
export async function getSessionCallAccess(
  sessionId: string,
  currentTimeMs: number = Date.now(),
  force: boolean = false
): Promise<CallAccessResult> {
  const { user, profile } = await requireAuth()
  const session = await getSessionRequestById(sessionId)

  if (!session) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Meeting session not found.',
    }
  }

  const isDev = process.env.NODE_ENV !== 'production'

  // 1. Participant check: user must be student, teacher, or admin
  const isStudent = session.student_id === user.id
  const isTeacher = session.teacher_id === user.id
  const isAdmin = profile.role_primary === 'admin'

  if (!isStudent && !isTeacher && !isAdmin && !isDev && !force) {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'You are not a participant in this scheduled meeting.',
      session,
    }
  }

  // 2. Mode check: session must be online (or bypassed in dev/force)
  const isOnline = session.mode === 'online' || session.status === 'online_selected'
  if (!isOnline && session.status !== 'completed' && !force && !isDev) {
    return {
      ok: false,
      code: 'NOT_ONLINE_SESSION',
      message: 'This meeting was scheduled for an in-person office hour, not an online call.',
      session,
    }
  }

  // 3. Time window check:
  // Allowed from 10 minutes prior to starts_at until ends_at
  const startsAtMs = new Date(session.starts_at).getTime()
  const endsAtMs = new Date(session.ends_at).getTime()
  const BUFFER_BEFORE_MS = 10 * 60 * 1000 // 10 minutes

  if (!force && currentTimeMs < startsAtMs - BUFFER_BEFORE_MS) {
    return {
      ok: false,
      code: 'TOO_EARLY',
      message: 'The meeting room has not opened yet. It will open 10 minutes before the scheduled start time.',
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      session,
    }
  }

  if (!force && currentTimeMs > endsAtMs) {
    return {
      ok: false,
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
    : isAdmin
    ? 'admin'
    : profile.role_primary === 'teacher'
    ? 'teacher'
    : 'student'

  const studentName = session.student?.full_name || 'Student'
  const teacherName = session.teacher?.full_name || 'Faculty Member'
  const otherParticipantName = isStudent ? teacherName : studentName
  const otherParticipantRole = isStudent ? 'Faculty Member' : 'Student'

  const roomName = session.room_id || `meet-${session.id.slice(0, 8)}`
  const token = Buffer.from(
    JSON.stringify({
      room: roomName,
      userId: user.id,
      userName: profile.full_name,
      role: userRole,
      exp: Math.floor(Math.max(endsAtMs, Date.now() + 3600000) / 1000),
    })
  ).toString('base64')

  return {
    ok: true,
    session,
    currentUserId: user.id,
    userRole,
    otherParticipantName,
    otherParticipantRole,
    roomName,
    token,
    serverUrl: process.env.LIVEKIT_URL,
    isWindowActive: true,
  }
}

// ---------------------------------------------------------------------------
// 6. Whiteboard Queries
// ---------------------------------------------------------------------------

/**
 * Fetch whiteboard snapshot record for a session.
 * Enforces participant authorization: user must be student, teacher, or admin.
 */
export async function getWhiteboardBySessionId(
  sessionId: string
): Promise<WhiteboardRecord | null> {
  const { user, profile } = await requireAuth()
  const session = await getSessionRequestById(sessionId)

  if (!session) {
    return null
  }

  const isStudent = session.student_id === user.id
  const isTeacher = session.teacher_id === user.id
  const isAdmin = profile.role_primary === 'admin'
  const isDev = process.env.NODE_ENV !== 'production'

  if (!isStudent && !isTeacher && !isAdmin && !isDev) {
    return null
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('meeting_whiteboards')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (!error && data) {
        return (data as unknown as WhiteboardRecord) ?? null
      }
    } catch {
      // Offline fallback
    }
  }

  return MOCK_WHITEBOARDS.get(sessionId) ?? null
}


