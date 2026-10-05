import { z } from 'zod'

/**
 * Zod Schemas for the Complaints Feature.
 * Shared by client and server.
 * Source of truth: src/features/complaints/README.md & documents/CONTRACT.md §5.4
 */

// ---------------------------------------------------------------------------
// 1. Complaint Domains & Assignees
// ---------------------------------------------------------------------------

export type ComplaintDomain = {
  id: string
  name: string
  description?: string | null
  parent_id?: string | null
  sensitive?: boolean
  routing_mode?: 'chain' | 'direct'
  visibility?: 'public' | 'private'
  created_at?: string
  subcategories?: ComplaintDomain[]
}

export const ComplaintDomainSchema: z.ZodType<ComplaintDomain, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    id:           z.string().uuid(),
    name:         z.string().min(1),
    description:  z.string().nullable().optional(),
    parent_id:    z.string().uuid().nullable().optional(),
    sensitive:    z.boolean().default(false),
    routing_mode: z.enum(['chain', 'direct']).default('chain'),
    visibility:   z.enum(['public', 'private']).default('public'),
    created_at:   z.string().optional(),
    subcategories: z.array(z.lazy(() => ComplaintDomainSchema)).optional(),
  })
)

export const DomainAssigneeSchema = z.object({
  id:                   z.string().uuid(),
  domain_id:            z.string().uuid(),
  level:                z.number().int().min(1).max(3),
  role_name:            z.string().min(1),
  assignee_id:          z.string().uuid().nullable().optional(),
  sla_hours:            z.number().int().positive().default(24),
  escalation_condition: z.string().default('on_sla_breach'),
  created_at:           z.string().optional(),
})
export type DomainAssignee = z.infer<typeof DomainAssigneeSchema>

// ---------------------------------------------------------------------------
// 2. Complaint Status & Core Types
// ---------------------------------------------------------------------------

export const ComplaintStatusSchema = z.enum([
  'submitted',
  'in_progress',
  'escalated',
  'resolved',
  'reopened',
  'closed',
])
export type ComplaintStatus = z.infer<typeof ComplaintStatusSchema>

export const ComplaintEventTypeSchema = z.enum([
  'submitted',
  'assigned',
  'status_changed',
  'escalated',
  'resolved',
  'reopened',
  'closed',
  'note_added',
])
export type ComplaintEventType = z.infer<typeof ComplaintEventTypeSchema>

export const ComplaintEventSchema = z.object({
  id:           z.string().uuid(),
  complaint_id: z.string().uuid(),
  type:         ComplaintEventTypeSchema,
  from_level:   z.number().int().nullable().optional(),
  to_level:     z.number().int().nullable().optional(),
  from_status:  z.string().nullable().optional(),
  to_status:    z.string().nullable().optional(),
  actor_id:     z.string().uuid().nullable().optional(),
  actor:        z.object({ full_name: z.string(), role_primary: z.string() }).nullable().optional(),
  note:         z.string().nullable().optional(),
  created_at:   z.string(),
})
export type ComplaintEvent = z.infer<typeof ComplaintEventSchema>

export const ComplaintAttachmentSchema = z.object({
  id:           z.string().uuid(),
  complaint_id: z.string().uuid(),
  storage_path: z.string(),
  file_name:    z.string(),
  file_size:    z.number().nullable().optional(),
  mime_type:    z.string().nullable().optional(),
  created_at:   z.string(),
})
export type ComplaintAttachment = z.infer<typeof ComplaintAttachmentSchema>

export const ComplaintSchema = z.object({
  id:                    z.string().uuid(),
  author_id:             z.string().uuid(),
  domain_id:             z.string().uuid(),
  subcategory_id:        z.string().uuid().nullable().optional(),
  title:                 z.string().min(5, 'Title must be at least 5 characters').max(120),
  body:                  z.string().min(10, 'Description must be at least 10 characters').max(2000),
  status:                ComplaintStatusSchema,
  current_level:         z.number().int().min(1).max(3).default(1),
  assigned_to:           z.string().uuid().nullable().optional(),
  anonymous:             z.boolean().default(false),
  needs_admin_attention: z.boolean().default(false).optional(),
  duplicate_of_id:       z.string().uuid().nullable().optional(),
  upvotes_count:         z.number().int().default(0).optional(),
  has_upvoted:           z.boolean().optional(),
  due_at:                z.string().nullable().optional(),
  resolved_at:           z.string().nullable().optional(),
  resolution_note:       z.string().nullable().optional(),
  reopen_note:           z.string().nullable().optional(),
  created_at:            z.string(),
  updated_at:            z.string(),
  // Joined relational data
  domain:          ComplaintDomainSchema.optional(),
  author:          z.object({ full_name: z.string(), role_primary: z.string() }).nullable().optional(),
  assignee:        z.object({ full_name: z.string(), role_primary: z.string() }).nullable().optional(),
  events:          z.array(ComplaintEventSchema).optional(),
  attachments:     z.array(ComplaintAttachmentSchema).optional(),
})
export type Complaint = z.infer<typeof ComplaintSchema>

export const EscalationResultSchema = z.object({
  success:                 z.boolean(),
  escalated_count:         z.number(),
  flagged_admin_count:     z.number(),
  escalated_complaint_ids: z.array(z.string().uuid()),
  flagged_complaint_ids:   z.array(z.string().uuid()),
  timestamp:               z.string(),
})
export type EscalationResult = z.infer<typeof EscalationResultSchema>

export const ToggleUpvoteSchema = z.object({
  complaint_id: z.string().uuid(),
})
export type ToggleUpvoteInput = z.infer<typeof ToggleUpvoteSchema>

export const MarkDuplicateSchema = z.object({
  complaint_id:    z.string().uuid(),
  duplicate_of_id: z.string().uuid(),
  note:            z.string().max(500).optional(),
})
export type MarkDuplicateInput = z.infer<typeof MarkDuplicateSchema>

export const TrackerFilterSchema = z.object({
  domain_id: z.string().uuid().optional(),
  status:    ComplaintStatusSchema.optional(),
  sort:      z.enum(['longest_pending', 'most_upvoted', 'newest']).default('longest_pending'),
})
export type TrackerFilter = z.infer<typeof TrackerFilterSchema>

export const SimilarComplaintSchema = z.object({
  id:            z.string().uuid(),
  title:         z.string(),
  body:          z.string(),
  status:        ComplaintStatusSchema,
  upvotes_count: z.number().int().default(0).optional(),
  created_at:    z.string(),
  domain:        z.object({ name: z.string(), sensitive: z.boolean().optional() }).optional(),
})
export type SimilarComplaint = z.infer<typeof SimilarComplaintSchema>

// ---------------------------------------------------------------------------
// 3. Form Validation Inputs
// ---------------------------------------------------------------------------

export const CreateComplaintSchema = z.object({
  domain_id:      z.string().uuid('Please select a valid domain'),
  subcategory_id: z.string().uuid().optional(),
  title:          z.string().min(5, 'Title must be at least 5 characters').max(120, 'Title too long'),
  body:           z.string().min(10, 'Please provide more details (at least 10 characters)').max(2000),
  anonymous:      z.boolean().default(false),
  attachments:    z.array(z.object({
    storage_path: z.string(),
    file_name:    z.string(),
    file_size:    z.number().optional(),
    mime_type:    z.string().optional(),
  })).optional().default([]),
})
export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>

export const ResolveComplaintSchema = z.object({
  complaint_id:    z.string().uuid(),
  resolution_note: z.string().min(5, 'Resolution note must explain how the grievance was resolved').max(1000),
})
export type ResolveComplaintInput = z.infer<typeof ResolveComplaintSchema>

export const ReopenComplaintSchema = z.object({
  complaint_id: z.string().uuid(),
  reopen_note:  z.string().min(5, 'Please explain why the issue is not resolved').max(1000),
})
export type ReopenComplaintInput = z.infer<typeof ReopenComplaintSchema>

export const UpdateStatusSchema = z.object({
  complaint_id: z.string().uuid(),
  status:       ComplaintStatusSchema,
  note:         z.string().max(500).optional(),
})
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>

// ---------------------------------------------------------------------------
// 4. Action Result contract per CONTRACT.md §5.5
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }
