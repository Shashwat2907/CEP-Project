'use server'

import {
  VerifyPresenceInput,
  VerifyPresenceInputSchema,
  PresenceConsentInput,
  PresenceConsentInputSchema,
  CampusZoneInput,
  CampusZoneInputSchema,
  PresenceEvaluationResult,
  PresenceConsentRecord,
  DEFAULT_CAMPUS_ZONE,
  CampusZone,
  LatLng,
} from './schema'
import { isPointInPolygon, calculateConfidence } from './polygon'
import { writeAudit } from '@/shared/audit/audit'
import { emitEvent } from '@/shared/outbox/outbox'
import { createClient } from '@/lib/supabase/server'

export type PresenceActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export interface PresenceDbQuery extends PromiseLike<{ data: unknown; error: unknown }> {
  select: (...args: unknown[]) => PresenceDbQuery
  insert: (...args: unknown[]) => PresenceDbQuery
  update: (...args: unknown[]) => PresenceDbQuery
  upsert: (...args: unknown[]) => PresenceDbQuery
  delete: () => PresenceDbQuery
  eq: (...args: unknown[]) => PresenceDbQuery
  single: () => Promise<{ data: unknown; error: unknown }>
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>
}

export interface PresenceDbClient {
  from: (table: string) => PresenceDbQuery
}

interface RawConsentData {
  user_id: string
  consent_given?: boolean
  is_paused?: boolean
  visibility?: 'nobody' | 'friends' | 'everyone'
  consented_at?: string | null
  revoked_at?: string | null
}

interface RawStatusData {
  state: 'in' | 'out' | 'checking' | 'denied' | 'offline'
  campus_zones?: { name?: string } | null
  confidence: 'low' | 'medium' | 'high'
  accuracy_meters?: number | string | null
  verified_at: string
}

/**
 * Resolves current user ID from session or fallback
 */
async function resolveUserId(userId?: string): Promise<string | null> {
  if (userId) return userId
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

/**
 * Fetches the user's presence state and consent settings.
 * Source of truth: documents/PLAN.md §5.1
 */
export async function getPresenceState(
  client?: PresenceDbClient,
  providedUserId?: string
): Promise<PresenceActionResult<{
  consent: PresenceConsentRecord | null
  status: PresenceEvaluationResult | null
}>> {
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    // Return empty state for unauthenticated visitor
    return { ok: true, data: { consent: null, status: null } }
  }

  if (client) {
    try {
      const { data: rawConsent } = await client
        .from('presence_consent')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      const consentData = rawConsent as RawConsentData | null

      let consent: PresenceConsentRecord | null = null
      if (consentData) {
        consent = {
          userId: consentData.user_id,
          consentGiven: Boolean(consentData.consent_given),
          isPaused: Boolean(consentData.is_paused),
          visibility: consentData.visibility || 'nobody',
          consentedAt: consentData.consented_at,
          revokedAt: consentData.revoked_at,
        }
      }

      let status: PresenceEvaluationResult | null = null
      if (consent && consent.consentGiven) {
        const { data: rawStatus } = await client
          .from('presence_status')
          .select('*, campus_zones(name)')
          .eq('user_id', userId)
          .maybeSingle()

        const statusData = rawStatus as RawStatusData | null

        if (statusData) {
          status = {
            state: statusData.state,
            isInside: statusData.state === 'in',
            zoneName: statusData.campus_zones?.name ?? (statusData.state === 'in' ? 'Main Campus' : undefined),
            confidence: statusData.confidence,
            accuracyMeters: statusData.accuracy_meters ? Number(statusData.accuracy_meters) : undefined,
            verifiedAt: statusData.verified_at,
          }
        }
      }

      return { ok: true, data: { consent, status } }
    } catch {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'Failed to fetch presence state' },
      }
    }
  }

  // Pure fallback / unit mock state
  return {
    ok: true,
    data: {
      consent: {
        userId,
        consentGiven: true,
        isPaused: false,
        visibility: 'nobody',
        consentedAt: new Date().toISOString(),
      },
      status: {
        state: 'in',
        isInside: true,
        zoneName: 'Main Campus',
        confidence: 'high',
        accuracyMeters: 15,
        verifiedAt: new Date().toISOString(),
      },
    },
  }
}

/**
 * Updates presence consent settings.
 * If consent is revoked (consentGiven = false):
 * - Records revocation timestamp
 * - Purges the current presence_status record immediately per PLAN.md §5.1
 * - Writes audit log
 */
type AuditClient = Parameters<typeof writeAudit>[1]
type OutboxClient = Parameters<typeof emitEvent>[1]

export async function updatePresenceConsent(
  input: PresenceConsentInput,
  client?: PresenceDbClient,
  providedUserId?: string
): Promise<PresenceActionResult<PresenceConsentRecord>> {
  const parse = PresenceConsentInputSchema.safeParse(input)
  if (!parse.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: parse.error.errors.map((e) => e.message).join(', ') },
    }
  }

  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required to update presence consent' },
    }
  }

  const { consentGiven, isPaused, visibility } = parse.data
  const now = new Date().toISOString()

  const record: PresenceConsentRecord = {
    userId,
    consentGiven,
    isPaused: isPaused ?? false,
    visibility: visibility ?? 'nobody',
    consentedAt: consentGiven ? now : null,
    revokedAt: !consentGiven ? now : null,
  }

  if (client) {
    try {
      // Upsert into presence_consent
      const { error: consentError } = await client.from('presence_consent').upsert({
        user_id: userId,
        consent_given: consentGiven,
        is_paused: isPaused ?? false,
        visibility: visibility ?? 'nobody',
        consented_at: record.consentedAt,
        revoked_at: record.revokedAt,
        updated_at: now,
      })

      if (consentError) {
        return {
          ok: false,
          error: { code: 'DB_ERROR', message: 'Failed to record consent preference' },
        }
      }

      // If consent was revoked, immediately purge presence_status per PLAN.md §5.1
      if (!consentGiven) {
        await client.from('presence_status').delete().eq('user_id', userId)
      }

      // Record audit log
      await writeAudit(
        {
          actorId: userId,
          action: consentGiven ? 'presence.consent_granted' : 'presence.consent_revoked',
          entity: 'presence_consent',
          entityId: userId,
          meta: { isPaused, visibility, consentGiven },
        },
        client as unknown as AuditClient
      )

      // Emit outbox event
      await emitEvent(
        {
          type: consentGiven ? 'presence.consent_updated' : 'presence.consent_revoked',
          payload: { userId, consentGiven, isPaused, visibility },
        },
        client as unknown as OutboxClient
      )

      return { ok: true, data: record }
    } catch {
      return {
        ok: false,
        error: { code: 'PERSISTENCE_FAILED', message: 'Could not complete consent update' },
      }
    }
  }

  return { ok: true, data: record }
}

/**
 * Toggles presence sharing pause state without revoking full consent.
 * Source of truth: documents/PLAN.md §5.1 ("Pause sharing")
 */
export async function togglePresencePause(
  isPaused: boolean,
  client?: PresenceDbClient,
  providedUserId?: string
): Promise<PresenceActionResult<{ isPaused: boolean }>> {
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required to pause presence sharing' },
    }
  }

  if (client) {
    try {
      const { error } = await client
        .from('presence_consent')
        .update({ is_paused: isPaused, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (error) {
        return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to update pause state' } }
      }

      // If paused, update presence_status state to offline
      if (isPaused) {
        await client
          .from('presence_status')
          .update({ state: 'offline', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
      }

      await writeAudit(
        {
          actorId: userId,
          action: isPaused ? 'presence.paused' : 'presence.resumed',
          entity: 'presence_consent',
          entityId: userId,
          meta: { isPaused },
        },
        client as unknown as AuditClient
      )

      return { ok: true, data: { isPaused } }
    } catch {
      return { ok: false, error: { code: 'PERSISTENCE_FAILED', message: 'Failed to toggle pause' } }
    }
  }

  return { ok: true, data: { isPaused } }
}

/**
 * Server-side point-in-polygon presence boundary verification.
 * 
 * Strict Privacy Enforcements (documents/PLAN.md §5.1):
 * 1. Checks consent first: if not consented or paused, throws CONSENT_REQUIRED / CONSENT_PAUSED.
 * 2. NEVER stores raw latitude/longitude in the database. Evaluates in-memory and discards.
 * 3. Outside points record state = 'out' only, never where the person is.
 * 4. High accuracy (<30m), medium (30-100m), low (>100m).
 */
export async function verifyPresence(
  coords: VerifyPresenceInput,
  client?: PresenceDbClient,
  providedUserId?: string,
  customZones?: CampusZone[]
): Promise<PresenceActionResult<PresenceEvaluationResult>> {
  const parse = VerifyPresenceInputSchema.safeParse(coords)
  if (!parse.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: parse.error.errors.map((e) => e.message).join(', ') },
    }
  }

  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required for campus verification' },
    }
  }

  const { latitude, longitude, accuracy } = parse.data

  // 1. Consent verification check
  if (client) {
    const { data: consentData, error: consentErr } = await client
      .from('presence_consent')
      .select('consent_given, is_paused')
      .eq('user_id', userId)
      .maybeSingle()

    const consent = consentData as { consent_given?: boolean; is_paused?: boolean } | null

    if (consentErr || !consent || !consent.consent_given) {
      return {
        ok: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: 'Campus presence verification requires opt-in privacy consent.',
        },
      }
    }

    if (consent.is_paused) {
      return {
        ok: false,
        error: {
          code: 'CONSENT_PAUSED',
          message: 'Location verification is paused. Unpause to verify presence.',
        },
      }
    }
  }

  // 2. Load active campus zones
  let zones: CampusZone[] = customZones || []
  if (zones.length === 0 && client) {
    const { data: zonesData } = await client
      .from('campus_zones')
      .select('*')
      .eq('is_active', true)

    if (zonesData && Array.isArray(zonesData) && zonesData.length > 0) {
      zones = (zonesData as Array<{
        id: string
        name: string
        kind: 'campus' | 'zone' | 'building'
        polygon: LatLng[]
        is_active: boolean
      }>).map((z) => ({
        id: z.id,
        name: z.name,
        kind: z.kind,
        polygon: z.polygon,
        isActive: z.is_active,
      }))
    }
  }

  if (zones.length === 0) {
    zones = [DEFAULT_CAMPUS_ZONE]
  }

  // 3. In-memory Ray-Casting Point-in-Polygon check
  // (Raw coordinates are evaluated strictly in-memory and NEVER persisted)
  let matchedZone: CampusZone | null = null
  for (const zone of zones) {
    if (isPointInPolygon({ lat: latitude, lng: longitude }, zone.polygon)) {
      matchedZone = zone
      break
    }
  }

  const isInside = Boolean(matchedZone)
  const confidence = calculateConfidence(accuracy)
  const verifiedAt = new Date().toISOString()

  // 4. Update presence_status (State, zone, confidence, accuracy ONLY; NO coordinates)
  if (client) {
    try {
      await client.from('presence_status').upsert({
        user_id: userId,
        state: isInside ? 'in' : 'out',
        zone_id: matchedZone ? matchedZone.id : null,
        confidence,
        accuracy_meters: accuracy ?? null,
        verified_at: verifiedAt,
        updated_at: verifiedAt,
      })

      // Emit status event
      await emitEvent(
        {
          type: 'presence.status_changed',
          payload: {
            userId,
            state: isInside ? 'in' : 'out',
            zoneName: matchedZone?.name ?? null,
            confidence,
            verifiedAt,
          },
        },
        client as unknown as OutboxClient
      )
    } catch {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'Failed to record presence status' },
      }
    }
  }

  return {
    ok: true,
    data: {
      state: isInside ? 'in' : 'out',
      isInside,
      zoneName: matchedZone ? matchedZone.name : undefined,
      confidence,
      accuracyMeters: accuracy,
      verifiedAt,
    },
  }
}

/**
 * Admin action to save or update a campus polygon zone.
 */
export async function saveCampusZone(
  input: CampusZoneInput,
  client?: PresenceDbClient,
  providedActorId?: string
): Promise<PresenceActionResult<CampusZone>> {
  const parse = CampusZoneInputSchema.safeParse(input)
  if (!parse.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: parse.error.errors.map((e) => e.message).join(', ') },
    }
  }

  const { name, kind, polygon } = parse.data
  const actorId = await resolveUserId(providedActorId)

  if (client) {
    try {
      const { data, error } = await client
        .from('campus_zones')
        .insert({
          name,
          kind,
          polygon,
          is_active: true,
        })
        .select()
        .single()

      const zoneRecord = data as {
        id: string
        name: string
        kind: 'campus' | 'zone' | 'building'
        polygon: LatLng[]
        is_active: boolean
      } | null

      if (error || !zoneRecord) {
        return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to create campus zone' } }
      }

      await writeAudit(
        {
          actorId: actorId ?? undefined,
          action: 'campus_zone.created',
          entity: 'campus_zones',
          entityId: zoneRecord.id,
          meta: { name, kind, vertexCount: polygon.length },
        },
        client as unknown as AuditClient
      )

      return {
        ok: true,
        data: {
          id: zoneRecord.id,
          name: zoneRecord.name,
          kind: zoneRecord.kind,
          polygon: zoneRecord.polygon,
          isActive: zoneRecord.is_active,
        },
      }
    } catch {
      return { ok: false, error: { code: 'PERSISTENCE_FAILED', message: 'Could not save campus zone' } }
    }
  }

  return {
    ok: true,
    data: {
      id: crypto.randomUUID(),
      name,
      kind,
      polygon,
      isActive: true,
    },
  }
}
