/**
 * Clubs Feature Schema & Types
 * Source of truth: src/features/clubs/README.md, documents/PLAN.md §5.8
 * Owner: Kedar
 */

import { z } from 'zod'

// ── Enums ──────────────────────────────────────────────────────────────────

export const ClubMemberStatusSchema = z.enum([
  'requested',
  'payment_pending',
  'member',
  'rejected',
])
export type ClubMemberStatus = z.infer<typeof ClubMemberStatusSchema>

// ── Core Types ──────────────────────────────────────────────────────────────

export const ClubSchema = z.object({
  id:                z.string().uuid(),
  name:              z.string().min(2).max(100),
  description:       z.string().nullable().optional(),
  tagline:           z.string().max(120).nullable().optional(),
  cover_image_path:  z.string().nullable().optional(),
  fee:               z.number().default(0),
  currency:          z.string().default('INR'),
  lead_id:           z.string().uuid(),
  community_id:      z.string().uuid().nullable().optional(),
  active:            z.boolean().default(true),
  created_at:        z.string(),
  member_count:      z.number().int().default(0),
  user_status:       ClubMemberStatusSchema.nullable().optional(),
  lead:              z.object({
    full_name:       z.string(),
    college_id:      z.string(),
    role_primary:    z.string(),
  }).optional(),
})
export type Club = z.infer<typeof ClubSchema>

export const ClubMemberSchema = z.object({
  id:                  z.string().uuid(),
  club_id:             z.string().uuid(),
  user_id:             z.string().uuid(),
  status:              ClubMemberStatusSchema,
  payment_ref:         z.string().nullable().optional(),
  payment_verified_at: z.string().nullable().optional(),
  joined_at:           z.string().nullable().optional(),
  created_at:          z.string(),
  user:                z.object({
    full_name:    z.string(),
    college_id:   z.string(),
    role_primary: z.string(),
  }).optional(),
})
export type ClubMember = z.infer<typeof ClubMemberSchema>

export const ClubNoticeSchema = z.object({
  id:         z.string().uuid(),
  club_id:    z.string().uuid(),
  author_id:  z.string().uuid(),
  body:       z.string().min(1).max(2000),
  pinned:     z.boolean().default(false),
  created_at: z.string(),
  author:     z.object({
    full_name:    z.string(),
    college_id:   z.string(),
    role_primary: z.string(),
  }).optional(),
})
export type ClubNotice = z.infer<typeof ClubNoticeSchema>

// ── Action Input Schemas ────────────────────────────────────────────────────

export const JoinClubSchema = z.object({
  club_id: z.string().uuid('Invalid club ID'),
})
export type JoinClubInput = z.infer<typeof JoinClubSchema>

export const LeaveClubSchema = z.object({
  club_id: z.string().uuid('Invalid club ID'),
})

export const ApproveClubMemberSchema = z.object({
  club_id: z.string().uuid(),
  user_id: z.string().uuid(),
})

export const RejectClubMemberSchema = z.object({
  club_id: z.string().uuid(),
  user_id: z.string().uuid(),
  reason:  z.string().max(500).optional(),
})

export const PostClubNoticeSchema = z.object({
  club_id: z.string().uuid(),
  body:    z.string().min(1, 'Notice body is required').max(2000),
  pinned:  z.boolean().optional(),
})
export type PostClubNoticeInput = z.infer<typeof PostClubNoticeSchema>

export const DeleteClubNoticeSchema = z.object({
  notice_id: z.string().uuid(),
})
