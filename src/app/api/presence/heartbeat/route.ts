import { NextRequest, NextResponse } from 'next/server'
import { HeartbeatInputSchema } from '@/features/presence/schema'
import { appendHeartbeat } from '@/features/presence/actions'

/**
 * Campus Presence Heartbeat Endpoint
 * Source of truth: documents/PLAN.md §5.1, documents/CONTRACT.md §5.5
 * 
 * Rules:
 * - Coordinates are evaluated server-side against campus zones and discarded immediately.
 * - Coordinates are NEVER persisted in any database table.
 * - If outside campus, only state='outside' is recorded without location.
 * - Compares client IP against campus IP ranges to boost confidence.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = HeartbeatInputSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid heartbeat payload' } },
        { status: 400 }
      )
    }

    // Extract client IP address for campus network check
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) ?? undefined

    const result = await appendHeartbeat(parsed.data, undefined, undefined, clientIp)

    if (!result.ok) {
      const status = result.error.code === 'UNAUTHORIZED' ? 401 : result.error.code === 'NO_CONSENT' ? 403 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'Heartbeat processing failed' } },
      { status: 500 }
    )
  }
}
