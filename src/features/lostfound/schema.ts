import { z } from 'zod'

export type ItemType = 'lost' | 'found'

export type ItemCategory =
  | 'electronics'
  | 'cards_id'
  | 'keys'
  | 'books_stationery'
  | 'clothing'
  | 'accessories'
  | 'bags'
  | 'other'

export type ItemStatus =
  | 'reported'
  | 'matched'
  | 'claim_under_review'
  | 'ready_for_pickup'
  | 'returned'
  | 'expired'

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'cards_id', label: 'ID Cards & Wallets' },
  { value: 'keys', label: 'Keys & Keychains' },
  { value: 'books_stationery', label: 'Books & Calculators' },
  { value: 'bags', label: 'Bags & Backpacks' },
  { value: 'accessories', label: 'Watches & Glasses' },
  { value: 'clothing', label: 'Jackets & Clothing' },
  { value: 'other', label: 'Other Items' },
]

export const CAMPUS_LOCATIONS = [
  'Central Library - Reading Hall',
  'Central Library - Digital Section',
  'Main Canteen / Food Court',
  'Block A - Ground Floor',
  'Block A - Classrooms',
  'Computer Center / Lab Complex',
  'Seminar Hall 1 & 2',
  'Sports Complex / Indoor Arena',
  'Main Gate Area',
  'Hostel Block 1 Quad',
  'Hostel Block 2 Quad',
  'University Auditorium',
  'Other Campus Area',
] as const

export const DROPOFF_POINTS = [
  'Main Gate Security Desk',
  'Central Library Reception Desk',
  'Computer Science Dept Office',
  'Student Affairs Office (Admin Block)',
  'Sports Complex Reception',
] as const

/**
 * Status vocabulary and colors mapped strictly to DESIGN.MD §9:
 * Reported (ink-muted), Matched (warning), Claim under review (ink),
 * Ready for pickup (ink), Returned (success), Expired (ink-muted)
 */
export const LOST_FOUND_STATUS_METAS: Record<
  ItemStatus,
  { label: string; badgeClass: string; color: string }
> = {
  reported: {
    label: 'Reported',
    badgeClass: 'bg-surface-sunken text-ink-muted border-border',
    color: 'var(--ink-muted)',
  },
  matched: {
    label: 'Matched',
    badgeClass: 'bg-warning/15 text-warning-border border-warning',
    color: 'var(--warning)',
  },
  claim_under_review: {
    label: 'Claim under review',
    badgeClass: 'bg-ink text-on-ink border-ink',
    color: 'var(--ink)',
  },
  ready_for_pickup: {
    label: 'Ready for pickup',
    badgeClass: 'bg-ink text-on-ink border-ink',
    color: 'var(--ink)',
  },
  returned: {
    label: 'Returned',
    badgeClass: 'bg-success/15 text-in-campus border-in-campus/30',
    color: 'var(--success)',
  },
  expired: {
    label: 'Expired',
    badgeClass: 'bg-surface-sunken text-ink-muted border-border opacity-70',
    color: 'var(--ink-muted)',
  },
}

// ─── Input Validation Schemas ───────────────────────────────────────────────

export const ReportLostItemInputSchema = z.object({
  category: z.enum([
    'electronics',
    'cards_id',
    'keys',
    'books_stationery',
    'clothing',
    'accessories',
    'bags',
    'other',
  ]),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Please provide sufficient description').max(600),
  location: z.string().min(1, 'Please select a campus location'),
  incidentDate: z.string().min(1, 'Date is required'),
  timeWindow: z.string().optional(),
  photoUrls: z.array(z.string()).default([]),
})

export type ReportLostItemInput = z.infer<typeof ReportLostItemInputSchema>

export const ReportFoundItemInputSchema = z.object({
  category: z.enum([
    'electronics',
    'cards_id',
    'keys',
    'books_stationery',
    'clothing',
    'accessories',
    'bags',
    'other',
  ]),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Please describe the found item').max(600),
  hiddenDetail: z
    .string()
    .min(3, 'Specify one hidden detail for claimant verification (e.g. serial number or engraving)'),
  verificationQuestion: z
    .string()
    .min(5, 'Provide a verification question claimants must answer (e.g. "What sticker is on the back?")'),
  location: z.string().min(1, 'Please select where you found it'),
  dropoffPoint: z.enum([
    'Main Gate Security Desk',
    'Central Library Reception Desk',
    'Computer Science Dept Office',
    'Student Affairs Office (Admin Block)',
    'Sports Complex Reception',
  ]),
  incidentDate: z.string().min(1, 'Date is required'),
  timeWindow: z.string().optional(),
  photoUrls: z.array(z.string()).default([]),
})

export type ReportFoundItemInput = z.infer<typeof ReportFoundItemInputSchema>

export const SubmitClaimInputSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  answerToQuestion: z.string().min(2, 'Please provide your answer to the verification question'),
  additionalProof: z.string().max(500).optional(),
})

export type SubmitClaimInput = z.infer<typeof SubmitClaimInputSchema>

export const ReviewClaimInputSchema = z.object({
  claimId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  deskNotes: z.string().optional(),
})

export type ReviewClaimInput = z.infer<typeof ReviewClaimInputSchema>

export const ConfirmPickupInputSchema = z.object({
  itemId: z.string().uuid(),
  claimId: z.string().uuid(),
  claimantDigitalId: z.string().min(3, 'Claimant Digital ID / Roll Number is required'),
  deskNotes: z.string().optional(),
})

export type ConfirmPickupInput = z.infer<typeof ConfirmPickupInputSchema>

export const ReportAbuseInputSchema = z.object({
  itemId: z.string().uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(300),
})

export type ReportAbuseInput = z.infer<typeof ReportAbuseInputSchema>

// ─── Output Types ───────────────────────────────────────────────────────────

export interface LostFoundItemRecord {
  id: string
  type: ItemType
  reporterId: string
  reporterName?: string
  reporterCollegeId?: string
  category: ItemCategory
  title: string
  description: string
  hiddenDetail?: string | null // Only included for reporter or admin
  verificationQuestion?: string | null
  location: string
  dropoffPoint?: string | null
  handoverCode?: string | null // Only visible to finder/desk
  photoUrls: string[]
  incidentDate: string
  timeWindow?: string | null
  status: ItemStatus
  isReportedAbuse: boolean
  matchedItemId?: string | null
  pickupDigitalId?: string | null
  createdAt: string
  updatedAt: string
}

export interface LostFoundClaimRecord {
  id: string
  itemId: string
  claimantId: string
  claimantName: string
  claimantCollegeId: string
  answerToQuestion: string
  additionalProof?: string | null
  status: ClaimStatus
  deskNotes?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  createdAt: string
}

export interface LostFoundEventRecord {
  id: string
  itemId: string
  fromStatus: string | null
  toStatus: string
  actorId?: string | null
  actorName?: string | null
  notes?: string | null
  createdAt: string
}
