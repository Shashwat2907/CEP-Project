import { z } from 'zod'

// ─── Heartbeat monitoring (feat/presence-monitoring) ──────────────────────

export const HeartbeatInputSchema = z.object({
  /** Browser-reported latitude — evaluated server-side; never persisted */
  latitude: z.number().min(-90).max(90),
  /** Browser-reported longitude — evaluated server-side; never persisted */
  longitude: z.number().min(-180).max(180),
  /** Accuracy in metres as reported by browser Geolocation API */
  accuracy: z.number().nonnegative().optional(),
  /** Source of the heartbeat signal */
  source: z.enum(['browser', 'native', 'qr']).default('browser'),
})
export type HeartbeatInput = z.input<typeof HeartbeatInputSchema>

export interface PresenceHeartbeat {
  id: string
  userId: string
  sessionId: string | null
  state: 'inside' | 'outside' | 'unknown'
  zoneId: string | null
  zoneName?: string
  confidence: 'low' | 'medium' | 'high'
  accuracyMeters: number | null
  source: 'browser' | 'native' | 'qr'
  ipOnCampus: boolean
  createdAt: string
}

export interface PresenceSession {
  id: string
  userId: string
  zoneId: string | null
  zoneName?: string
  startedAt: string
  endedAt: string | null
  lastHeartbeatAt: string
  closeReason: 'verified_out' | 'signal_lost' | 'consent_revoked' | 'admin_closed' | null
  durationMinutes: number | null
  createdAt: string
}

export interface PresenceDaily {
  id: string
  userId: string
  day: string           // ISO date 'YYYY-MM-DD'
  zoneId: string | null
  firstIn: string | null
  lastOut: string | null
  minutesOnCampus: number
  sessionCount: number
}

export type HeartbeatState = 'inside' | 'outside' | 'unknown'

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
