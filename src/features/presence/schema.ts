import { z } from 'zod'

/**
 * Zod Schemas for Campus Presence & Boundary Checking
 * Source of truth: documents/PLAN.md §5.1, documents/CONTRACT.md §5.5
 */

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})
export type LatLng = z.infer<typeof LatLngSchema>

export const VerifyPresenceInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
})
export type VerifyPresenceInput = z.infer<typeof VerifyPresenceInputSchema>

export const PresenceConsentInputSchema = z.object({
  consentGiven: z.boolean(),
  isPaused: z.boolean().optional().default(false),
  visibility: z.enum(['nobody', 'friends', 'everyone']).optional().default('nobody'),
})
export type PresenceConsentInput = z.input<typeof PresenceConsentInputSchema>

export const CampusZoneInputSchema = z.object({
  name: z.string().min(2).max(80),
  kind: z.enum(['campus', 'zone', 'building']).default('campus'),
  polygon: z.array(LatLngSchema).min(3, 'A polygon must have at least 3 vertices'),
})
export type CampusZoneInput = z.infer<typeof CampusZoneInputSchema>

export type PresenceState = 'in' | 'out' | 'checking' | 'denied' | 'offline'
export type PresenceConfidence = 'low' | 'medium' | 'high'

export interface PresenceEvaluationResult {
  state: PresenceState
  isInside: boolean
  zoneName?: string
  confidence: PresenceConfidence
  accuracyMeters?: number
  verifiedAt: string
}

export interface PresenceConsentRecord {
  userId: string
  consentGiven: boolean
  isPaused: boolean
  visibility: 'nobody' | 'friends' | 'everyone'
  consentedAt?: string | null
  revokedAt?: string | null
}

export interface CampusZone {
  id: string
  name: string
  kind: 'campus' | 'zone' | 'building'
  polygon: LatLng[]
  isActive: boolean
}

export const DEFAULT_CAMPUS_ZONE: CampusZone = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Main Campus',
  kind: 'campus',
  polygon: [
    { lat: 12.9710, lng: 79.1580 },
    { lat: 12.9760, lng: 79.1585 },
    { lat: 12.9770, lng: 79.1660 },
    { lat: 12.9715, lng: 79.1655 },
  ],
  isActive: true,
}
