'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseOnline } from '@/lib/supabase/status'
import { requireAuth } from '@/shared/auth/guards'
import { notify } from '@/shared/notifications/notify'
import { revalidatePath } from 'next/cache'
import {
  MOCK_COMPLAINT_DOMAINS,
  mockComplaintsStore,
  mockUpvotesStore,
} from './mock-complaints-data'
import {
  CreateComplaintSchema,
  ResolveComplaintSchema,
  ReopenComplaintSchema,
  UpdateStatusSchema,
  type CreateComplaintInput,
  type ResolveComplaintInput,
  type ReopenComplaintInput,
  type UpdateStatusInput,
  type ActionResult,
  type EscalationResult,
  ToggleUpvoteSchema,
  MarkDuplicateSchema,
  type ToggleUpvoteInput,
  type MarkDuplicateInput,
  type SimilarComplaint,
} from './schema'
import { searchSimilarComplaints } from './queries'

/**
 * Server Actions for the Complaints feature.
 * All mutations validate with Zod, enforce user session checks,
 * log audit transitions to complaint_events, and trigger notifications.
 * Source of truth: src/features/complaints/README.md & documents/CONTRACT.md §5.5
 */

// ---------------------------------------------------------------------------
// 1. Submit a New Complaint
// ---------------------------------------------------------------------------

export async function submitComplaint(
  input: CreateComplaintInput
): Promise<ActionResult<{ complaintId: string }>> {
  const { user } = await requireAuth()

  const parsed = CreateComplaintSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'Invalid complaint input',
      },
    }
  }

  const { domain_id, subcategory_id, title, body, anonymous, attachments } = parsed.data

  if (!(await isSupabaseOnline())) {
    const newId = `c-${Date.now()}`
    const newComplaint = {
      id: newId,
      author_id: user.id,
      domain_id,
      subcategory_id: subcategory_id ?? null,
      title,
      body,
      status: 'submitted' as const,
      current_level: 1,
      assigned_to: '00000000-0000-0000-0000-000000000002',
      anonymous,
      needs_admin_attention: false,
      upvotes_count: 0,
      has_upvoted: false,
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      domain: MOCK_COMPLAINT_DOMAINS.find((d) => d.id === domain_id) ?? {
        id: domain_id,
        name: 'Campus Infrastructure',
        sensitive: false,
        visibility: 'public' as const,
      },
      author: anonymous
        ? { full_name: 'Anonymous Student', role_primary: 'student' }
        : { full_name: 'Aarav Mehta', role_primary: 'student' },
      events: [
        {
          id: `e-${Date.now()}`,
          complaint_id: newId,
          type: 'submitted' as const,
          actor_id: user.id,
          actor: { full_name: 'Aarav Mehta', role_primary: 'student' },
          note: 'Complaint submitted by student',
          created_at: new Date().toISOString(),
        },
      ],
    }
    mockComplaintsStore.unshift(newComplaint)
    revalidatePath('/complaints')
    return { ok: true, data: { complaintId: newId } }
  }

  const supabase = await createClient()

  // 1. Determine Level 1 assignee and SLA hours for this domain
  const { data: assigneeRow } = await supabase
    .from('domain_assignees')
    .select('assignee_id, sla_hours')
    .eq('domain_id', domain_id)
    .eq('level', 1)
    .maybeSingle()

  const slaHours = assigneeRow?.sla_hours ?? 24
  const assignedTo = assigneeRow?.assignee_id ?? null
  const dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString()

  // 2. Insert into complaints table
  const { data: complaint, error: insertError } = await supabase
    .from('complaints')
    .insert({
      author_id: user.id,
      domain_id,
      subcategory_id: subcategory_id ?? null,
      title,
      body,
      status: 'submitted',
      current_level: 1,
      assigned_to: assignedTo,
      anonymous,
      due_at: dueAt,
    })
    .select('id, title')
    .single()

  if (insertError || !complaint) {
    console.error('[complaints/actions] submitComplaint error:', insertError?.message)
    return {
      ok: false,
      error: {
        code: 'DB_INSERT_FAILED',
        message: 'Failed to record complaint. Please try again.',
      },
    }
  }

  // 3. Record audit trail in complaint_events
  await supabase.from('complaint_events').insert({
    complaint_id: complaint.id,
    type: 'submitted',
    to_level: 1,
    to_status: 'submitted',
    actor_id: user.id,
    note: 'Complaint submitted by student',
  })

  // 4. Save any attachments
  if (attachments && attachments.length > 0) {
    const attachmentRows = attachments.map((att) => ({
      complaint_id: complaint.id,
      storage_path: att.storage_path,
      file_name: att.file_name,
      file_size: att.file_size ?? null,
      mime_type: att.mime_type ?? null,
    }))
    await supabase.from('complaint_attachments').insert(attachmentRows)
  }

  // 5. Notify assigned handler if known (type: 'complaint.created')
  if (assignedTo) {
    await notify({
      userId: assignedTo,
      type: 'complaint.created',
      title: 'New Complaint Assigned',
      body: `A new ticket has been assigned to you: "${title}"`,
      link: `/complaints/${complaint.id}`,
      payload: { complaintId: complaint.id, domainId: domain_id },
    })
  }

  revalidatePath('/complaints')
  return { ok: true, data: { complaintId: complaint.id } }
}

// ---------------------------------------------------------------------------
// 2. Resolve Complaint (Handler action)
// ---------------------------------------------------------------------------

export async function resolveComplaint(
  input: ResolveComplaintInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = ResolveComplaintSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'Invalid resolution note',
      },
    }
  }

  const { complaint_id, resolution_note } = parsed.data
  const supabase = await createClient()

  // Fetch complaint to verify permissions and get author for notification
  const { data: complaint, error: fetchError } = await supabase
    .from('complaints')
    .select('id, author_id, assigned_to, status, title')
    .eq('id', complaint_id)
    .single()

  if (fetchError || !complaint) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Complaint not found' },
    }
  }

  // Guard: Only assigned handler or admin can mark resolved
  const isAssigned = complaint.assigned_to === user.id
  const isAdmin = profile.role_primary === 'admin'
  if (!isAssigned && !isAdmin) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'You are not assigned to resolve this complaint' },
    }
  }

  // Update complaint to resolved
  const { error: updateError } = await supabase
    .from('complaints')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_note,
    })
    .eq('id', complaint_id)

  if (updateError) {
    return {
      ok: false,
      error: { code: 'DB_UPDATE_FAILED', message: updateError.message },
    }
  }

  // Record audit trail event
  await supabase.from('complaint_events').insert({
    complaint_id,
    type: 'resolved',
    from_status: complaint.status,
    to_status: 'resolved',
    actor_id: user.id,
    note: resolution_note,
  })

  // Notify student author (type: 'complaint.resolved')
  await notify({
    userId: complaint.author_id,
    type: 'complaint.resolved',
    title: 'Your Complaint Has Been Resolved',
    body: `Note: ${resolution_note}`,
    link: `/complaints/${complaint_id}`,
    payload: { complaintId: complaint_id, resolutionNote: resolution_note },
  })

  revalidatePath('/complaints')
  revalidatePath(`/complaints/${complaint_id}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 3. Confirm Resolution & Close (Student action)
// ---------------------------------------------------------------------------

export async function confirmResolution(
  complaintId: string
): Promise<ActionResult> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, author_id, status')
    .eq('id', complaintId)
    .single()

  if (!complaint || complaint.author_id !== user.id) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Only the author can confirm resolution' },
    }
  }

  const { error: updateError } = await supabase
    .from('complaints')
    .update({ status: 'closed' })
    .eq('id', complaintId)

  if (updateError) {
    return {
      ok: false,
      error: { code: 'DB_UPDATE_FAILED', message: updateError.message },
    }
  }

  await supabase.from('complaint_events').insert({
    complaint_id: complaintId,
    type: 'closed',
    from_status: complaint.status,
    to_status: 'closed',
    actor_id: user.id,
    note: 'Student confirmed the issue has been resolved',
  })

  revalidatePath('/complaints')
  revalidatePath(`/complaints/${complaintId}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 4. Reopen Complaint (Student action)
// ---------------------------------------------------------------------------

export async function reopenComplaint(
  input: ReopenComplaintInput
): Promise<ActionResult> {
  const { user } = await requireAuth()

  const parsed = ReopenComplaintSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'Invalid reopen note',
      },
    }
  }

  const { complaint_id, reopen_note } = parsed.data
  const supabase = await createClient()

  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, author_id, assigned_to, status, title')
    .eq('id', complaint_id)
    .single()

  if (!complaint || complaint.author_id !== user.id) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Only the author can reopen a complaint' },
    }
  }

  const { error: updateError } = await supabase
    .from('complaints')
    .update({
      status: 'reopened',
      reopen_note,
    })
    .eq('id', complaint_id)

  if (updateError) {
    return {
      ok: false,
      error: { code: 'DB_UPDATE_FAILED', message: updateError.message },
    }
  }

  await supabase.from('complaint_events').insert({
    complaint_id,
    type: 'reopened',
    from_status: complaint.status,
    to_status: 'reopened',
    actor_id: user.id,
    note: reopen_note,
  })

  // Notify handler if assigned that ticket has been reopened
  if (complaint.assigned_to) {
    await notify({
      userId: complaint.assigned_to,
      type: 'complaint.escalated',
      title: 'Complaint Reopened by Student',
      body: `Reopen note: ${reopen_note}`,
      link: `/complaints/${complaint_id}`,
      payload: { complaintId: complaint_id },
    })
  }

  revalidatePath('/complaints')
  revalidatePath(`/complaints/${complaint_id}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 5. Update Status (e.g. In Progress)
// ---------------------------------------------------------------------------

export async function updateComplaintStatus(
  input: UpdateStatusInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = UpdateStatusSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'Invalid status',
      },
    }
  }

  const { complaint_id, status, note } = parsed.data
  const supabase = await createClient()

  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, assigned_to, status')
    .eq('id', complaint_id)
    .single()

  if (!complaint) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' } }
  }

  const isAssigned = complaint.assigned_to === user.id
  const isAdmin = profile.role_primary === 'admin'
  if (!isAssigned && !isAdmin) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authorized to change status' } }
  }

  const { error: updateError } = await supabase
    .from('complaints')
    .update({ status })
    .eq('id', complaint_id)

  if (updateError) {
    return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: updateError.message } }
  }

  await supabase.from('complaint_events').insert({
    complaint_id,
    type: 'status_changed',
    from_status: complaint.status,
    to_status: status,
    actor_id: user.id,
    note: note ?? `Status updated to ${status}`,
  })

  revalidatePath('/complaints')
  revalidatePath(`/complaints/${complaint_id}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 6. Automated Escalation Action (Cron / Scheduled Job / Admin manual run)
// ---------------------------------------------------------------------------

export async function escalateOverdueComplaintsAction(): Promise<
  ActionResult<EscalationResult>
> {
  const supabase = await createClient()

  // 1. Try to invoke the PostgreSQL stored procedure check_and_escalate_overdue_complaints()
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'check_and_escalate_overdue_complaints'
  )

  let escalatedCount = 0
  let flaggedCount = 0
  let escalatedIds: string[] = []
  let flaggedIds: string[] = []

  if (!rpcError && rpcResult) {
    escalatedCount = rpcResult.escalated_count ?? 0
    flaggedCount = rpcResult.flagged_admin_count ?? 0
    escalatedIds = rpcResult.escalated_complaint_ids ?? []
    flaggedIds = rpcResult.flagged_complaint_ids ?? []
  } else {
    // Fallback: Pure TypeScript implementation for environments without RPC or for mock clients
    const nowIso = new Date().toISOString()
    const { data: overdueComplaints, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, domain_id, current_level, assigned_to, author_id, title, needs_admin_attention')
      .not('status', 'in', '("resolved","closed")')
      .not('due_at', 'is', null)
      .lt('due_at', nowIso)

    if (fetchErr) {
      console.error('[complaints/actions] Failed to fetch overdue complaints:', fetchErr.message)
      return {
        ok: false,
        error: { code: 'DB_FETCH_FAILED', message: fetchErr.message },
      }
    }

    for (const complaint of overdueComplaints ?? []) {
      const nextLevel = complaint.current_level + 1
      const { data: nextAssignee } = await supabase
        .from('domain_assignees')
        .select('level, role_name, assignee_id, sla_hours')
        .eq('domain_id', complaint.domain_id)
        .eq('level', nextLevel)
        .maybeSingle()

      if (nextAssignee) {
        // Attempt to insert escalation event (idempotency check)
        const { data: eventData, error: eventErr } = await supabase
          .from('complaint_events')
          .insert({
            complaint_id: complaint.id,
            type: 'escalated',
            from_level: complaint.current_level,
            to_level: nextAssignee.level,
            from_status: 'in_progress',
            to_status: 'escalated',
            actor_id: null,
            note: `Automated escalation: SLA breached at Level ${complaint.current_level} (${nextAssignee.role_name})`,
          })
          .select('id')
          .single()

        if (!eventErr && eventData) {
          const nextDueAt = new Date(Date.now() + (nextAssignee.sla_hours || 24) * 3600000).toISOString()
          await supabase
            .from('complaints')
            .update({
              current_level: nextAssignee.level,
              assigned_to: nextAssignee.assignee_id,
              status: 'escalated',
              due_at: nextDueAt,
            })
            .eq('id', complaint.id)

          escalatedCount++
          escalatedIds.push(complaint.id)

          // Notify new assignee
          if (nextAssignee.assignee_id) {
            await notify({
              userId: nextAssignee.assignee_id,
              type: 'complaint.escalated',
              title: `Complaint Escalated to Level ${nextAssignee.level} (${nextAssignee.role_name})`,
              body: `Ticket "${complaint.title}" has breached SLA and was escalated to you.`,
              link: `/complaints/${complaint.id}`,
              payload: { complaintId: complaint.id, level: nextAssignee.level },
            })
          }

          // Notify author
          await notify({
            userId: complaint.author_id,
            type: 'complaint.escalated',
            title: `Your Complaint Has Escalated to Level ${nextAssignee.level}`,
            body: `Due to resolution time limit, your grievance has escalated to ${nextAssignee.role_name}.`,
            link: `/complaints/${complaint.id}`,
            payload: { complaintId: complaint.id, level: nextAssignee.level },
          })
        }
      } else {
        // Top-level reached without further assignees
        if (!complaint.needs_admin_attention) {
          await supabase
            .from('complaints')
            .update({ needs_admin_attention: true })
            .eq('id', complaint.id)

          await supabase.from('complaint_events').insert({
            complaint_id: complaint.id,
            type: 'status_changed',
            from_level: complaint.current_level,
            to_level: complaint.current_level,
            note: 'Top-level authority SLA breached. Ticket flagged as Needs Admin Attention.',
          })

          flaggedCount++
          flaggedIds.push(complaint.id)

          // Notify admins
          const { data: admins } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')

          for (const admin of admins ?? []) {
            await notify({
              userId: admin.user_id,
              type: 'complaint.escalated',
              title: '⚠️ Urgent: Complaint Needs Admin Attention',
              body: `Complaint "${complaint.title}" breached top-level authority SLA without resolution.`,
              link: `/complaints/${complaint.id}`,
              payload: { complaintId: complaint.id, flagged: true },
            })
          }
        }
      }
    }
  }

  // If RPC was used, also trigger notifications for any escalated or flagged tickets
  if (!rpcError && (escalatedIds.length > 0 || flaggedIds.length > 0)) {
    for (const id of escalatedIds) {
      const { data: c } = await supabase
        .from('complaints')
        .select('id, title, author_id, assigned_to, current_level')
        .eq('id', id)
        .single()
      if (c) {
        if (c.assigned_to) {
          await notify({
            userId: c.assigned_to,
            type: 'complaint.escalated',
            title: `Complaint Escalated to Level ${c.current_level}`,
            body: `Ticket "${c.title}" has breached SLA and has been escalated to you.`,
            link: `/complaints/${c.id}`,
            payload: { complaintId: c.id, level: c.current_level },
          })
        }
        await notify({
          userId: c.author_id,
          type: 'complaint.escalated',
          title: `Your Complaint Has Escalated to Level ${c.current_level}`,
          body: `Due to resolution time limit, your grievance has escalated to Level ${c.current_level}.`,
          link: `/complaints/${c.id}`,
          payload: { complaintId: c.id, level: c.current_level },
        })
      }
    }

    if (flaggedIds.length > 0) {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')

      for (const id of flaggedIds) {
        const { data: c } = await supabase
          .from('complaints')
          .select('id, title')
          .eq('id', id)
          .single()
        for (const admin of admins ?? []) {
          await notify({
            userId: admin.user_id,
            type: 'complaint.escalated',
            title: '⚠️ Urgent: Complaint Needs Admin Attention',
            body: `Complaint "${c?.title ?? id}" breached top-level authority SLA without resolution.`,
            link: `/complaints/${id}`,
            payload: { complaintId: id, flagged: true },
          })
        }
      }
    }
  }

  revalidatePath('/complaints')
  return {
    ok: true,
    data: {
      success: true,
      escalated_count: escalatedCount,
      flagged_admin_count: flaggedCount,
      escalated_complaint_ids: escalatedIds,
      flagged_complaint_ids: flaggedIds,
      timestamp: new Date().toISOString(),
    },
  }
}

// ---------------------------------------------------------------------------
// 7. Toggle Complaint Upvote (Public Tracker & Duplicate prevention)
// ---------------------------------------------------------------------------

export async function toggleComplaintUpvote(
  input: ToggleUpvoteInput
): Promise<ActionResult<{ upvoted: boolean; count: number }>> {
  const { user } = await requireAuth()

  const parsed = ToggleUpvoteSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid complaint ID' },
    }
  }

  const { complaint_id } = parsed.data

  if (!(await isSupabaseOnline())) {
    const key = `${complaint_id}:${user.id}`
    const target = mockComplaintsStore.find((c) => c.id === complaint_id)
    if (!target) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' } }
    }
    let upvoted = false
    if (mockUpvotesStore.has(key)) {
      mockUpvotesStore.delete(key)
      target.upvotes_count = Math.max(0, (target.upvotes_count ?? 1) - 1)
      upvoted = false
    } else {
      mockUpvotesStore.add(key)
      target.upvotes_count = (target.upvotes_count ?? 0) + 1
      upvoted = true
    }
    revalidatePath('/complaints')
    return { ok: true, data: { upvoted, count: target.upvotes_count ?? 0 } }
  }

  const supabase = await createClient()

  // 1. Verify complaint exists, is not resolved/closed, and is not in a sensitive domain
  const { data: complaint, error: compErr } = await supabase
    .from('complaints')
    .select('id, status, due_at, author_id, upvotes_count, domain:complaint_domains!inner(sensitive)')
    .eq('id', complaint_id)
    .single()

  if (compErr || !complaint) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' } }
  }

  const isSensitive = (complaint.domain as any)?.sensitive ?? false // eslint-disable-line @typescript-eslint/no-explicit-any
  if (isSensitive) {
    return {
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Upvoting is not permitted for sensitive private grievances' },
    }
  }

  if (complaint.status === 'resolved' || complaint.status === 'closed') {
    return {
      ok: false,
      error: { code: 'INVALID_STATE', message: 'Cannot upvote a resolved or closed complaint' },
    }
  }

  // 2. Check if already upvoted
  const { data: existingUpvote } = await supabase
    .from('complaint_upvotes')
    .select('created_at')
    .eq('complaint_id', complaint_id)
    .eq('user_id', user.id)
    .maybeSingle()

  let upvoted = false
  let newCount = complaint.upvotes_count ?? 0

  if (existingUpvote) {
    // Remove upvote
    const { error: deleteErr } = await supabase
      .from('complaint_upvotes')
      .delete()
      .eq('complaint_id', complaint_id)
      .eq('user_id', user.id)

    if (deleteErr) {
      return { ok: false, error: { code: 'DB_DELETE_FAILED', message: deleteErr.message } }
    }
    upvoted = false
    newCount = Math.max(0, newCount - 1)
  } else {
    // Add upvote
    const { error: insertErr } = await supabase
      .from('complaint_upvotes')
      .insert({ complaint_id, user_id: user.id })

    if (insertErr) {
      return { ok: false, error: { code: 'DB_INSERT_FAILED', message: insertErr.message } }
    }
    upvoted = true
    newCount = newCount + 1

    // Rule: Every 10 upvotes reduces remaining SLA by 10% (capped at 50% max reduction)
    if (newCount > 0 && newCount % 10 === 0 && complaint.due_at) {
      const currentDue = new Date(complaint.due_at).getTime()
      const now = Date.now()
      const remainingMs = currentDue - now

      if (remainingMs > 0) {
        // Calculate reduction ratio: min(50%, (newCount / 10) * 10%)
        const discountPercent = Math.min(50, Math.floor(newCount / 10) * 10) / 100
        const acceleratedDueAt = new Date(now + remainingMs * (1 - discountPercent)).toISOString()

        await supabase
          .from('complaints')
          .update({ due_at: acceleratedDueAt })
          .eq('id', complaint_id)

        await supabase.from('complaint_events').insert({
          complaint_id,
          type: 'note_added',
          note: `High community impact: Reached ${newCount} upvotes. SLA accelerated by ${Math.floor(discountPercent * 100)}%.`,
        })
      }
    }
  }

  revalidatePath('/complaints')
  return { ok: true, data: { upvoted, count: newCount } }
}

// ---------------------------------------------------------------------------
// 8. Mark Complaint as Duplicate (Handler / Admin)
// ---------------------------------------------------------------------------

export async function markComplaintDuplicate(
  input: MarkDuplicateInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = MarkDuplicateSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid duplicate parameters' },
    }
  }

  const { complaint_id, duplicate_of_id, note } = parsed.data
  if (complaint_id === duplicate_of_id) {
    return {
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'A complaint cannot be marked as duplicate of itself' },
    }
  }

  const supabase = await createClient()

  // Verify permissions: must be assigned handler or admin
  const { data: ticket } = await supabase
    .from('complaints')
    .select('id, assigned_to, author_id, title')
    .eq('id', complaint_id)
    .single()

  if (!ticket) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' } }
  }

  const isAssigned = ticket.assigned_to === user.id
  const isAdmin = profile.role_primary === 'admin'
  if (!isAssigned && !isAdmin) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authorized to mark duplicates' } }
  }

  // 1. Close the duplicate ticket
  const resolutionNote = note ?? `Closed as duplicate of grievance #${duplicate_of_id.slice(0, 8)}`
  const { error: updateErr } = await supabase
    .from('complaints')
    .update({
      status: 'closed',
      duplicate_of_id,
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', complaint_id)

  if (updateErr) {
    return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: updateErr.message } }
  }

  // 2. Transfer upvotes from duplicate ticket to primary ticket
  const { data: dupUpvotes } = await supabase
    .from('complaint_upvotes')
    .select('user_id')
    .eq('complaint_id', complaint_id)

  if (dupUpvotes && dupUpvotes.length > 0) {
    for (const up of dupUpvotes) {
      await supabase
        .from('complaint_upvotes')
        .insert({ complaint_id: duplicate_of_id, user_id: up.user_id })
        .maybeSingle() // ignores conflicts on duplicate user
    }
  }

  // 3. Log audit event
  await supabase.from('complaint_events').insert({
    complaint_id,
    type: 'closed',
    actor_id: user.id,
    note: resolutionNote,
  })

  // 4. Notify author
  await notify({
    userId: ticket.author_id,
    type: 'complaint.resolved',
    title: 'Complaint Closed as Duplicate',
    body: `Your ticket "${ticket.title}" has been linked to an existing ticket. Your issue and upvote have been merged.`,
    link: `/complaints/${duplicate_of_id}`,
    payload: { complaintId: complaint_id, duplicateOfId: duplicate_of_id },
  })

  revalidatePath('/complaints')
  revalidatePath(`/complaints/${complaint_id}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 9. Search Similar Complaints (Debounced while typing)
// ---------------------------------------------------------------------------

export async function findSimilarComplaints(
  queryText: string,
  domainId?: string
): Promise<SimilarComplaint[]> {
  return searchSimilarComplaints(queryText, domainId)
}
