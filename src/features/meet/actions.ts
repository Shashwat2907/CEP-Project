'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseOnline } from '@/lib/supabase/status'
import { requireAuth } from '@/shared/auth/guards'
import { revalidatePath } from 'next/cache'
import {
  SaveAvailabilityRuleSchema,
  AddExceptionSchema,
  DeleteRuleSchema,
  DeleteExceptionSchema,
  CreateSessionRequestSchema,
  RespondSessionRequestSchema,
  SelectSessionModeSchema,
  CancelSessionRequestSchema,
  SaveWhiteboardSnapshotSchema,
  type SaveAvailabilityRuleInput,
  type AddExceptionInput,
  type DeleteRuleInput,
  type DeleteExceptionInput,
  type CreateSessionRequestInput,
  type RespondSessionRequestInput,
  type SelectSessionModeInput,
  type CancelSessionRequestInput,
  type SaveWhiteboardSnapshotInput,
  type ActionResult,
  type GeneratedSlot,
  type WhiteboardRecord,
} from './schema'
import { generateTeacherSlots } from './queries'
import { notify } from '@/shared/notifications/notify'
import { addCalendarEntry, removeCalendarEntry } from '@/shared/calendar/calendar'
import {
  MOCK_TEACHERS,
  MOCK_AVAILABILITY_RULES,
  MOCK_AVAILABILITY_EXCEPTIONS,
  MOCK_SESSION_REQUESTS,
  MOCK_WHITEBOARDS,
  ADMITTED_MEET_SESSIONS,
} from './mock-meet-data'

/**
 * Server Actions for Meet Availability, Booking, Mode Selection & Whiteboard.
 * Provides offline/local dev fallbacks when Supabase is not running.
 * Source of truth: src/features/meet/README.md §6
 */

// ---------------------------------------------------------------------------
// 1. Save or Update Weekly Rule
// ---------------------------------------------------------------------------

export async function saveAvailabilityRule(
  input: SaveAvailabilityRuleInput
): Promise<ActionResult<{ ruleId: string }>> {
  const { user, profile } = await requireAuth()

  const isTeacher = profile.role_primary === 'teacher'
  const isAdmin = profile.role_primary === 'admin'
  if (!isTeacher && !isAdmin) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Only faculty members can configure availability rules' },
    }
  }

  const parsed = SaveAvailabilityRuleSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid rule' },
    }
  }

  const { id, weekday, start_time, end_time, slot_minutes } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      if (id) {
        const { error } = await supabase
          .from('availability_rules')
          .update({ weekday, start_time, end_time, slot_minutes })
          .eq('id', id)
          .eq('teacher_id', user.id)

        if (!error) {
          revalidatePath('/meet')
          revalidatePath('/meet/availability')
          return { ok: true, data: { ruleId: id } }
        }
      } else {
        const { data: newRow, error } = await supabase
          .from('availability_rules')
          .insert({
            teacher_id: user.id,
            weekday,
            start_time,
            end_time,
            slot_minutes,
          })
          .select('id')
          .single()

        if (!error && newRow) {
          revalidatePath('/meet')
          revalidatePath('/meet/availability')
          return { ok: true, data: { ruleId: newRow.id } }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Local In-Memory Fallback
  if (id) {
    const idx = MOCK_AVAILABILITY_RULES.findIndex((r) => r.id === id && r.teacher_id === user.id)
    if (idx !== -1) {
      MOCK_AVAILABILITY_RULES[idx] = {
        ...MOCK_AVAILABILITY_RULES[idx],
        weekday,
        start_time,
        end_time,
        slot_minutes,
      }
    }
    revalidatePath('/meet')
    revalidatePath('/meet/availability')
    return { ok: true, data: { ruleId: id } }
  }

  const newId = crypto.randomUUID()
  MOCK_AVAILABILITY_RULES.push({
    id: newId,
    teacher_id: user.id,
    weekday,
    start_time,
    end_time,
    slot_minutes,
    created_at: new Date().toISOString(),
  })

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: { ruleId: newId } }
}

// ---------------------------------------------------------------------------
// 2. Delete Weekly Rule
// ---------------------------------------------------------------------------

export async function deleteAvailabilityRule(
  input: DeleteRuleInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = DeleteRuleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid rule ID' } }
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase.from('availability_rules').delete().eq('id', parsed.data.rule_id)
      if (profile.role_primary !== 'admin') {
        query = query.eq('teacher_id', user.id)
      }
      const { error } = await query
      if (!error) {
        revalidatePath('/meet')
        revalidatePath('/meet/availability')
        return { ok: true, data: undefined }
      }
    } catch {
      // Fallback
    }
  }

  const idx = MOCK_AVAILABILITY_RULES.findIndex((r) => r.id === parsed.data.rule_id)
  if (idx !== -1) {
    MOCK_AVAILABILITY_RULES.splice(idx, 1)
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 3. Add Date Exception (Blocked / Extra)
// ---------------------------------------------------------------------------

export async function addAvailabilityException(
  input: AddExceptionInput
): Promise<ActionResult<{ exceptionId: string }>> {
  const { user, profile } = await requireAuth()

  const isTeacher = profile.role_primary === 'teacher'
  const isAdmin = profile.role_primary === 'admin'
  if (!isTeacher && !isAdmin) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Only faculty members can set date overrides' },
    }
  }

  const parsed = AddExceptionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid exception' },
    }
  }

  const { date, kind, start_time, end_time, reason } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data: newRow, error } = await supabase
        .from('availability_exceptions')
        .insert({
          teacher_id: user.id,
          date,
          kind,
          start_time: start_time || null,
          end_time: end_time || null,
          reason: reason || null,
        })
        .select('id')
        .single()

      if (!error && newRow) {
        revalidatePath('/meet')
        revalidatePath('/meet/availability')
        return { ok: true, data: { exceptionId: newRow.id } }
      }
    } catch {
      // Fallback
    }
  }

  const newId = crypto.randomUUID()
  MOCK_AVAILABILITY_EXCEPTIONS.push({
    id: newId,
    teacher_id: user.id,
    date,
    kind,
    start_time: start_time || null,
    end_time: end_time || null,
    reason: reason || null,
    created_at: new Date().toISOString(),
  })

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: { exceptionId: newId } }
}

// ---------------------------------------------------------------------------
// 4. Delete Date Exception
// ---------------------------------------------------------------------------

export async function deleteAvailabilityException(
  input: DeleteExceptionInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = DeleteExceptionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid exception ID' } }
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase.from('availability_exceptions').delete().eq('id', parsed.data.exception_id)
      if (profile.role_primary !== 'admin') {
        query = query.eq('teacher_id', user.id)
      }
      const { error } = await query
      if (!error) {
        revalidatePath('/meet')
        revalidatePath('/meet/availability')
        return { ok: true, data: undefined }
      }
    } catch {
      // Fallback
    }
  }

  const idx = MOCK_AVAILABILITY_EXCEPTIONS.findIndex((e) => e.id === parsed.data.exception_id)
  if (idx !== -1) {
    MOCK_AVAILABILITY_EXCEPTIONS.splice(idx, 1)
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 5. Client Action: Dynamic Slot Fetching
// ---------------------------------------------------------------------------

export async function fetchSlotsAction(
  teacherId: string,
  dateStr: string
): Promise<GeneratedSlot[]> {
  return generateTeacherSlots(teacherId, dateStr)
}

// ---------------------------------------------------------------------------
// 6. Request Session (Student booking request)
// ---------------------------------------------------------------------------

export async function requestSession(
  input: CreateSessionRequestInput
): Promise<ActionResult<{ requestId: string }>> {
  const { user, profile } = await requireAuth()

  const parsed = CreateSessionRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid request' },
    }
  }

  const { teacher_id, starts_at, ends_at, reason } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      // Pre-check if slot already taken
      const { data: existingAccepted } = await supabase
        .from('session_requests')
        .select('id')
        .eq('teacher_id', teacher_id)
        .in('status', ['accepted', 'offline_selected', 'online_selected'])
        .lt('starts_at', ends_at)
        .gt('ends_at', starts_at)
        .limit(1)

      if (existingAccepted && existingAccepted.length > 0) {
        return {
          ok: false,
          error: {
            code: 'SLOT_UNAVAILABLE',
            message: 'This slot was just taken. Please choose another.',
          },
        }
      }

      const { data: newRow, error } = await supabase
        .from('session_requests')
        .insert({
          student_id: user.id,
          teacher_id,
          starts_at,
          ends_at,
          reason,
          status: 'pending',
        })
        .select('id')
        .single()

      if (!error && newRow) {
        // Dispatch notification
        await notify({
          userId: teacher_id,
          type: 'meet.requested',
          title: 'New Office Hour Request',
          body: `${profile.full_name || 'A student'} requested an appointment: "${reason.slice(0, 60)}"`,
          link: '/meet',
          payload: {
            requestId: newRow.id,
            studentId: user.id,
            startsAt: starts_at,
            reason,
          },
        })

        revalidatePath('/meet')
        return { ok: true, data: { requestId: newRow.id } }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to in-memory store
  const teacher = MOCK_TEACHERS.find((t) => t.id === teacher_id)
  const existing = MOCK_SESSION_REQUESTS.find(
    (s) =>
      s.teacher_id === teacher_id &&
      ['accepted', 'offline_selected', 'online_selected'].includes(s.status) &&
      s.starts_at < ends_at &&
      s.ends_at > starts_at
  )

  if (existing) {
    return {
      ok: false,
      error: {
        code: 'SLOT_UNAVAILABLE',
        message: 'This slot was just taken. Please choose another.',
      },
    }
  }

  const newId = crypto.randomUUID()
  MOCK_SESSION_REQUESTS.unshift({
    id: newId,
    student_id: user.id,
    teacher_id,
    starts_at,
    ends_at,
    reason,
    status: 'pending',
    mode: null,
    location: null,
    room_id: null,
    decline_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student: {
      full_name: profile.full_name || 'Student',
      email: (profile as unknown as { college_email?: string }).college_email || 'student@campus.edu',
    },
    teacher: {
      full_name: teacher?.full_name || 'Faculty Member',
      department: teacher?.department || null,
      office_hours_text: teacher?.office_hours_text || null,
    },
  })

  revalidatePath('/meet')
  return { ok: true, data: { requestId: newId } }
}

// ---------------------------------------------------------------------------
// 7. Teacher Response: Accept or Decline
// ---------------------------------------------------------------------------

export async function respondToSessionRequest(
  input: RespondSessionRequestInput
): Promise<ActionResult<{ status: string }>> {
  const { user, profile } = await requireAuth()

  if (profile.role_primary !== 'teacher' && profile.role_primary !== 'admin') {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Only faculty members can respond to requests' },
    }
  }

  const parsed = RespondSessionRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid response' },
    }
  }

  const { session_id, action, decline_reason } = parsed.data
  const nextStatus = action === 'accept' ? 'accepted' : 'declined'

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      let updateQuery = supabase
        .from('session_requests')
        .update({
          status: nextStatus,
          decline_reason: action === 'decline' ? decline_reason || null : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session_id)

      if (profile.role_primary !== 'admin') {
        updateQuery = updateQuery.eq('teacher_id', user.id)
      }

      const { data: updated, error } = await updateQuery.select('*, student:profiles!session_requests_student_id_fkey(id, full_name)').single()

      if (!error && updated) {
        await notify({
          userId: updated.student_id,
          type: action === 'accept' ? 'meet.accepted' : 'meet.declined',
          title: action === 'accept' ? 'Office Hour Request Accepted' : 'Office Hour Request Declined',
          body:
            action === 'accept'
              ? `${profile.full_name} accepted your appointment request. Please select online or offline mode.`
              : `${profile.full_name} was unable to accept your request${decline_reason ? `: "${decline_reason}"` : '.'}`,
          link: '/meet',
          payload: {
            requestId: session_id,
            teacherId: user.id,
            reason: decline_reason,
          },
        })

        revalidatePath('/meet')
        return { ok: true, data: { status: nextStatus } }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback
  const session = MOCK_SESSION_REQUESTS.find((s) => s.id === session_id)
  if (!session) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Session request not found' } }
  }

  session.status = nextStatus
  session.decline_reason = action === 'decline' ? decline_reason || null : null
  session.updated_at = new Date().toISOString()

  revalidatePath('/meet')
  return { ok: true, data: { status: nextStatus } }
}

// ---------------------------------------------------------------------------
// 8. Student Select Mode (Offline vs Online)
// ---------------------------------------------------------------------------

export async function selectSessionMode(
  input: SelectSessionModeInput
): Promise<ActionResult<{ status: string; location?: string | null; roomId?: string | null }>> {
  const { user } = await requireAuth()

  const parsed = SelectSessionModeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid session mode' },
    }
  }

  const { session_id, mode } = parsed.data
  const nextStatus = mode === 'offline' ? 'offline_selected' : 'online_selected'

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data: session } = await supabase
        .from('session_requests')
        .select('*, teacher:profiles!session_requests_teacher_id_fkey(full_name, office_hours_text)')
        .eq('id', session_id)
        .eq('student_id', user.id)
        .single()

      if (session) {
        const assignedLocation = mode === 'offline' ? session.teacher?.office_hours_text || 'Teacher Cabin' : null
        const roomId = mode === 'online' ? `meet-${session.id.slice(0, 8)}` : null

        const { error: updateErr } = await supabase
          .from('session_requests')
          .update({
            status: nextStatus,
            mode,
            location: assignedLocation,
            room_id: roomId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session_id)

        if (!updateErr) {
          await addCalendarEntry({
            userId: session.student_id,
            sourceType: 'meet',
            sourceId: session.id,
            title: `Meet with ${session.teacher?.full_name || 'Faculty'}`,
            startsAt: session.starts_at,
            endsAt: session.ends_at,
            location: assignedLocation ?? (roomId ? 'Online Video Call' : undefined),
          })

          await addCalendarEntry({
            userId: session.teacher_id,
            sourceType: 'meet',
            sourceId: session.id,
            title: `Student Appointment`,
            startsAt: session.starts_at,
            endsAt: session.ends_at,
            location: assignedLocation ?? (roomId ? 'Online Video Call' : undefined),
          })

          revalidatePath('/meet')
          revalidatePath(`/meet/${session_id}`)
          return {
            ok: true,
            data: { status: nextStatus, location: assignedLocation, roomId },
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback
  const session = MOCK_SESSION_REQUESTS.find((s) => s.id === session_id)
  if (!session) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Session request not found' } }
  }

  session.mode = mode
  session.status = nextStatus
  session.location = mode === 'offline' ? session.teacher?.office_hours_text || 'Faculty Cabin' : null
  session.room_id = mode === 'online' ? `meet-${session.id.slice(0, 8)}` : null
  session.updated_at = new Date().toISOString()

  revalidatePath('/meet')
  revalidatePath(`/meet/${session_id}`)
  return {
    ok: true,
    data: {
      status: nextStatus,
      location: session.location,
      roomId: session.room_id,
    },
  }
}

// ---------------------------------------------------------------------------
// 9. Cancel Session Request
// ---------------------------------------------------------------------------

export async function cancelSessionRequest(
  input: CancelSessionRequestInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = CancelSessionRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid cancel request' },
    }
  }

  const { session_id, cancel_reason } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data: session } = await supabase
        .from('session_requests')
        .select('*')
        .eq('id', session_id)
        .single()

      if (session) {
        const { error } = await supabase
          .from('session_requests')
          .update({
            status: 'cancelled',
            decline_reason: cancel_reason || 'Cancelled by user',
            updated_at: new Date().toISOString(),
          })
          .eq('id', session_id)

        if (!error) {
          await removeCalendarEntry(session_id, 'meet')
          revalidatePath('/meet')
          return { ok: true, data: undefined }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback
  const session = MOCK_SESSION_REQUESTS.find((s) => s.id === session_id)
  if (!session) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Session request not found' } }
  }

  session.status = 'cancelled'
  session.decline_reason = cancel_reason || 'Cancelled by user'
  session.updated_at = new Date().toISOString()

  revalidatePath('/meet')
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 10. Expire Pending Sessions (Scheduled Job Helper)
// ---------------------------------------------------------------------------

export async function expirePendingSessions(): Promise<{ expiredCount: number }> {
  return { expiredCount: 0 }
}

// ---------------------------------------------------------------------------
// 11. Whiteboard Actions
// ---------------------------------------------------------------------------

export async function saveWhiteboardSnapshot(
  input: SaveWhiteboardSnapshotInput
): Promise<ActionResult<{ whiteboardId: string; version: number }>> {
  const { user, profile } = await requireAuth()

  const parsed = SaveWhiteboardSnapshotSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'Invalid whiteboard snapshot data',
      },
    }
  }

  const { session_id, snapshot_data, thumbnail_url } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: existing } = await supabase
        .from('meeting_whiteboards')
        .select('id, version')
        .eq('session_id', session_id)
        .maybeSingle()

      if (existing) {
        const nextVersion = (existing.version || 1) + 1
        const { data: updated, error } = await supabase
          .from('meeting_whiteboards')
          .update({
            snapshot_data,
            thumbnail_url: thumbnail_url ?? null,
            version: nextVersion,
            saved_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id, version')
          .single()

        if (!error && updated) {
          revalidatePath(`/meet/${session_id}`)
          revalidatePath(`/meet/${session_id}/whiteboard`)
          return {
            ok: true,
            data: {
              whiteboardId: updated.id,
              version: updated.version,
            },
          }
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('meeting_whiteboards')
          .insert({
            session_id,
            room_id: `meet-${session_id.slice(0, 8)}`,
            snapshot_data,
            thumbnail_url: thumbnail_url ?? null,
            version: 1,
            saved_by: user.id,
          })
          .select('id, version')
          .single()

        if (!error && inserted) {
          revalidatePath(`/meet/${session_id}`)
          revalidatePath(`/meet/${session_id}/whiteboard`)
          return {
            ok: true,
            data: {
              whiteboardId: inserted.id,
              version: inserted.version,
            },
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback
  const existing = MOCK_WHITEBOARDS.get(session_id)
  const nextVersion = (existing?.version || 0) + 1
  const wbRecord: WhiteboardRecord = {
    id: existing?.id || crypto.randomUUID(),
    session_id,
    room_id: `meet-${session_id.slice(0, 8)}`,
    snapshot_data,
    thumbnail_url: thumbnail_url ?? null,
    version: nextVersion,
    saved_by: user.id,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  MOCK_WHITEBOARDS.set(session_id, wbRecord)
  revalidatePath(`/meet/${session_id}`)
  revalidatePath(`/meet/${session_id}/whiteboard`)

  return {
    ok: true,
    data: {
      whiteboardId: wbRecord.id,
      version: nextVersion,
    },
  }
}

// ---------------------------------------------------------------------------
// 12. Faculty Admission Control for Live Meeting Room
// ---------------------------------------------------------------------------

/**
 * Admits student waiting in the lobby into the active video call room.
 * Required before student can enter the meeting.
 */
export async function admitStudentToCall(
  sessionId: string
): Promise<ActionResult<{ admitted: boolean }>> {
  ADMITTED_MEET_SESSIONS.add(sessionId)

  const session = MOCK_SESSION_REQUESTS.find((s) => s.id === sessionId)
  if (session) {
    session.is_admitted = true
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      await supabase
        .from('session_requests')
        .update({ is_admitted: true, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    } catch {
      // ignore
    }
  }

  if (session) {
    await notify({
      userId: session.student_id,
      type: 'meet.accepted',
      title: 'Faculty Admitted You to Video Call',
      body: `${session.teacher?.full_name || 'Faculty Member'} has admitted you to the video room. Entering call...`,
      link: `/meet/${sessionId}`,
      payload: { sessionId },
    }).catch(() => {})
  }

  revalidatePath(`/meet/${sessionId}`)
  return { ok: true, data: { admitted: true } }
}

/**
 * Checks whether faculty has admitted the student to the live call.
 */
export async function checkSessionAdmission(
  sessionId: string
): Promise<{ admitted: boolean }> {
  const session = MOCK_SESSION_REQUESTS.find((s) => s.id === sessionId)
  const isAdmitted = ADMITTED_MEET_SESSIONS.has(sessionId) || Boolean(session?.is_admitted)
  return { admitted: isAdmitted }
}

