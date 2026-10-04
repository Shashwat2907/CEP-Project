'use server'

import { createClient } from '@/lib/supabase/server'
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
} from './schema'
import { generateTeacherSlots } from './queries'
import { notify } from '@/shared/notifications/notify'
import { addCalendarEntry, removeCalendarEntry } from '@/shared/calendar/calendar'

/**
 * Server Actions for Meet Availability (Rules & Exceptions).
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
  const supabase = await createClient()

  if (id) {
    // Update existing rule
    const { error } = await supabase
      .from('availability_rules')
      .update({ weekday, start_time, end_time, slot_minutes })
      .eq('id', id)
      .eq('teacher_id', user.id)

    if (error) {
      console.error('[meet/actions] updateRule error:', error.message)
      return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: error.message } }
    }

    revalidatePath('/meet')
    revalidatePath('/meet/availability')
    return { ok: true, data: { ruleId: id } }
  }

  // Insert new rule
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

  if (error || !newRow) {
    console.error('[meet/actions] insertRule error:', error?.message)
    return {
      ok: false,
      error: { code: 'DB_INSERT_FAILED', message: error?.message ?? 'Failed to save rule' },
    }
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: { ruleId: newRow.id } }
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

  const supabase = await createClient()
  let query = supabase.from('availability_rules').delete().eq('id', parsed.data.rule_id)

  if (profile.role_primary !== 'admin') {
    query = query.eq('teacher_id', user.id)
  }

  const { error } = await query
  if (error) {
    console.error('[meet/actions] deleteRule error:', error.message)
    return { ok: false, error: { code: 'DB_DELETE_FAILED', message: error.message } }
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

  if (error || !newRow) {
    console.error('[meet/actions] addException error:', error?.message)
    return {
      ok: false,
      error: { code: 'DB_INSERT_FAILED', message: error?.message ?? 'Failed to add exception' },
    }
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: { exceptionId: newRow.id } }
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

  const supabase = await createClient()
  let query = supabase.from('availability_exceptions').delete().eq('id', parsed.data.exception_id)

  if (profile.role_primary !== 'admin') {
    query = query.eq('teacher_id', user.id)
  }

  const { error } = await query
  if (error) {
    console.error('[meet/actions] deleteException error:', error.message)
    return { ok: false, error: { code: 'DB_DELETE_FAILED', message: error.message } }
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
  const supabase = await createClient()

  // Verify teacher exists
  const { data: teacher, error: teacherErr } = await supabase
    .from('profiles')
    .select('id, full_name, office_hours_text')
    .eq('id', teacher_id)
    .single()

  if (teacherErr || !teacher) {
    return {
      ok: false,
      error: { code: 'TEACHER_NOT_FOUND', message: 'Selected faculty member not found' },
    }
  }

  // Pre-check if slot already taken by an accepted session
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

  // Insert session request
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

  if (error || !newRow) {
    console.error('[meet/actions] requestSession error:', error?.message)
    if (
      error?.code === '23P01' ||
      error?.message?.includes('no_overlapping_accepted_sessions') ||
      error?.message?.includes('exclusion')
    ) {
      return {
        ok: false,
        error: {
          code: 'SLOT_UNAVAILABLE',
          message: 'This slot was just taken. Please choose another.',
        },
      }
    }
    return {
      ok: false,
      error: { code: 'DB_INSERT_FAILED', message: error?.message ?? 'Failed to submit request' },
    }
  }

  // Notify teacher of the new request
  await notify(
    {
      userId: teacher_id,
      type: 'meet.requested',
      title: 'New Office Hour Request',
      body: `${profile.full_name || 'A student'} requested an appointment: "${reason.slice(0, 60)}${reason.length > 60 ? '...' : ''}"`,
      link: '/meet',
      payload: {
        requestId: newRow.id,
        studentId: user.id,
        startsAt: starts_at,
        reason,
      },
    },
    supabase as unknown as Parameters<typeof notify>[1]
  )

  revalidatePath('/meet')
  return { ok: true, data: { requestId: newRow.id } }
}

// ---------------------------------------------------------------------------
// 7. Respond to Session Request (Teacher accept/decline)
// ---------------------------------------------------------------------------

export async function respondToSessionRequest(
  input: RespondSessionRequestInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = RespondSessionRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid response' },
    }
  }

  const { session_id, action, decline_reason } = parsed.data
  const supabase = await createClient()

  // Fetch session
  const { data: session, error: fetchErr } = await supabase
    .from('session_requests')
    .select('*')
    .eq('id', session_id)
    .single()

  if (fetchErr || !session) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Session request not found' } }
  }

  // Verify authorization (must be teacher or admin)
  if (session.teacher_id !== user.id && profile.role_primary !== 'admin') {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authorized to respond to this request' } }
  }

  if (session.status !== 'pending') {
    return {
      ok: false,
      error: { code: 'INVALID_STATUS', message: `Cannot respond to a request in '${session.status}' status` },
    }
  }

  if (action === 'accept') {
    const { error: updateErr } = await supabase
      .from('session_requests')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session_id)

    if (updateErr) {
      console.error('[meet/actions] accept session error:', updateErr.message)
      if (
        updateErr.code === '23P01' ||
        updateErr.message?.includes('no_overlapping_accepted_sessions') ||
        updateErr.message?.includes('exclusion')
      ) {
        return {
          ok: false,
          error: {
            code: 'SLOT_UNAVAILABLE',
            message: 'This slot was just taken. Please choose another.',
          },
        }
      }
      return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: updateErr.message } }
    }

    // Notify student of acceptance
    await notify(
      {
        userId: session.student_id,
        type: 'meet.accepted',
        title: 'Meeting Request Accepted',
        body: 'Faculty accepted your appointment request. Please select offline or online meeting mode.',
        link: '/meet',
        payload: {
          requestId: session.id,
          teacherId: session.teacher_id,
        },
      },
      supabase as unknown as Parameters<typeof notify>[1]
    )
  } else {
    // Decline
    const { error: updateErr } = await supabase
      .from('session_requests')
      .update({
        status: 'declined',
        decline_reason: decline_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session_id)

    if (updateErr) {
      console.error('[meet/actions] decline session error:', updateErr.message)
      return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: updateErr.message } }
    }

    // Notify student of decline
    await notify(
      {
        userId: session.student_id,
        type: 'meet.declined',
        title: 'Meeting Request Declined',
        body: decline_reason
          ? `Faculty declined your request: "${decline_reason}"`
          : 'Faculty declined your appointment request.',
        link: '/meet',
        payload: {
          requestId: session.id,
          reason: decline_reason,
        },
      },
      supabase as unknown as Parameters<typeof notify>[1]
    )
  }

  revalidatePath('/meet')
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 8. Select Session Mode (Student picks offline / online after accept)
// ---------------------------------------------------------------------------

export async function selectSessionMode(
  input: SelectSessionModeInput
): Promise<ActionResult<{ mode: 'offline' | 'online'; location: string; roomId: string | null }>> {
  const { user, profile } = await requireAuth()

  const parsed = SelectSessionModeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid mode selection' },
    }
  }

  const { session_id, mode } = parsed.data
  const supabase = await createClient()

  const { data: session, error: fetchErr } = await supabase
    .from('session_requests')
    .select(`
      *,
      teacher:profiles!session_requests_teacher_id_fkey(full_name, office_hours_text)
    `)
    .eq('id', session_id)
    .single()

  if (fetchErr || !session) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Session request not found' } }
  }

  // Must be student
  if (session.student_id !== user.id && profile.role_primary !== 'admin') {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Only the requesting student can select mode' } }
  }

  if (session.status !== 'accepted') {
    return {
      ok: false,
      error: { code: 'INVALID_STATUS', message: 'Session mode can only be chosen after the teacher accepts.' },
    }
  }

  const teacherName = (session.teacher as { full_name?: string } | null)?.full_name || 'Faculty Member'
  const officeLocation = (session.teacher as { office_hours_text?: string } | null)?.office_hours_text || 'Faculty Office'

  const locationText = mode === 'offline' ? officeLocation : 'Online Video Call'
  const roomId = mode === 'online' ? `meet-${session.id.slice(0, 8)}` : null
  const newStatus = mode === 'offline' ? 'offline_selected' : 'online_selected'

  const { error: updateErr } = await supabase
    .from('session_requests')
    .update({
      status: newStatus,
      mode,
      location: locationText,
      room_id: roomId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session_id)

  if (updateErr) {
    console.error('[meet/actions] selectSessionMode error:', updateErr.message)
    return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: updateErr.message } }
  }

  // Add calendar entries for both student and teacher
  await addCalendarEntry(
    {
      userId: session.student_id,
      sourceType: 'meet',
      sourceId: session.id,
      title: `Faculty Meeting with ${teacherName} (${mode === 'offline' ? 'In-Person' : 'Online'})`,
      location: locationText,
      link: '/meet',
      startsAt: session.starts_at,
      endsAt: session.ends_at,
    },
    supabase as unknown as Parameters<typeof addCalendarEntry>[1]
  )

  await addCalendarEntry(
    {
      userId: session.teacher_id,
      sourceType: 'meet',
      sourceId: session.id,
      title: `Student Meeting with ${profile.full_name || 'Student'} (${mode === 'offline' ? 'In-Person' : 'Online'})`,
      location: locationText,
      link: '/meet',
      startsAt: session.starts_at,
      endsAt: session.ends_at,
    },
    supabase as unknown as Parameters<typeof addCalendarEntry>[1]
  )

  revalidatePath('/meet')
  return {
    ok: true,
    data: {
      mode,
      location: locationText,
      roomId,
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
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid cancellation' },
    }
  }

  const { session_id, cancel_reason } = parsed.data
  const supabase = await createClient()

  const { data: session, error: fetchErr } = await supabase
    .from('session_requests')
    .select('*')
    .eq('id', session_id)
    .single()

  if (fetchErr || !session) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }
  }

  const isStudent = session.student_id === user.id
  const isTeacher = session.teacher_id === user.id
  const isAdmin = profile.role_primary === 'admin'

  if (!isStudent && !isTeacher && !isAdmin) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authorized to cancel this session' } }
  }

  if (['cancelled', 'completed', 'declined', 'expired'].includes(session.status)) {
    return {
      ok: false,
      error: { code: 'INVALID_STATUS', message: `Cannot cancel a session that is already '${session.status}'` },
    }
  }

  // Rate limit: Student cannot cancel more than 3 sessions in a single day
  if (isStudent) {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

    const { count, error: countErr } = await supabase
      .from('session_requests')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'cancelled')
      .gte('updated_at', startOfToday)

    if (!countErr && (count ?? 0) >= 3) {
      return {
        ok: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'You have reached the maximum of 3 cancellations for today. You cannot cancel again until tomorrow.',
        },
      }
    }
  }

  // Check if cancellation is last-minute (within 1 hour of starts_at)
  const startsAtMs = new Date(session.starts_at).getTime()
  const nowMs = Date.now()
  const isLastMinute = startsAtMs - nowMs < 60 * 60 * 1000 && startsAtMs > nowMs

  // Update session to cancelled
  const { error: updateErr } = await supabase
    .from('session_requests')
    .update({
      status: 'cancelled',
      decline_reason: cancel_reason || (isLastMinute ? 'Last-minute cancellation' : 'Cancelled by participant'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session_id)

  if (updateErr) {
    console.error('[meet/actions] cancelSessionRequest error:', updateErr.message)
    return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: updateErr.message } }
  }

  // Remove calendar entries for both participants
  await removeCalendarEntry(
    { sourceType: 'meet', sourceId: session.id, userId: session.student_id },
    supabase as unknown as Parameters<typeof removeCalendarEntry>[1]
  )
  await removeCalendarEntry(
    { sourceType: 'meet', sourceId: session.id, userId: session.teacher_id },
    supabase as unknown as Parameters<typeof removeCalendarEntry>[1]
  )

  // Notify the other participant
  const recipientId = isStudent ? session.teacher_id : session.student_id
  await notify(
    {
      userId: recipientId,
      type: 'meet.cancelled',
      title: isLastMinute ? 'Session Cancelled (Last-Minute)' : 'Session Cancelled',
      body: `${profile.full_name || 'Participant'} cancelled the session.${cancel_reason ? ` Reason: "${cancel_reason}"` : ''}`,
      link: '/meet',
      payload: {
        requestId: session.id,
        reason: cancel_reason,
        isLastMinute,
      },
    },
    supabase as unknown as Parameters<typeof notify>[1]
  )

  revalidatePath('/meet')
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 10. Background / Scheduled Expiry of Stale 48h Requests
// ---------------------------------------------------------------------------

export async function expirePendingSessions(): Promise<{ expiredCount: number }> {
  const supabase = await createClient()

  // 48 hours ago cutoff
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: expiredSessions, error } = await supabase
    .from('session_requests')
    .select('id, student_id, teacher_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  if (error || !expiredSessions || expiredSessions.length === 0) {
    return { expiredCount: 0 }
  }

  let count = 0
  for (const session of expiredSessions) {
    const { error: updErr } = await supabase
      .from('session_requests')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (!updErr) {
      count++
      // Notify student
      await notify(
        {
          userId: session.student_id,
          type: 'meet.expired',
          title: 'Session Request Expired',
          body: 'Your meeting request has expired because the faculty member did not respond within 48 hours.',
          link: '/meet',
          payload: { requestId: session.id },
        },
        supabase as unknown as Parameters<typeof notify>[1]
      )
    }
  }

  return { expiredCount: count }
}

// ---------------------------------------------------------------------------
// 8. Whiteboard Actions
// ---------------------------------------------------------------------------

/**
 * Save or update collaborative whiteboard snapshot for a session.
 * Only authorized participants (student, teacher, admin) can persist snapshots.
 */
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
  const supabase = await createClient()

  // 1. Verify session exists and user is participant or admin
  const { data: session, error: sessionErr } = await supabase
    .from('session_requests')
    .select('id, student_id, teacher_id, room_id')
    .eq('id', session_id)
    .single()

  if (sessionErr || !session) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Meeting session not found' },
    }
  }

  const isStudent = session.student_id === user.id
  const isTeacher = session.teacher_id === user.id
  const isAdmin = profile.role_primary === 'admin'

  if (!isStudent && !isTeacher && !isAdmin) {
    return {
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'You are not authorized to save whiteboards for this session.',
      },
    }
  }

  const roomId = session.room_id || `meet-${session.id.slice(0, 8)}`

  // 2. Check if a whiteboard record already exists for this session
  const { data: existing } = await supabase
    .from('meeting_whiteboards')
    .select('id, version')
    .eq('session_id', session_id)
    .maybeSingle()

  if (existing) {
    const nextVersion = (existing.version || 1) + 1
    const { data: updated, error: updateErr } = await supabase
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

    if (updateErr) {
      console.error('[meet/actions] updateWhiteboard error:', updateErr.message)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'Failed to update whiteboard snapshot' },
      }
    }

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

  // 3. Insert new whiteboard snapshot record
  const { data: inserted, error: insertErr } = await supabase
    .from('meeting_whiteboards')
    .insert({
      session_id,
      room_id: roomId,
      snapshot_data,
      thumbnail_url: thumbnail_url ?? null,
      version: 1,
      saved_by: user.id,
    })
    .select('id, version')
    .single()

  if (insertErr) {
    console.error('[meet/actions] insertWhiteboard error:', insertErr.message)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Failed to save whiteboard snapshot' },
    }
  }

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

