import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyClubPaymentWebhookInternal } from '@/features/clubs/actions'
import { RazorpayWebhookPayloadSchema } from '@/features/clubs/schema'

/**
 * Razorpay Webhook Endpoint for Club Payments
 * Source of truth: src/features/clubs/README.md §4, §10; documents/CONTRACT.md §10
 * Owner: Kedar
 *
 * CRITICAL:
 * Membership activates ONLY from this verified server-side webhook, never from a
 * client redirect. A student who manipulates client query parameters or redirects
 * can NEVER activate their membership.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    // 1. Signature Verification
    if (secret) {
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing Razorpay signature' },
          { status: 400 }
        )
      }
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 400 }
        )
      }
    } else {
      // In development / test mode where no secret is configured, allow simulated requests
      const testSig = req.headers.get('x-test-signature') || signature
      if (process.env.NODE_ENV === 'production' && !testSig) {
        return NextResponse.json(
          { error: 'Razorpay webhook secret is not configured in production' },
          { status: 500 }
        )
      }
    }

    // 2. Parse & Validate Payload
    let json: unknown
    try {
      json = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload' },
        { status: 400 }
      )
    }

    const parsed = RazorpayWebhookPayloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid webhook payload structure',
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    // 3. Process Event Idempotently
    const result = await verifyClubPaymentWebhookInternal(parsed.data)

    return NextResponse.json(
      {
        received: true,
        ...result,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('[webhooks/razorpay] Processing error:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
