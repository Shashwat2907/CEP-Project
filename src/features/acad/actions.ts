'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/shared/auth/guards'
import { revalidatePath } from 'next/cache'
import {
  UploadResourceSchema,
  ApproveResourceSchema,
  RejectResourceSchema,
  type ActionResult,
} from './schema'
import { getMaxFileSizeMb } from './queries'

/**
 * Server Actions for the Academic Resources feature.
 * Every action validates input with Zod, guards with requireAuth/requireRole,
 * and returns { ok, data } | { ok: false, error: { code, message } }
 * per CONTRACT.md §5.5.
 *
 * NOTE: notify() calls are intentionally absent here.
 * They will be wired in once feat/notifications-and-calendar-core is merged.
 * TODO: wire notify() for acad.resource_approved / acad.resource_rejected
 */

// ---------------------------------------------------------------------------
// Upload resource
// ---------------------------------------------------------------------------

/**
 * Initiates a resource upload:
 * 1. Validates input with Zod
 * 2. Checks file size against app_config
 * 3. Returns a signed upload URL from Supabase Storage
 * 4. Creates the resources row with status='pending' (student) or 'approved' (teacher)
 *
 * The client uses the signed URL to PUT the file directly to Storage,
 * then calls confirmUpload() with the resource ID.
 */
export async function initiateUpload(
  formData: FormData
): Promise<ActionResult<{ resourceId: string; uploadUrl: string }>> {
  const { user, profile } = await requireAuth()

  const raw = {
    title:        formData.get('title'),
    subject_id:   formData.get('subject_id'),
    year:         formData.get('year'),
    branch:       formData.get('branch'),
    type:         formData.get('type'),
    file_ext:     formData.get('file_ext'),
    file_size_mb: Number(formData.get('file_size_mb')),
  }

  const parsed = UploadResourceSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      },
    }
  }

  // Check file size against configurable limit
  const maxMb = await getMaxFileSizeMb()
  if (parsed.data.file_size_mb > maxMb) {
    return {
      ok: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File must be under ${maxMb} MB. Yours is ${parsed.data.file_size_mb.toFixed(1)} MB.`,
      },
    }
  }

  const supabase = await createClient()
  const resourceId = crypto.randomUUID()
  const storagePath = `resources/${parsed.data.year}/${parsed.data.branch}/${parsed.data.subject_id}/${resourceId}.${parsed.data.file_ext}`

  // Teacher uploads are auto-approved; student uploads start as pending
  const isTeacher = profile.role_primary === 'teacher' || profile.role_primary === 'admin'
  const status = isTeacher ? 'approved' : 'pending'

  // Create the resource row first
  const { error: insertError } = await supabase.from('resources').insert({
    id:           resourceId,
    title:        parsed.data.title,
    subject_id:   parsed.data.subject_id,
    year:         parsed.data.year,
    branch:       parsed.data.branch,
    type:         parsed.data.type,
    uploader_id:  user.id,
    storage_path: storagePath,
    file_ext:     parsed.data.file_ext,
    status,
    // Teacher uploads: mark themselves as the approver
    approved_by:  isTeacher ? user.id : null,
  })

  if (insertError) {
    console.error('[acad/actions] initiateUpload insert error:', insertError.message)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Could not create resource. Please try again.' },
    }
  }

  // Create a signed URL for the client to PUT the file directly to Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('resources')
    .createSignedUploadUrl(storagePath)

  if (uploadError || !uploadData?.signedUrl) {
    // Roll back the resource row if storage URL creation fails
    await supabase.from('resources').delete().eq('id', resourceId)
    console.error('[acad/actions] initiateUpload storage error:', uploadError?.message)
    return {
      ok: false,
      error: { code: 'STORAGE_ERROR', message: 'Could not prepare upload. Please try again.' },
    }
  }

  revalidatePath('/acad')
  return { ok: true, data: { resourceId, uploadUrl: uploadData.signedUrl } }
}

// ---------------------------------------------------------------------------
// Approve resource (teacher / admin)
// ---------------------------------------------------------------------------

export async function approveResource(
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireRole(['teacher', 'admin'])

  const parsed = ApproveResourceSchema.safeParse({
    resource_id: formData.get('resource_id'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid resource ID.' },
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('resources')
    .update({
      status:            'approved',
      approved_by:       user.id,
      rejection_reason:  null,
      processing_status: 'not_started', // Edge Function will pick this up
    })
    .eq('id', parsed.data.resource_id)
    .eq('status', 'pending') // only pending resources can be approved

  if (error) {
    console.error('[acad/actions] approveResource error:', error.message)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Could not approve resource. Please try again.' },
    }
  }

  // TODO: notify(uploaderId, 'acad.resource_approved', { resourceId })
  // Wire after feat/notifications-and-calendar-core merges

  revalidatePath('/acad')
  revalidatePath('/teacher/acad')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Reject resource (teacher / admin)
// ---------------------------------------------------------------------------

export async function rejectResource(
  formData: FormData
): Promise<ActionResult> {
  await requireRole(['teacher', 'admin'])

  const parsed = RejectResourceSchema.safeParse({
    resource_id:      formData.get('resource_id'),
    rejection_reason: formData.get('rejection_reason'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      },
    }
  }

  const supabase = await createClient()

  // Fetch the resource to get the storage_path for cleanup
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('storage_path, uploader_id, status')
    .eq('id', parsed.data.resource_id)
    .single()

  if (fetchError || !resource) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found.' },
    }
  }

  if (resource.status !== 'pending') {
    return {
      ok: false,
      error: { code: 'INVALID_STATE', message: 'Only pending resources can be rejected.' },
    }
  }

  // Update the status
  const { error: updateError } = await supabase
    .from('resources')
    .update({
      status:           'rejected',
      rejection_reason: parsed.data.rejection_reason,
    })
    .eq('id', parsed.data.resource_id)

  if (updateError) {
    console.error('[acad/actions] rejectResource error:', updateError.message)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Could not reject resource. Please try again.' },
    }
  }

  // Delete the file from storage (per README §5: "On rejection, the storage file is also deleted")
  await supabase.storage.from('resources').remove([resource.storage_path])

  // TODO: notify(resource.uploader_id, 'acad.resource_rejected', { resourceId, reason })
  // Wire after feat/notifications-and-calendar-core merges

  revalidatePath('/acad')
  revalidatePath('/teacher/acad')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Delete own pending resource (student)
// ---------------------------------------------------------------------------

export async function deleteMyPendingResource(
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireAuth()

  const resourceId = formData.get('resource_id')?.toString()
  if (!resourceId) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Resource ID required.' } }
  }

  const supabase = await createClient()

  // RLS ensures only the uploader can delete their own pending resources
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('storage_path, status')
    .eq('id', resourceId)
    .eq('uploader_id', user.id)
    .single()

  if (fetchError || !resource) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Resource not found.' } }
  }

  if (resource.status !== 'pending') {
    return {
      ok: false,
      error: { code: 'INVALID_STATE', message: 'Only pending resources can be deleted.' },
    }
  }

  const { error: deleteError } = await supabase
    .from('resources')
    .delete()
    .eq('id', resourceId)
    .eq('uploader_id', user.id)

  if (deleteError) {
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Could not delete resource. Please try again.' },
    }
  }

  // Delete from storage
  await supabase.storage.from('resources').remove([resource.storage_path])

  revalidatePath('/acad')
  return { ok: true }
}
