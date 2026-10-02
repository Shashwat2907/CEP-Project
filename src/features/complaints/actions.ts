'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/shared/auth/guards'
import { notify } from '@/shared/notifications/notify'
import { revalidatePath } from 'next/cache'
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
} from './schema'

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
