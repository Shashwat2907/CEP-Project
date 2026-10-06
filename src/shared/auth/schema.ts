import { z } from 'zod'

/**
 * Zod Schemas for Authentication and Role Management
 * Source of truth: documents/PLAN.MD §4, §4.1 and documents/AGENTS.MD
 */

export const RequestCodeSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid college email address')
    .toLowerCase()
    .trim(),
})
export type RequestCodeInput = z.infer<typeof RequestCodeSchema>

export const VerifyCodeSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid college email address')
    .toLowerCase()
    .trim(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
})
export type VerifyCodeInput = z.infer<typeof VerifyCodeSchema>

export const UserRoleTypeSchema = z.enum([
  'student',
  'teacher',
  'admin',
  'authority',
  'overseer',
])
export type UserRoleType = z.infer<typeof UserRoleTypeSchema>

export const ProfileStatusSchema = z.enum(['active', 'inactive', 'suspended'])
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  college_email: z.string().email(),
  college_id: z.string(),
  full_name: z.string(),
  photo_url: z.string().nullable().optional(),
  role_primary: z.enum(['student', 'teacher', 'admin', 'overseer']),
  branch: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  division: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  status: ProfileStatusSchema,
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type UserProfile = z.infer<typeof UserProfileSchema>

export const UserRoleSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  role: UserRoleTypeSchema,
  scope: z.string().nullable().optional(),
  created_at: z.string().optional(),
})
export type UserRole = z.infer<typeof UserRoleSchema>
