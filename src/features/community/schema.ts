/**
 * Community Feature Schema & Types
 * Source of truth: src/features/community/README.md, documents/PLAN.md §5.7
 */

import { z } from 'zod'

export const CommunityKindSchema = z.enum([
  'year_branch',
  'subject',
  'batch',
  'unofficial',
])
export type CommunityKind = z.infer<typeof CommunityKindSchema>

export const CommunityMemberRoleSchema = z.enum(['member', 'moderator'])
export type CommunityMemberRole = z.infer<typeof CommunityMemberRoleSchema>

export const CommunityTagTypeSchema = z.enum([
  'helper',
  'doubt_solver',
  'top_contributor',
])
export type CommunityTagType = z.infer<typeof CommunityTagTypeSchema>

export const CommunityTagSchema = z.object({
  community_id: z.string().uuid(),
  user_id:      z.string().uuid(),
  tag:          CommunityTagTypeSchema,
  awarded_at:   z.string(),
})
export type CommunityTag = z.infer<typeof CommunityTagSchema>

export const CommunityMemberSchema = z.object({
  community_id: z.string().uuid(),
  user_id:      z.string().uuid(),
  role:         CommunityMemberRoleSchema,
  joined_at:    z.string(),
  last_read_at: z.string().optional(),
  user: z
    .object({
      full_name:    z.string(),
      college_id:   z.string(),
      role_primary: z.string(),
      avatar_url:   z.string().nullable().optional(),
    })
    .optional(),
})
export type CommunityMember = z.infer<typeof CommunityMemberSchema>

export const CommunitySchema = z.object({
  id:           z.string().uuid(),
  kind:         CommunityKindSchema,
  name:         z.string().min(2).max(100),
  description:  z.string().nullable().optional(),
  official:     z.boolean(),
  year:         z.number().int().nullable().optional(),
  branch:       z.string().nullable().optional(),
  subject_id:   z.string().uuid().nullable().optional(),
  batch:        z.string().nullable().optional(),
  private:      z.boolean(),
  member_count: z.number().int().default(1),
  created_by:   z.string().uuid().nullable().optional(),
  created_at:   z.string(),
  is_member:    z.boolean().optional(),
  user_role:    CommunityMemberRoleSchema.optional(),
  user_tags:    z.array(CommunityTagTypeSchema).optional(),
})
export type Community = z.infer<typeof CommunitySchema>

export const CommunityMessageSchema = z.object({
  id:              z.string().uuid(),
  community_id:    z.string().uuid(),
  author_id:       z.string().uuid(),
  parent_id:       z.string().uuid().nullable().optional(),
  body:            z.string().min(1).max(2000),
  attachment_path: z.string().nullable().optional(),
  reactions:       z.record(z.array(z.string())).default({}),
  upvote_count:    z.number().int().default(0),
  created_at:      z.string(),
  edited_at:       z.string().nullable().optional(),
  deleted_at:      z.string().nullable().optional(),
  author: z
    .object({
      full_name:    z.string(),
      college_id:   z.string(),
      role_primary: z.string(),
      tags:         z.array(CommunityTagTypeSchema).optional(),
    })
    .optional(),
  is_upvoted: z.boolean().optional(),
  reply_count: z.number().int().optional(),
})
export type CommunityMessage = z.infer<typeof CommunityMessageSchema>

// ---------------------------------------------------------------------------
// Server Action Input Schemas
// ---------------------------------------------------------------------------

export const CreateCommunitySchema = z.object({
  name:        z.string().trim().min(3, 'Name must be at least 3 characters').max(60, 'Name cannot exceed 60 characters'),
  description: z.string().trim().max(300, 'Description cannot exceed 300 characters').optional(),
  private:     z.boolean().optional().default(false),
})
export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>

export const JoinCommunitySchema = z.object({
  community_id: z.string().uuid(),
})

export const LeaveCommunitySchema = z.object({
  community_id: z.string().uuid(),
})

export const SendMessageSchema = z.object({
  community_id:    z.string().uuid(),
  body:            z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  parent_id:       z.string().uuid().optional(),
  attachment_path: z.string().optional(),
})
export type SendMessageInput = z.infer<typeof SendMessageSchema>

export const VoteReplySchema = z.object({
  message_id: z.string().uuid(),
})

export const AddReactionSchema = z.object({
  message_id: z.string().uuid(),
  emoji:      z.string().min(1).max(8),
})

export const DeleteMessageSchema = z.object({
  message_id: z.string().uuid(),
})

export const ReportMessageSchema = z.object({
  message_id: z.string().uuid(),
  reason:     z.string().min(5, 'Please provide a clear reason for reporting').max(300).trim(),
})
