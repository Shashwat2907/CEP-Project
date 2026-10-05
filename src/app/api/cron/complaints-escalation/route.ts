import { NextResponse } from 'next/server'
import { escalateOverdueComplaintsAction } from '@/features/complaints/actions'

export const dynamic = 'force-dynamic'

/**
 * Scheduled Cron Handler for Complaints Escalation.
 * Triggered periodically (e.g. every 10-15 minutes via pg_cron or Vercel cron).
 * Evaluates overdue complaints, promotes levels, flags top-level tickets for admin,
 * and notifies students and authorities.
 */
export async function GET(request: Request) {
  return handleEscalation(request)
}

export async function POST(request: Request) {
  return handleEscalation(request)
}

async function handleEscalation(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Validate secret if configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  try {
    const result = await escalateOverdueComplaintsAction()

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Escalation sweep executed successfully',
      result: result.data,
    })
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown cron error'
    console.error('[api/cron/complaints-escalation] Execution error:', errMessage)
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    )
  }
}
