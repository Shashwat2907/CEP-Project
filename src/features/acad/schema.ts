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
// Server action response shape (CONTRACT.md §5.5)
// ---------------------------------------------------------------------------

export type ActionOk<T = undefined> =
  T extends undefined ? { ok: true } : { ok: true; data: T }

export type ActionError = {
  ok: false
  error: { code: string; message: string }
}

export type ActionResult<T = undefined> = ActionOk<T> | ActionError
