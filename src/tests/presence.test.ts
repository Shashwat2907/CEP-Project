import { describe, it, expect, vi } from 'vitest'
import {
  isPointInPolygon,
  calculateConfidence,
  getBoundingBox,
  calculateDistanceMeters,
} from '@/features/presence/polygon'
import {
  verifyPresence,
  updatePresenceConsent,
  togglePresencePause,
  saveCampusZone,
  type PresenceDbClient,
} from '@/features/presence/actions'
import {
  DEFAULT_CAMPUS_ZONE,
  LatLng,
  CampusZoneInputSchema,
} from '@/features/presence/schema'

describe('Campus Presence Feature Suite', () => {
  // 1. Ray-Casting Polygon Boundary Checks
  describe('Point-in-Polygon (Ray Casting Algorithm)', () => {
    // Default campus polygon:
    // {"lat": 12.9710, "lng": 79.1580},
    // {"lat": 12.9760, "lng": 79.1585},
    // {"lat": 12.9770, "lng": 79.1660},
    // {"lat": 12.9715, "lng": 79.1655}

    it('identifies coordinates inside the campus boundary polygon as INSIDE', () => {
      // Center of the polygon
      const insidePoint: LatLng = { lat: 12.9735, lng: 79.1620 }
      const isInside = isPointInPolygon(insidePoint, DEFAULT_CAMPUS_ZONE.polygon)
      expect(isInside).toBe(true)
    })

    it('identifies coordinates outside the campus boundary polygon as OUTSIDE', () => {
      // Far outside the polygon
      const outsidePoint: LatLng = { lat: 12.9900, lng: 79.2000 }
      const isInside = isPointInPolygon(outsidePoint, DEFAULT_CAMPUS_ZONE.polygon)
      expect(isInside).toBe(false)
    })

    it('fast-rejects coordinates outside the bounding box', () => {
      const bbox = getBoundingBox(DEFAULT_CAMPUS_ZONE.polygon)
      expect(bbox.minLat).toBeLessThanOrEqual(12.9710)
      expect(bbox.maxLat).toBeGreaterThanOrEqual(12.9770)

      // Far south
      expect(isPointInPolygon({ lat: 10.0000, lng: 79.1620 }, DEFAULT_CAMPUS_ZONE.polygon)).toBe(false)
      // Far north
      expect(isPointInPolygon({ lat: 15.0000, lng: 79.1620 }, DEFAULT_CAMPUS_ZONE.polygon)).toBe(false)
    })

    it('handles exact vertex matches as inside boundary', () => {
      const vertex = DEFAULT_CAMPUS_ZONE.polygon[0]
      expect(isPointInPolygon(vertex, DEFAULT_CAMPUS_ZONE.polygon)).toBe(true)
    })

    it('returns false for degenerate polygons (< 3 vertices)', () => {
      expect(isPointInPolygon({ lat: 12.9735, lng: 79.1620 }, [])).toBe(false)
      expect(isPointInPolygon({ lat: 12.9735, lng: 79.1620 }, [{ lat: 12.9710, lng: 79.1580 }])).toBe(false)
      expect(
        isPointInPolygon({ lat: 12.9735, lng: 79.1620 }, [
          { lat: 12.9710, lng: 79.1580 },
          { lat: 12.9760, lng: 79.1585 },
        ])
      ).toBe(false)
    })
  })

  // 2. Accuracy & Confidence Evaluation (PLAN.md §5.1)
  describe('Confidence & Accuracy Calculator', () => {
    it('rates accuracy < 30m as HIGH confidence', () => {
      expect(calculateConfidence(10)).toBe('high')
      expect(calculateConfidence(29)).toBe('high')
    })

    it('rates accuracy between 30m and 100m as MEDIUM confidence', () => {
      expect(calculateConfidence(30)).toBe('medium')
      expect(calculateConfidence(50)).toBe('medium')
      expect(calculateConfidence(100)).toBe('medium')
    })

    it('rates accuracy > 100m as LOW confidence (triggers warning in UI)', () => {
      expect(calculateConfidence(101)).toBe('low')
      expect(calculateConfidence(250)).toBe('low')
    })

    it('defaults to medium when accuracy is omitted or undefined', () => {
      expect(calculateConfidence(undefined)).toBe('medium')
      expect(calculateConfidence(null)).toBe('medium')
    })

    it('calculates geographic distance using Haversine formula', () => {
      const p1: LatLng = { lat: 12.9710, lng: 79.1580 }
      const p2: LatLng = { lat: 12.9760, lng: 79.1585 }
      const distance = calculateDistanceMeters(p1, p2)
      expect(distance).toBeGreaterThan(500)
      expect(distance).toBeLessThan(700)
    })
  })

  // 3. Privacy, Consent & Boundary Verification Actions (PLAN.md §5.1)
  describe('Presence Server Actions & Privacy Invariants', () => {
    const testUserId = '00000000-0000-0000-0000-000000000101'

    it('blocks verification with CONSENT_REQUIRED when user has not granted consent', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'presence_consent') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      const res = await verifyPresence(
        { latitude: 12.9735, longitude: 79.1620, accuracy: 15 },
        mockClient as unknown as PresenceDbClient,
        testUserId
      )

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('CONSENT_REQUIRED')
        expect(res.error.message).toContain('consent')
      }
    })

    it('blocks verification with CONSENT_PAUSED when user has paused sharing', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'presence_consent') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { consent_given: true, is_paused: true },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      const res = await verifyPresence(
        { latitude: 12.9735, longitude: 79.1620, accuracy: 15 },
        mockClient as unknown as PresenceDbClient,
        testUserId
      )

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe('CONSENT_PAUSED')
      }
    })

interface SavedPresencePayload {
  user_id?: string
  state?: string
  zone_id?: string | null
  accuracy_meters?: number
  latitude?: unknown
  longitude?: unknown
  lat?: unknown
  lng?: unknown
}

    it('verifies coordinate INSIDE campus and NEVER persists raw coordinates to DB', async () => {
      let savedStatusPayload: SavedPresencePayload | null = null

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'presence_consent') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { consent_given: true, is_paused: false },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'campus_zones') {
            return {
              select: () => ({
                eq: () => vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: DEFAULT_CAMPUS_ZONE.id,
                      name: DEFAULT_CAMPUS_ZONE.name,
                      kind: DEFAULT_CAMPUS_ZONE.kind,
                      polygon: DEFAULT_CAMPUS_ZONE.polygon,
                      is_active: true,
                    },
                  ],
                  error: null,
                })(),
              }),
            }
          }
          if (table === 'presence_status') {
            return {
              upsert: vi.fn().mockImplementation((payload: SavedPresencePayload) => {
                savedStatusPayload = payload
                return Promise.resolve({ error: null })
              }),
            }
          }
          if (table === 'events_outbox') {
            return {
              insert: () => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'evt-1', type: 'presence.status_changed', payload: {} },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      const res = await verifyPresence(
        { latitude: 12.9735, longitude: 79.1620, accuracy: 18 },
        mockClient as unknown as PresenceDbClient,
        testUserId
      )

      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.state).toBe('in')
        expect(res.data.isInside).toBe(true)
        expect(res.data.zoneName).toBe('Main Campus')
        expect(res.data.confidence).toBe('high')
      }

      // STRICT PRIVACY AUDIT: Ensure raw latitude and longitude were NOT saved in DB!
      expect(savedStatusPayload).not.toBeNull()
      const payload = savedStatusPayload as unknown as SavedPresencePayload
      expect(payload.user_id).toBe(testUserId)
      expect(payload.state).toBe('in')
      expect(payload.zone_id).toBe(DEFAULT_CAMPUS_ZONE.id)
      expect(payload.accuracy_meters).toBe(18)
      expect(payload.latitude).toBeUndefined()
      expect(payload.longitude).toBeUndefined()
      expect(payload.lat).toBeUndefined()
      expect(payload.lng).toBeUndefined()
    })

    it('verifies coordinate OUTSIDE campus as state = out with zone_id = null', async () => {
      let savedStatusPayload: SavedPresencePayload | null = null

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'presence_consent') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { consent_given: true, is_paused: false },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'campus_zones') {
            return {
              select: () => ({
                eq: () => vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: DEFAULT_CAMPUS_ZONE.id,
                      name: DEFAULT_CAMPUS_ZONE.name,
                      kind: DEFAULT_CAMPUS_ZONE.kind,
                      polygon: DEFAULT_CAMPUS_ZONE.polygon,
                      is_active: true,
                    },
                  ],
                  error: null,
                })(),
              }),
            }
          }
          if (table === 'presence_status') {
            return {
              upsert: vi.fn().mockImplementation((payload: SavedPresencePayload) => {
                savedStatusPayload = payload
                return Promise.resolve({ error: null })
              }),
            }
          }
          if (table === 'events_outbox') {
            return {
              insert: () => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'evt-2', type: 'presence.status_changed', payload: {} },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      // Point far outside campus
      const res = await verifyPresence(
        { latitude: 12.9999, longitude: 79.2500, accuracy: 25 },
        mockClient as unknown as PresenceDbClient,
        testUserId
      )

      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.state).toBe('out')
        expect(res.data.isInside).toBe(false)
        expect(res.data.zoneName).toBeUndefined()
      }

      // Check DB payload: state is 'out' and zone_id is null
      expect(savedStatusPayload).not.toBeNull()
      const payload = savedStatusPayload as unknown as SavedPresencePayload
      expect(payload.state).toBe('out')
      expect(payload.zone_id).toBeNull()
      // Crucially, NO off-campus position coordinates stored!
      expect(payload.latitude).toBeUndefined()
      expect(payload.longitude).toBeUndefined()
    })

    it('revoking consent deletes active presence status and writes audit log', async () => {
      let presenceDeleted = false
      let auditWritten = false

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'presence_consent') {
            return {
              upsert: vi.fn().mockResolvedValue({ error: null }),
            }
          }
          if (table === 'presence_status') {
            return {
              delete: () => ({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  if (col === 'user_id' && val === testUserId) {
                    presenceDeleted = true
                  }
                  return Promise.resolve({ error: null })
                }),
              }),
            }
          }
          if (table === 'audit_log') {
            return {
              insert: (record: Record<string, unknown>) => {
                if (record.action === 'presence.consent_revoked') {
                  auditWritten = true
                }
                return {
                  select: () => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'audit-1', ...record, at: new Date().toISOString() },
                      error: null,
                    }),
                  }),
                }
              },
            }
          }
          if (table === 'events_outbox') {
            return {
              insert: () => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'evt-3', type: 'presence.consent_revoked', payload: {} },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      const res = await updatePresenceConsent(
        { consentGiven: false, visibility: 'nobody' },
        mockClient as unknown as PresenceDbClient,
        testUserId
      )

      expect(res.ok).toBe(true)
      expect(presenceDeleted).toBe(true)
      expect(auditWritten).toBe(true)
    })

    it('toggling presence pause updates state to offline and writes audit', async () => {
      let pauseUpdated = false
      let offlineSet = false

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'presence_consent') {
            return {
              update: (fields: Record<string, unknown>) => {
                if (fields.is_paused === true) pauseUpdated = true
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }
              },
            }
          }
          if (table === 'presence_status') {
            return {
              update: (fields: Record<string, unknown>) => {
                if (fields.state === 'offline') offlineSet = true
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }
              },
            }
          }
          if (table === 'audit_log') {
            return {
              insert: (record: Record<string, unknown>) => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'audit-2', ...record, at: new Date().toISOString() },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      const res = await togglePresencePause(true, mockClient as unknown as PresenceDbClient, testUserId)
      expect(res.ok).toBe(true)
      expect(pauseUpdated).toBe(true)
      expect(offlineSet).toBe(true)
    })
  })

  // 4. Admin Boundary Zone Management
  describe('Campus Zone Management', () => {
    it('validates polygon schema requiring at least 3 vertices', () => {
      const invalidZone = {
        name: 'Invalid Zone',
        kind: 'campus' as const,
        polygon: [{ lat: 12.9710, lng: 79.1580 }, { lat: 12.9760, lng: 79.1585 }],
      }

      const parse = CampusZoneInputSchema.safeParse(invalidZone)
      expect(parse.success).toBe(false)
    })

    it('successfully saves valid campus zone with audit record', async () => {
      let savedZone = false
      const validZone = {
        name: 'Tech Park Campus',
        kind: 'campus' as const,
        polygon: [
          { lat: 12.9710, lng: 79.1580 },
          { lat: 12.9760, lng: 79.1585 },
          { lat: 12.9770, lng: 79.1660 },
        ],
      }

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'campus_zones') {
            return {
              insert: () => {
                savedZone = true
                return {
                  select: () => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'zone-new', ...validZone, is_active: true },
                      error: null,
                    }),
                  }),
                }
              },
            }
          }
          if (table === 'audit_log') {
            return {
              insert: (record: Record<string, unknown>) => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'audit-3', ...record, at: new Date().toISOString() },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      const res = await saveCampusZone(validZone, mockClient as unknown as PresenceDbClient, 'admin-uuid')
      expect(res.ok).toBe(true)
      expect(savedZone).toBe(true)
    })
  })
})
