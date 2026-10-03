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
  GenerateFlashcardsSchema,
  RateFlashcardSchema,
  EditFlashcardSchema,
  DeleteFlashcardSchema,
  type ActionResult,
  type AiQuotaStatus,
} from './schema'

import { getMaxFileSizeMb, getResourceChunks } from './queries'
import { extractText } from './lib/text-extractor'
import { chunkPages, chunkText } from './lib/chunker'
import { generateBatchEmbeddings } from './lib/gemini'
import { calculateSm2 } from './lib/sm2'
import { generateFlashcardsWithGemini } from './lib/flashcard-gen'


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

// ---------------------------------------------------------------------------
// Flashcard Decks & Spaced Repetition Actions (feat/flashcards)
// ---------------------------------------------------------------------------

/**
 * Generates or regenerates an AI flashcard deck for a resource using Gemini.
 * Enforces per-user daily AI quota and chunk citations.
 */
export async function generateFlashcardsDeck(
  formData: FormData
): Promise<ActionResult<{ deckId: string; cardCount: number }>> {
  const { user } = await requireAuth()

  const parsed = GenerateFlashcardsSchema.safeParse({
    resource_id: formData.get('resource_id'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid resource ID.' },
    }
  }

  const supabase = await createClient()

  // 1. Fetch resource and verify it is approved
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('id, title, status, processing_status')
    .eq('id', parsed.data.resource_id)
    .single()

  if (fetchError || !resource) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Resource not found.' } }
  }

  if (resource.status !== 'approved') {
    return {
      ok: false,
      error: { code: 'NOT_APPROVED', message: 'Flashcards can only be generated from approved resources.' },
    }
  }

  // 2. Check and increment AI quota
  const quotaRes = await checkAndIncrementAiQuota()
  if (!quotaRes.ok) {
    return quotaRes
  }
  if (!quotaRes.data.allowed) {
    return {
      ok: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: "You've used your AI quota for today. Try again tomorrow.",
      },
    }
  }

  // 3. Ensure chunks exist; if not ready, attempt pipeline run
  let chunks = await getResourceChunks(resource.id)
  if (chunks.length === 0) {
    const processRes = await processResourceEmbeddings(resource.id)
    if (!processRes.ok) {
      return {
        ok: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Unable to process document for flashcards. Please try again.',
        },
      }
    }
    chunks = await getResourceChunks(resource.id)
  }

  if (chunks.length === 0) {
    return {
      ok: false,
      error: {
        code: 'NO_CHUNKS',
        message: 'No readable text chunks found in this document.',
      },
    }
  }

  try {
    // 4. Generate cards grounded in chunks with Gemini
    const generated = await generateFlashcardsWithGemini(resource.title, chunks)
    if (generated.length === 0) {
      return {
        ok: false,
        error: { code: 'GEN_FAILED', message: 'Could not generate cards from this resource.' },
      }
    }

    // 5. Look for existing deck for (resource_id, owner_id)
    const { data: existingDeck } = await supabase
      .from('flashcard_decks')
      .select('id')
      .eq('resource_id', resource.id)
      .eq('owner_id', user.id)
      .maybeSingle()

    let deckId: string

    if (existingDeck) {
      deckId = existingDeck.id
      // Clean up previous cards (cascade cleans reviews)
      await supabase.from('flashcards').delete().eq('deck_id', deckId)
      await supabase
        .from('flashcard_decks')
        .update({
          title: `${resource.title} Deck`,
          card_count: generated.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deckId)
    } else {
      const { data: newDeck, error: deckErr } = await supabase
        .from('flashcard_decks')
        .insert({
          resource_id: resource.id,
          owner_id: user.id,
          title: `${resource.title} Deck`,
          card_count: generated.length,
        })
        .select('id')
        .single()

      if (deckErr || !newDeck) {
        throw new Error(deckErr?.message ?? 'Failed to create flashcard deck.')
      }
      deckId = newDeck.id
    }

    // 6. Insert new flashcards
    const cardRows = generated.map((c, i) => ({
      deck_id:     deckId,
      position:    i,
      front:       c.front,
      back:        c.back,
      source_page: c.source_page,
      chunk_id:    c.chunk_id,
    }))

    const { data: insertedCards, error: cardsErr } = await supabase
      .from('flashcards')
      .insert(cardRows)
      .select('id')

    if (cardsErr || !insertedCards) {
      throw new Error(cardsErr?.message ?? 'Failed to save flashcards.')
    }

    // 7. Initialize reviews for each card with standard SM-2 defaults
    const reviewRows = insertedCards.map((card) => ({
      card_id:     card.id,
      user_id:     user.id,
      due_at:      new Date().toISOString(),
      interval:    1,
      ease:        2.5,
      repetitions: 0,
    }))

    const { error: reviewErr } = await supabase
      .from('flashcard_reviews')
      .insert(reviewRows)

    if (reviewErr) {
      console.warn('[acad/actions] Failed to initialize reviews:', reviewErr.message)
    }

    revalidatePath(`/acad/${resource.id}`)
    revalidatePath(`/acad/${resource.id}/flashcards`)
    revalidatePath('/acad')

    return { ok: true, data: { deckId, cardCount: generated.length } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown generation error'
    console.error('[acad/actions] generateFlashcardsDeck error:', message)
    return {
      ok: false,
      error: { code: 'GENERATION_ERROR', message },
    }
  }
}

/**
 * Rates a card review using the SM-2 algorithm.
 */
export async function rateFlashcardReview(
  formData: FormData
): Promise<ActionResult<{ interval: number; ease: number; repetitions: number; nextDueAt: string }>> {
  const { user } = await requireAuth()

  const parsed = RateFlashcardSchema.safeParse({
    card_id: formData.get('card_id'),
    quality: Number(formData.get('quality')),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid rating.' },
    }
  }

  const supabase = await createClient()

  // Fetch current review if exists
  const { data: existing } = await supabase
    .from('flashcard_reviews')
    .select('interval, ease, repetitions')
    .eq('card_id', parsed.data.card_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const sm2Result = calculateSm2({
    quality:            parsed.data.quality,
    currentInterval:    existing?.interval ?? 1,
    currentEase:        existing?.ease ? Number(existing.ease) : 2.5,
    currentRepetitions: existing?.repetitions ?? 0,
  })

  const { error: upsertError } = await supabase
    .from('flashcard_reviews')
    .upsert(
      {
        card_id:      parsed.data.card_id,
        user_id:      user.id,
        interval:     sm2Result.interval,
        ease:         sm2Result.ease,
        repetitions:  sm2Result.repetitions,
        last_quality: parsed.data.quality,
        due_at:       sm2Result.dueAt.toISOString(),
        reviewed_at:  new Date().toISOString(),
      },
      { onConflict: 'card_id,user_id' }
    )

  if (upsertError) {
    console.error('[acad/actions] rateFlashcardReview error:', upsertError.message)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'Could not record card review.' },
    }
  }

  return {
    ok: true,
    data: {
      interval:    sm2Result.interval,
      ease:        sm2Result.ease,
      repetitions: sm2Result.repetitions,
      nextDueAt:   sm2Result.dueAt.toISOString(),
    },
  }
}

/**
 * Edits the front / back content of a card.
 */
export async function updateFlashcard(
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireAuth()

  const parsed = EditFlashcardSchema.safeParse({
    card_id: formData.get('card_id'),
    front:   formData.get('front'),
    back:    formData.get('back'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input.' },
    }
  }

  const supabase = await createClient()

  // Verify ownership via parent deck
  const { data: card, error: cardError } = await supabase
    .from('flashcards')
    .select('id, deck_id, deck:flashcard_decks!inner(owner_id)')
    .eq('id', parsed.data.card_id)
    .single()

  if (cardError || !card) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Flashcard not found.' } }
  }

  const deckOwner = (card.deck as unknown as { owner_id: string })?.owner_id
  if (deckOwner !== user.id) {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'You can only edit cards in your own deck.' } }
  }

  const { error: updateError } = await supabase
    .from('flashcards')
    .update({
      front: parsed.data.front,
      back:  parsed.data.back,
    })
    .eq('id', parsed.data.card_id)

  if (updateError) {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to update flashcard.' } }
  }

  return { ok: true }
}

/**
 * Deletes a flashcard from the deck.
 */
export async function deleteFlashcard(
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireAuth()

  const parsed = DeleteFlashcardSchema.safeParse({
    card_id: formData.get('card_id'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid card ID.' },
    }
  }

  const supabase = await createClient()

  // Check card & deck ownership
  const { data: card, error: cardError } = await supabase
    .from('flashcards')
    .select('id, deck_id, deck:flashcard_decks!inner(id, owner_id, card_count)')
    .eq('id', parsed.data.card_id)
    .single()

  if (cardError || !card) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Flashcard not found.' } }
  }

  const deck = card.deck as unknown as { id: string; owner_id: string; card_count: number }
  if (deck?.owner_id !== user.id) {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'You can only delete cards in your own deck.' } }
  }

  // Delete card
  const { error: delError } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', parsed.data.card_id)

  if (delError) {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to delete card.' } }
  }

  // Decrement card count on deck
  await supabase
    .from('flashcard_decks')
    .update({
      card_count: Math.max(0, (deck.card_count || 1) - 1),
    })
    .eq('id', deck.id)

  return { ok: true }
}



