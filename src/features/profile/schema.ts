import { z } from 'zod'

/**
 * Zod schema for a single roster CSV row.
 * Source of truth: documents/PLAN.md §4.1, §5.4, documents/TEAM_TASKS.md
 */
export const RosterRowSchema = z.object({
  college_email: z.string().email('Invalid college email address').toLowerCase().trim(),
  college_id: z.string().min(1, 'College ID or enrollment number required').trim(),
  full_name: z.string().min(1, 'Full name required').trim(),
  role: z.enum(['student', 'teacher', 'admin'], {
    errorMap: () => ({ message: "Role must be 'student', 'teacher', or 'admin'" }),
  }),
  branch: z.string().optional().nullable(),
  year: z.coerce.number().int().min(1).max(5).optional().nullable(),
  division: z.string().optional().nullable(),
  batch: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
})

export type RosterRow = z.infer<typeof RosterRowSchema>

export interface RosterRowError {
  row: number
  collegeEmail?: string
  collegeId?: string
  error: string
}

export interface RosterImportResult {
  batchId: string
  filename: string
  totalRows: number
  inserted: number
  updated: number
  deactivated: number
  errors: RosterRowError[]
}

/**
 * Fields that users can self-edit.
 * Security invariant: college_id, college_email, role_primary, and enrollment fields
 * are locked to the roster and CANNOT be edited here.
 */
export const ProfileUpdateSchema = z.object({
  photo_url: z.string().url('Invalid photo URL').or(z.string().startsWith('data:image/')).optional().nullable(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional().nullable(),
  office_hours: z.string().max(300, 'Office hours cannot exceed 300 characters').optional().nullable(),
  phone: z.string().max(20, 'Phone cannot exceed 20 characters').optional().nullable(),
  department: z.string().max(100, 'Department name cannot exceed 100 characters').optional().nullable(),
})

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>

export interface UserRoleRecord {
  role: 'student' | 'teacher' | 'admin' | 'authority'
  scope?: string | null
}

export interface UserProfile {
  id: string
  collegeEmail: string
  collegeId: string
  fullName: string
  photoUrl: string | null
  rolePrimary: 'student' | 'teacher' | 'admin'
  branch: string | null
  year: number | null
  division: string | null
  batch: string | null
  department: string | null
  officeHours: string | null
  bio: string | null
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  roles: UserRoleRecord[]
  createdAt: string
  updatedAt: string
}

export interface RosterMember {
  id: string
  collegeEmail: string
  collegeId: string
  fullName: string
  role: 'student' | 'teacher' | 'admin'
  branch: string | null
  year: number | null
  division: string | null
  batch: string | null
  status: 'invited' | 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}
