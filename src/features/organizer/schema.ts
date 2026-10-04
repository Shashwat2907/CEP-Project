import { z } from 'zod'

export const OrganizerTypeSchema = z.enum(['company', 'club', 'college', 'community'])
export type OrganizerType = z.infer<typeof OrganizerTypeSchema>

export const OrganizerStatusSchema = z.enum(['pending', 'approved', 'rejected', 'suspended'])
export type OrganizerStatus = z.infer<typeof OrganizerStatusSchema>

export const RegisterOrganizerInputSchema = z.object({
  organization: z.string().min(2, 'Organization name must be at least 2 characters').max(120),
  orgType: OrganizerTypeSchema,
  contactName: z.string().min(2, 'Contact person name is required').max(100),
  contactEmail: z.string().email('Please enter a valid email address').toLowerCase(),
  phone: z.string().max(20).optional().or(z.literal('')),
  website: z.string().url('Please enter a valid URL (e.g. https://...)').optional().or(z.literal('')),
  purpose: z.string().min(10, 'Please describe what you plan to host in at least 10 characters').max(1000),
})

export type RegisterOrganizerInput = z.infer<typeof RegisterOrganizerInputSchema>

export const VerifyOrganizerOtpInputSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Must be numeric'),
})

export type VerifyOrganizerOtpInput = z.infer<typeof VerifyOrganizerOtpInputSchema>

export const ReportEventInputSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(100),
  details: z.string().max(1000).optional(),
})

export type ReportEventInput = z.infer<typeof ReportEventInputSchema>

export interface OrganizerProfile {
  userId: string
  organization: string
  orgType: OrganizerType
  contactName: string
  contactEmail: string
  phone?: string | null
  website?: string | null
  purpose: string
  status: OrganizerStatus
  trusted: boolean
  approvedBy?: string | null
  approvedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface EventAttendeeItem {
  id: string
  userId: string
  userName: string
  userEmail: string
  status: 'attending' | 'waitlist' | 'cancelled'
  createdAt: string
}
