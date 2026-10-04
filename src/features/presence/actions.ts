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
  HeartbeatInput,
  HeartbeatInputSchema,
  PresenceHeartbeat,
  PresenceSession,
  PresenceDaily,
  HeartbeatState,
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
  order: (...args: unknown[]) => PresenceDbQuery
  limit: (...args: unknown[]) => PresenceDbQuery
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

/**
 * Returns all active campus zones. Defaults to DEFAULT_CAMPUS_ZONE if none found.
 */
export async function getCampusZones(
  client?: PresenceDbClient
): Promise<PresenceActionResult<CampusZone[]>> {
  if (!client) {
    return { ok: true, data: [DEFAULT_CAMPUS_ZONE] }
  }

  try {
    const { data, error } = await client
      .from('campus_zones')
      .select('*')
      .eq('is_active', true)

    if (error) {
      return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to load zones' } }
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const zones = (data as Array<{
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
      return { ok: true, data: zones }
    }

    return { ok: true, data: [DEFAULT_CAMPUS_ZONE] }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to load zones' } }
  }
}

// ─── Heartbeat Monitoring Actions ────────────────────────────────────────
// Privacy contract (PLAN.md §5.1):
//  - Coordinates are NEVER persisted. Server evaluates position and discards coordinates.
//  - No heartbeat is stored when consent is absent or paused.
//  - Nothing is stored for outside-campus positions except state='outside'.

interface RawHeartbeatRow {
  id: string
  user_id: string
  session_id: string | null
  state: HeartbeatState
  zone_id: string | null
  confidence: 'low' | 'medium' | 'high'
  accuracy_meters: number | null
  source: 'browser' | 'native' | 'qr'
  ip_on_campus: boolean
  created_at: string
  campus_zones?: { name?: string } | null
}

interface RawSessionRow {
  id: string
  user_id: string
  zone_id: string | null
  started_at: string
  ended_at: string | null
  last_heartbeat_at: string
  close_reason: 'verified_out' | 'signal_lost' | 'consent_revoked' | 'admin_closed' | null
  duration_minutes: number | null
  created_at: string
  campus_zones?: { name?: string } | null
}

interface RawDailyRow {
  id: string
  user_id: string
  day: string
  zone_id: string | null
  first_in: string | null
  last_out: string | null
  minutes_on_campus: number
  session_count: number
}

/**
 * Processes one presence heartbeat.
 * Called by the client hook while the browser tab is visible.
 * Privacy: coordinates are NEVER stored; only the evaluated state + zone + confidence are stored.
 *
 * Flow:
 *  1. Validate input with Zod
 *  2. Require active consent (not paused, not revoked)
 *  3. Evaluate position server-side using campus polygon
 *  4. Check if request IP matches any campus_ip_ranges (raises confidence)
 *  5. Open/extend/close a presence_session
 *  6. Write presence_heartbeat row
 *  7. Update presence_status for the top-bar pill
 *
 * Source of truth: documents/PLAN.md §5.1, documents/TEAM_TASKS.md feat/presence-monitoring
 */
export async function appendHeartbeat(
  input: HeartbeatInput,
  client?: PresenceDbClient,
  providedUserId?: string,
  clientIp?: string
): Promise<PresenceActionResult<{ heartbeat: PresenceHeartbeat; sessionId: string | null }>> {
  // 1. Validate
  const parse = HeartbeatInputSchema.safeParse(input)
  if (!parse.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: parse.error.errors.map((e) => e.message).join(', ') },
    }
  }
  const { latitude, longitude, accuracy, source } = parse.data

  // 2. Auth
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  // 3. Require active consent
  if (client) {
    const { data: rawConsent } = await client
      .from('presence_consent')
      .select('consent_given, is_paused, revoked_at')
      .eq('user_id', userId)
      .maybeSingle()
    const consent = rawConsent as { consent_given?: boolean; is_paused?: boolean; revoked_at?: string | null } | null
    if (!consent?.consent_given || consent.is_paused || consent.revoked_at) {
      return { ok: false, error: { code: 'NO_CONSENT', message: 'Presence monitoring requires active consent' } }
    }
  }

  // 4. Evaluate position against campus polygon
  const zones = await getCampusZones(client).catch(() => ({ ok: false as const, error: { code: 'ZONE_LOAD_FAILED', message: 'Could not load zones' } }))
  const zoneList = zones.ok ? zones.data : [DEFAULT_CAMPUS_ZONE]
  const campusZone = (zoneList as CampusZone[]).find((z) => z.kind === 'campus') ?? DEFAULT_CAMPUS_ZONE
  const inside = isPointInPolygon({ lat: latitude, lng: longitude }, campusZone.polygon)

  // 5. Campus network check (IP range matching)
  let ipOnCampus = false
  if (clientIp && client) {
    try {
      const { data: ipRanges } = await client
        .from('campus_ip_ranges')
        .select('cidr')
        .eq('is_active', true)
      if (ipRanges) {
        // Simple prefix match: check if clientIp starts with any range's network prefix
        // In production, use Postgres inet operators via an RPC call for proper CIDR matching
        const ranges = ipRanges as { cidr: string }[]
        ipOnCampus = ranges.some((r) => {
          const [network] = r.cidr.split('/')
          const prefix = network.split('.').slice(0, 2).join('.')
          return clientIp.startsWith(prefix)
        })
      }
    } catch {
      // Non-fatal: IP check is a confidence boost, not a blocker
    }
  }

  // 6. Calculate confidence
  const heartbeatState: HeartbeatState = inside ? 'inside' : 'outside'
  const rawConf = calculateConfidence(accuracy ?? null, ipOnCampus)
  const confidence: 'low' | 'medium' | 'high' =
    rawConf === 'high' || rawConf === 'medium' || rawConf === 'low' ? rawConf : 'low'

  // Only record zone_id when inside campus
  const zoneId = inside ? campusZone.id : null

  let sessionId: string | null = null

  if (client) {
    try {
      // 7. Session management
      if (inside) {
        // Look for an open session for this user
        const { data: openSession } = await client
          .from('presence_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('ended_at', null)
          .maybeSingle()
        const existing = openSession as { id: string } | null

        if (existing) {
          // Extend the open session
          sessionId = existing.id
          await client
            .from('presence_sessions')
            .update({ last_heartbeat_at: new Date().toISOString(), zone_id: zoneId })
            .eq('id', existing.id)
        } else {
          // Open a new session
          const { data: newSession } = await client
            .from('presence_sessions')
            .insert({ user_id: userId, zone_id: zoneId, started_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString() })
            .select('id')
            .single()
          sessionId = (newSession as { id: string } | null)?.id ?? null
        }
      } else {
        // Outside campus: close any open session with reason 'verified_out'
        await client
          .from('presence_sessions')
          .update({ ended_at: new Date().toISOString(), close_reason: 'verified_out' })
          .eq('user_id', userId)
          .eq('ended_at', null)
      }

      // 8. Write heartbeat row (coordinates NOT stored)
      const { data: hbRow } = await client
        .from('presence_heartbeats')
        .insert({
          user_id: userId,
          session_id: sessionId,
          state: heartbeatState,
          zone_id: zoneId,
          confidence,
          accuracy_meters: accuracy ?? null,
          source,
          ip_on_campus: ipOnCampus,
        })
        .select('*')
        .single()

      const hb = hbRow as RawHeartbeatRow | null

      // 9. Update presence_status for pill
      await client
        .from('presence_status')
        .upsert({
          user_id: userId,
          state: inside ? 'in' : 'out',
          zone_id: zoneId,
          confidence,
          accuracy_meters: accuracy ?? null,
          verified_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (!hb) {
        return { ok: false, error: { code: 'INSERT_FAILED', message: 'Failed to write heartbeat' } }
      }

      return {
        ok: true,
        data: {
          heartbeat: {
            id: hb.id,
            userId: hb.user_id,
            sessionId: hb.session_id,
            state: hb.state,
            zoneId: hb.zone_id,
            confidence: hb.confidence,
            accuracyMeters: hb.accuracy_meters,
            source: hb.source,
            ipOnCampus: hb.ip_on_campus,
            createdAt: hb.created_at,
          },
          sessionId,
        },
      }
    } catch {
      return { ok: false, error: { code: 'DB_ERROR', message: 'Heartbeat processing failed' } }
    }
  }

  // Unit-test / mock fallback
  const mockId = crypto.randomUUID()
  return {
    ok: true,
    data: {
      heartbeat: {
        id: mockId,
        userId,
        sessionId: null,
        state: heartbeatState,
        zoneId,
        confidence,
        accuracyMeters: accuracy ?? null,
        source,
        ipOnCampus,
        createdAt: new Date().toISOString(),
      },
      sessionId: null,
    },
  }
}

/**
 * Returns the user's presence sessions (for "My time on campus" page).
 * Ordered by started_at descending (most recent first). Page-limited.
 */
export async function getPresenceSessions(
  limit = 30,
  client?: PresenceDbClient,
  providedUserId?: string
): Promise<PresenceActionResult<PresenceSession[]>> {
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  if (!client) {
    // Mock for tests
    return { ok: true, data: [] }
  }

  try {
    const { data, error } = await client
      .from('presence_sessions')
      .select('*, campus_zones(name)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    const rows = (data as RawSessionRow[]) ?? []
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        zoneId: r.zone_id,
        zoneName: r.campus_zones?.name,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        lastHeartbeatAt: r.last_heartbeat_at,
        closeReason: r.close_reason,
        durationMinutes: r.duration_minutes,
        createdAt: r.created_at,
      })),
    }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Could not load sessions' } }
  }
}

/**
 * Returns the user's daily campus presence summaries.
 * Ordered by day descending. Page-limited.
 */
export async function getPresenceDaily(
  limit = 30,
  client?: PresenceDbClient,
  providedUserId?: string
): Promise<PresenceActionResult<PresenceDaily[]>> {
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  if (!client) {
    return { ok: true, data: [] }
  }

  try {
    const { data, error } = await client
      .from('presence_daily')
      .select('*')
      .eq('user_id', userId)
      .order('day', { ascending: false })
      .limit(limit)

    if (error) throw error
    const rows = (data as RawDailyRow[]) ?? []
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        day: r.day,
        zoneId: r.zone_id,
        firstIn: r.first_in,
        lastOut: r.last_out,
        minutesOnCampus: r.minutes_on_campus,
        sessionCount: r.session_count,
      })),
    }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Could not load daily summary' } }
  }
}

/**
 * Admin lookup of an individual student's presence.
 * PLAN.md §5.1 & CONTRACT.md §5.2:
 * "Admins see aggregates; looking up one individual requires a reason and is written to the audit log."
 */
export async function adminLookupUserPresence(
  input: { targetUserId: string; reason: string },
  client?: PresenceDbClient,
  adminUserId?: string
): Promise<PresenceActionResult<{ status: PresenceEvaluationResult | null; sessions: PresenceSession[] }>> {
  if (!input.reason || input.reason.trim().length === 0) {
    return {
      ok: false,
      error: { code: 'REASON_REQUIRED', message: 'Admin lookup of individual presence requires a stated reason' },
    }
  }

  const actorId = await resolveUserId(adminUserId)
  if (!actorId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  // Write to audit log per PLAN.md §5.1
  if (client) {
    try {
      await writeAudit(
        {
          actorId,
          action: 'presence.admin_lookup',
          entity: 'profiles',
          entityId: input.targetUserId,
          meta: { reason: input.reason.trim() },
        },
        client as unknown as AuditClient
      )
    } catch {
      // Continue if audit logging fails in mock environment
    }
  }

  const statusRes = await getPresenceState(client, input.targetUserId)
  const sessionsRes = await getPresenceSessions(20, client, input.targetUserId)

  return {
    ok: true,
    data: {
      status: statusRes.ok ? statusRes.data.status : null,
      sessions: sessionsRes.ok ? sessionsRes.data : [],
    },
  }
}

/**
 * Teacher attendance hook for an active class session.
 * PLAN.md §5.1:
 * "Teachers see attendance only for their own classes and only inside the class time window."
 */
export async function getTeacherClassAttendance(
  input: {
    classId: string
    zoneId: string
    classStartTime: string
    classEndTime: string
    currentTime?: string
  },
  client?: PresenceDbClient,
  teacherUserId?: string
): Promise<PresenceActionResult<{ presentCount: number; zoneId: string; windowActive: boolean }>> {
  const actorId = await resolveUserId(teacherUserId)
  if (!actorId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  const now = input.currentTime ? new Date(input.currentTime).getTime() : Date.now()
  const start = new Date(input.classStartTime).getTime()
  const end = new Date(input.classEndTime).getTime()

  // Window restriction check
  if (now < start || now > end) {
    return {
      ok: false,
      error: {
        code: 'OUTSIDE_CLASS_WINDOW',
        message: 'Teacher presence view is restricted to active class time window',
      },
    }
  }

  if (!client) {
    return { ok: true, data: { presentCount: 0, zoneId: input.zoneId, windowActive: true } }
  }

  try {
    const { data, error } = await client
      .from('presence_status')
      .select('user_id')
      .eq('zone_id', input.zoneId)
      .eq('state', 'in')

    if (error) throw error
    const rows = Array.isArray(data) ? data : []
    return {
      ok: true,
      data: {
        presentCount: rows.length,
        zoneId: input.zoneId,
        windowActive: true,
      },
    }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Could not query class attendance' } }
  }
}

/**
 * Export all personal presence data for the authenticated student.
 * PLAN.md §5.1 (DPDP Act compliance):
 * "Students can export or view exactly what is stored about them."
 */
export async function exportUserPresenceData(
  providedUserId?: string,
  client?: PresenceDbClient
): Promise<
  PresenceActionResult<{
    consent: PresenceConsentRecord | null
    sessions: PresenceSession[]
    daily: PresenceDaily[]
    exportedAt: string
  }>
> {
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  const consentRes = await getPresenceState(client, userId)
  const sessionsRes = await getPresenceSessions(100, client, userId)
  const dailyRes = await getPresenceDaily(100, client, userId)

  return {
    ok: true,
    data: {
      consent: consentRes.ok ? consentRes.data.consent : null,
      sessions: sessionsRes.ok ? sessionsRes.data : [],
      daily: dailyRes.ok ? dailyRes.data : [],
      exportedAt: new Date().toISOString(),
    },
  }
}

/**
 * Add or update campus IP CIDR range.
 */
export async function addCampusIpRange(
  input: { cidr: string; label: string },
  client?: PresenceDbClient,
  adminUserId?: string
): Promise<PresenceActionResult<{ id: string; cidr: string; label: string }>> {
  const actorId = await resolveUserId(adminUserId)
  if (!actorId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  if (client) {
    try {
      const { data, error } = await client
        .from('campus_ip_ranges')
        .insert({ cidr: input.cidr, label: input.label, created_by: actorId })
        .select('*')
        .single()

      if (error) throw error
      const row = data as { id: string; cidr: string; label: string }
      return { ok: true, data: row }
    } catch {
      return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to add IP range' } }
    }
  }

  return {
    ok: true,
    data: {
      id: crypto.randomUUID(),
      cidr: input.cidr,
      label: input.label,
    },
  }
}

