import { z } from 'zod'

/**
 * Zod Schemas for the Academic Resources feature.
 * Shared by client and server — never duplicate these.
 * Source of truth: src/features/acad/README.md §3
 */

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export const SubjectSchema = z.object({
  id:         z.string().uuid(),
  name:       z.string(),
  code:       z.string(),
  year:       z.number().int().min(1).max(4),
  branch:     z.string(),
  created_at: z.string().optional(),
})
export type Subject = z.infer<typeof SubjectSchema>

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export const ResourceTypeSchema = z.enum(['notes', 'pyq', 'slides', 'other'])
export type ResourceType = z.infer<typeof ResourceTypeSchema>

export const ResourceStatusSchema = z.enum(['pending', 'approved', 'rejected'])
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>

export const ProcessingStatusSchema = z.enum(['not_started', 'processing', 'ready', 'failed'])
export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>

export const ResourceSchema = z.object({
  id:                z.string().uuid(),
  title:             z.string(),
  subject_id:        z.string().uuid(),
  year:              z.number().int().min(1).max(4),
  branch:            z.string(),
  type:              ResourceTypeSchema,
  uploader_id:       z.string().uuid(),
  storage_path:      z.string(),
  file_ext:          z.string(),
  status:            ResourceStatusSchema,
  approved_by:       z.string().uuid().nullable().optional(),
  rejection_reason:  z.string().nullable().optional(),
  processing_status: ProcessingStatusSchema,
  created_at:        z.string().optional(),
  updated_at:        z.string().optional(),
  // Joined fields (present when fetched with select)
  subject:           SubjectSchema.optional(),
  uploader:          z.object({ full_name: z.string(), role_primary: z.string() }).optional(),
  is_saved:          z.boolean().optional(),
})
export type Resource = z.infer<typeof ResourceSchema>


// ---------------------------------------------------------------------------
// Upload input (validated server-side in actions.ts)
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = ['pdf', 'pptx', 'docx'] as const

export const UploadResourceSchema = z.object({
  title:      z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  subject_id: z.string().uuid('Please select a subject'),
  year:       z.coerce.number().int().min(1).max(4),
  branch:     z.string().min(1, 'Please select a branch'),
  type:       ResourceTypeSchema,
  file_ext:   z.enum(ALLOWED_EXTENSIONS, {
    errorMap: () => ({ message: 'Only PDF, PPTX and DOCX files are allowed' }),
  }),
  file_size_mb: z.number().positive(),
})
export type UploadResourceInput = z.infer<typeof UploadResourceSchema>

// ---------------------------------------------------------------------------
// Approve / reject input (teacher server action)
// ---------------------------------------------------------------------------

export const ApproveResourceSchema = z.object({
  resource_id: z.string().uuid(),
})
export type ApproveResourceInput = z.infer<typeof ApproveResourceSchema>

export const RejectResourceSchema = z.object({
  resource_id:      z.string().uuid(),
  rejection_reason: z.string().min(5, 'Please provide a reason').max(500).trim(),
})
export type RejectResourceInput = z.infer<typeof RejectResourceSchema>

// ---------------------------------------------------------------------------
// Browse / filter input
// ---------------------------------------------------------------------------

export const ResourceFilterSchema = z.object({
  year:       z.coerce.number().int().min(1).max(4).optional(),
  branch:     z.string().optional(),
  subject_id: z.string().uuid().optional(),
  type:       ResourceTypeSchema.optional(),
  query:      z.string().max(100).optional(),
  saved:      z.coerce.boolean().optional(),
})
export type ResourceFilterInput = z.infer<typeof ResourceFilterSchema>

// ---------------------------------------------------------------------------
// Save / bookmark resource input
// ---------------------------------------------------------------------------

export const ToggleSaveResourceSchema = z.object({
  resource_id: z.string().uuid(),
})
export type ToggleSaveResourceInput = z.infer<typeof ToggleSaveResourceSchema>

export const SavedResourceSchema = z.object({
  user_id:     z.string().uuid(),
  resource_id: z.string().uuid(),
  created_at:  z.string().optional(),
})
export type SavedResource = z.infer<typeof SavedResourceSchema>


// ---------------------------------------------------------------------------
// Resource Chunks & Processing
// ---------------------------------------------------------------------------

export const ResourceChunkSchema = z.object({
  id:          z.string().uuid(),
  resource_id: z.string().uuid(),
  chunk_index: z.number().int().min(0),
  page_number: z.number().int().positive().nullable().optional(),
  content:     z.string().min(1),
  token_count: z.number().int().min(0).default(0),
  embedding:   z.array(z.number()).length(768).optional(),
  created_at:  z.string().optional(),
})
export type ResourceChunk = z.infer<typeof ResourceChunkSchema>

export const RetryProcessingSchema = z.object({
  resource_id: z.string().uuid(),
})
export type RetryProcessingInput = z.infer<typeof RetryProcessingSchema>

export const AiQuotaCheckSchema = z.object({
  user_id: z.string().uuid(),
})
export type AiQuotaCheckInput = z.infer<typeof AiQuotaCheckSchema>

export const AiUsageSchema = z.object({
  id:         z.string().uuid().optional(),
  user_id:    z.string().uuid(),
  usage_date: z.string(),
  call_count: z.number().int().min(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type AiUsage = z.infer<typeof AiUsageSchema>

export interface AiQuotaStatus {
  allowed:    boolean
  call_count: number
  limit:      number
  remaining:  number
}

// ---------------------------------------------------------------------------
// Flashcards & Spaced Repetition (feat/flashcards)
// ---------------------------------------------------------------------------

export const FlashcardSchema = z.object({
  id:          z.string().uuid(),
  deck_id:     z.string().uuid(),
  position:    z.number().int().min(0),
  front:       z.string().min(1, 'Question cannot be empty'),
  back:        z.string().min(1, 'Answer cannot be empty'),
  source_page: z.number().int().positive().nullable().optional(),
  chunk_id:    z.string().uuid().nullable().optional(),
  created_at:  z.string().optional(),
})
export type Flashcard = z.infer<typeof FlashcardSchema>

export const FlashcardReviewSchema = z.object({
  id:           z.string().uuid().optional(),
  card_id:      z.string().uuid(),
  user_id:      z.string().uuid(),
  due_at:       z.string(),
  interval:     z.number().int().min(1),
  ease:         z.number().min(1.3),
  repetitions:  z.number().int().min(0),
  last_quality: z.number().int().min(0).max(5).nullable().optional(),
  reviewed_at:  z.string().nullable().optional(),
  created_at:   z.string().optional(),
  updated_at:   z.string().optional(),
})
export type FlashcardReview = z.infer<typeof FlashcardReviewSchema>

export interface FlashcardWithReview extends Flashcard {
  review?: FlashcardReview | null
}

export const FlashcardDeckSchema = z.object({
  id:          z.string().uuid(),
  resource_id: z.string().uuid(),
  owner_id:    z.string().uuid(),
  title:       z.string().min(1),
  card_count:  z.number().int().min(0),
  created_at:  z.string().optional(),
  updated_at:  z.string().optional(),
  cards:       z.array(FlashcardSchema).optional(),
})
export type FlashcardDeck = z.infer<typeof FlashcardDeckSchema>

export const GenerateFlashcardsSchema = z.object({
  resource_id: z.string().uuid(),
})
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsSchema>

export const RateFlashcardSchema = z.object({
  card_id: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
})
export type RateFlashcardInput = z.infer<typeof RateFlashcardSchema>

export const EditFlashcardSchema = z.object({
  card_id: z.string().uuid(),
  front:   z.string().min(1, 'Front cannot be empty').max(1000).trim(),
  back:    z.string().min(1, 'Back cannot be empty').max(2000).trim(),
})
export type EditFlashcardInput = z.infer<typeof EditFlashcardSchema>

export const DeleteFlashcardSchema = z.object({
  card_id: z.string().uuid(),
})
export type DeleteFlashcardInput = z.infer<typeof DeleteFlashcardSchema>

// ---------------------------------------------------------------------------
// Server action response shape (CONTRACT.md §5.5)
// ---------------------------------------------------------------------------

export type ActionOk<T = undefined> =
  T extends undefined ? { ok: true } : { ok: true; data: T }

export type ActionError = {
  ok: false
  error: { code: string; message: string }
}

export type ActionResult<T = undefined> = ActionOk<T> | ActionError


