import { z } from 'zod'

export type DigitalIdStatus = 'active' | 'suspended' | 'revoked'

export type VerificationStatus =
  | 'valid'
  | 'expired'
  | 'revoked'
  | 'suspended'
  | 'tampered'
  | 'not_found'

export type VerificationCheckpoint =
  | 'Main Gate'
  | 'Library'
  | 'Science Lab'
  | 'Exam Hall'
  | 'Lost & Found Desk'
  | 'Hostel Gate'
  | 'Sports Complex'
  | 'Other'

export const CHECKPOINTS: VerificationCheckpoint[] = [
  'Main Gate',
  'Library',
  'Science Lab',
  'Exam Hall',
  'Lost & Found Desk',
  'Hostel Gate',
  'Sports Complex',
  'Other',
]

export const DigitalIdPayloadSchema = z.object({
  sub: z.string().uuid(),
  collegeId: z.string().min(1),
  fullName: z.string().min(1),
  photoUrl: z.string().nullable().optional(),
  role: z.enum(['student', 'teacher', 'admin']),
  branch: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  division: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  digitalIdStatus: z.enum(['active', 'suspended', 'revoked']).default('active'),
  iat: z.number().int(),
  exp: z.number().int(),
  nonce: z.string(),
})

export type DigitalIdPayload = z.infer<typeof DigitalIdPayloadSchema>

export interface VerificationResult {
  valid: boolean
  status: VerificationStatus
  message: string
  subject?: {
    userId: string
    collegeId: string
    fullName: string
    photoUrl?: string | null
    role: 'student' | 'teacher' | 'admin'
    branch?: string | null
    year?: number | null
    division?: string | null
    batch?: string | null
    digitalIdStatus: DigitalIdStatus
    revocationReason?: string | null
  }
  tokenMeta?: {
    issuedAt: string
    expiresAt: string
    secondsRemaining?: number
    expiredSecondsAgo?: number
  }
  verifiedAt: string
  checkpoint: VerificationCheckpoint
}

export const VerifyTokenInputSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  checkpoint: z.enum([
    'Main Gate',
    'Library',
    'Science Lab',
    'Exam Hall',
    'Lost & Found Desk',
    'Hostel Gate',
    'Sports Complex',
    'Other',
  ]).default('Main Gate'),
})

export type VerifyTokenInput = z.infer<typeof VerifyTokenInputSchema>

export const ManualLookupInputSchema = z.object({
  collegeId: z.string().min(1, 'College Roll Number/ID is required'),
  checkpoint: z.enum([
    'Main Gate',
    'Library',
    'Science Lab',
    'Exam Hall',
    'Lost & Found Desk',
    'Hostel Gate',
    'Sports Complex',
    'Other',
  ]).default('Main Gate'),
})

export type ManualLookupInput = z.infer<typeof ManualLookupInputSchema>

export const UpdateDigitalIdStatusSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  status: z.enum(['active', 'suspended', 'revoked']),
  reason: z.string().optional(),
})

export type UpdateDigitalIdStatusInput = z.infer<typeof UpdateDigitalIdStatusSchema>
