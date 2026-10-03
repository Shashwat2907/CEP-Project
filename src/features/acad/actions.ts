'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/shared/auth/guards'
import { notify } from '@/shared/notifications/notify'
import { revalidatePath } from 'next/cache'
import {
  UploadResourceSchema,
  ApproveResourceSchema,
  RejectResourceSchema,
  ToggleSaveResourceSchema,
  RetryProcessingSchema,
  type ActionResult,
  type AiQuotaStatus,
} from './schema'

import { getMaxFileSizeMb } from './queries'
import { extractText } from './lib/text-extractor'
import { chunkPages, chunkText } from './lib/chunker'
import { generateBatchEmbeddings } from './lib/gemini'


/**
 * Server Actions for the Academic Resources feature.
 * Every action validates input with Zod, guards with requireAuth/requireRole,
 * and returns { ok, data } | { ok: false, error: { code, message } }
 * per CONTRACT.md §5.5.
 *
 * Dispatches notifications via shared notify() helper on approval / rejection.
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
  const { data: updatedResource, error } = await supabase
    .from('resources')
    .update({
      status:            'approved',
      approved_by:       user.id,
      rejection_reason:  null,
      processing_status: 'not_started', // Edge Function will pick this up
    })
    .eq('id', parsed.data.resource_id)
    .eq('status', 'pending') // only pending resources can be approved
    .select('id, title, uploader_id')
    .single()

  if (error || !updatedResource) {
    console.error('[acad/actions] approveResource error:', error?.message)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Could not approve resource. Please try again.' },
    }
  }

  // Dispatch notification to student uploader
  await notify(
    {
      userId: updatedResource.uploader_id,
      type: 'acad.resource_approved',
      title: 'Resource Approved',
      body: `Your resource "${updatedResource.title}" has been approved and is now live.`,
      link: '/acad',
      payload: { resourceId: updatedResource.id, title: updatedResource.title },
    },
    supabase as unknown as Parameters<typeof notify>[1]
  )

  // Kick off background processing for embeddings immediately upon approval
  void processResourceEmbeddings(updatedResource.id).catch((err) => {
    console.error('[acad/actions] Auto-processing failed for approved resource:', err)
  })

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

  // Fetch the resource to get storage_path, uploader_id, title, and status
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('id, title, storage_path, uploader_id, status')
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

  // Dispatch notification to student uploader
  await notify(
    {
      userId: resource.uploader_id,
      type: 'acad.resource_rejected',
      title: 'Resource Rejected',
      body: `Your resource "${resource.title}" was not approved: ${parsed.data.rejection_reason}`,
      link: '/acad',
      payload: {
        resourceId: resource.id,
        title: resource.title,
        reason: parsed.data.rejection_reason,
      },
    },
    supabase as unknown as Parameters<typeof notify>[1]
  )


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

// ---------------------------------------------------------------------------
// Toggle save / bookmark resource (student / teacher)
// ---------------------------------------------------------------------------

export async function toggleSaveResource(
  formData: FormData
): Promise<ActionResult<{ saved: boolean }>> {
  const { user } = await requireAuth()

  const parsed = ToggleSaveResourceSchema.safeParse({
    resource_id: formData.get('resource_id'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid resource ID.' },
    }
  }

  const supabase = await createClient()
  const resourceId = parsed.data.resource_id

  // Check if already saved
  const { data: existing, error: checkError } = await supabase
    .from('saved_resources')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('resource_id', resourceId)
    .maybeSingle()

  if (checkError) {
    console.error('[acad/actions] toggleSaveResource check error:', checkError.message)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Could not update bookmark. Please try again.' },
    }
  }

  if (existing) {
    // Unsave
    const { error: deleteError } = await supabase
      .from('saved_resources')
      .delete()
      .eq('user_id', user.id)
      .eq('resource_id', resourceId)

    if (deleteError) {
      console.error('[acad/actions] unsave error:', deleteError.message)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'Could not remove bookmark.' },
      }
    }

    revalidatePath('/acad')
    return { ok: true, data: { saved: false } }
  } else {
    // Save
    const { error: insertError } = await supabase
      .from('saved_resources')
      .insert({
        user_id: user.id,
        resource_id: resourceId,
      })

    if (insertError) {
      console.error('[acad/actions] save error:', insertError.message)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'Could not save bookmark.' },
      }
    }

    revalidatePath('/acad')
    return { ok: true, data: { saved: true } }
  }
}

// ---------------------------------------------------------------------------
// Resource Processing Pipeline & Embeddings (feat/acad-processing-pipeline)
// ---------------------------------------------------------------------------

/**
 * Extracts text, chunks it, generates Gemini embeddings, and saves to resource_chunks.
 * Updates resource.processing_status throughout the state machine.
 */
export async function processResourceEmbeddings(
  resourceId: string
): Promise<ActionResult<{ chunksCreated: number }>> {
  const supabase = await createClient()

  // Fetch resource to verify approval status and get storage path
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('id, title, storage_path, file_ext, status, processing_status')
    .eq('id', resourceId)
    .single()

  if (fetchError || !resource) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Resource not found.' } }
  }

  if (resource.status !== 'approved') {
    return {
      ok: false,
      error: { code: 'NOT_APPROVED', message: 'Only approved resources can be processed.' },
    }
  }

  // Update status to processing
  await supabase
    .from('resources')
    .update({ processing_status: 'processing' })
    .eq('id', resourceId)

  try {
    // 1. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resources')
      .download(resource.storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download resource file: ${downloadError?.message ?? 'Empty file'}`)
    }

    // 2. Extract text
    const buffer = await fileData.arrayBuffer()
    const extracted = await extractText(buffer, resource.file_ext)

    // 3. Chunk text into ~500 tokens with 50-token overlap
    const chunks =
      extracted.pages && extracted.pages.length > 0
        ? chunkPages(extracted.pages)
        : chunkText(extracted.text)

    if (chunks.length === 0) {
      throw new Error('No readable text chunks could be produced from document.')
    }

    // 4. Generate embeddings via Gemini API
    const chunkContents = chunks.map((c) => c.content)
    const embeddings = await generateBatchEmbeddings(chunkContents)

    // 5. Clean up old chunks if retrying
    await supabase.from('resource_chunks').delete().eq('resource_id', resourceId)

    // 6. Insert new chunks
    const chunkRows = chunks.map((c, i) => ({
      resource_id: resourceId,
      chunk_index: c.chunkIndex,
      page_number: c.pageNumber,
      content:     c.content,
      token_count: c.tokenCount,
      embedding:   embeddings[i] ? `[${embeddings[i].join(',')}]` : null,
    }))

    const { error: insertError } = await supabase
      .from('resource_chunks')
      .insert(chunkRows)

    if (insertError) {
      throw new Error(`Failed to save chunks: ${insertError.message}`)
    }

    // 7. Mark processing_status as ready
    await supabase
      .from('resources')
      .update({ processing_status: 'ready' })
      .eq('id', resourceId)

    revalidatePath('/acad')
    revalidatePath(`/acad/${resourceId}`)
    revalidatePath('/teacher/acad')

    return { ok: true, data: { chunksCreated: chunks.length } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown processing error'
    console.error('[acad/actions] processResourceEmbeddings failed:', message)

    await supabase
      .from('resources')
      .update({ processing_status: 'failed' })
      .eq('id', resourceId)

    revalidatePath('/acad')
    revalidatePath(`/acad/${resourceId}`)
    revalidatePath('/teacher/acad')

    return {
      ok: false,
      error: { code: 'PROCESSING_FAILED', message },
    }
  }
}

/**
 * Retries failed resource processing.
 */
export async function retryResourceProcessing(
  formData: FormData
): Promise<ActionResult<{ chunksCreated: number }>> {
  await requireAuth()

  const parsed = RetryProcessingSchema.safeParse({
    resource_id: formData.get('resource_id'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid resource ID.' },
    }
  }

  return processResourceEmbeddings(parsed.data.resource_id)
}

/**
 * Checks and increments AI quota atomically for the authenticated user.
 */
export async function checkAndIncrementAiQuota(): Promise<ActionResult<AiQuotaStatus>> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('check_and_increment_ai_quota', {
    p_user_id: user.id,
  })

  if (error || !data) {
    console.error('[acad/actions] check_and_increment_ai_quota error:', error?.message)
    return {
      ok: false,
      error: { code: 'QUOTA_ERROR', message: 'Could not check AI quota.' },
    }
  }

  return { ok: true, data: data as AiQuotaStatus }
}


