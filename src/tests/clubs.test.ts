import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'crypto'
import {
  ClubMemberStatusSchema,
  ClubSchema,
  ClubMemberSchema,
  InitiateClubPaymentSchema,
  RazorpayWebhookPayloadSchema,
} from '@/features/clubs/schema'
import {
  joinClubAction,
  initiateClubPaymentAction,
  verifyClubPaymentWebhookInternal,
  approveClubMemberAction,
  rejectClubMemberAction,
  leaveClubAction,
} from '@/features/clubs/actions'
import {
  MOCK_CLUBS,
  MOCK_CLUB_MEMBERS,
} from '@/features/clubs/mock-clubs-data'
import { POST as razorpayWebhookRoute } from '@/app/api/webhooks/razorpay/route'
import { NextRequest } from 'next/server'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase status to test offline/resilient store logic reliably
vi.mock('@/lib/supabase/status', () => ({
  isSupabaseOnline: vi.fn().mockResolvedValue(false),
}))

// Mock auth & profile sessions
const mockStudentId = '00000000-0000-0000-0000-000000000099'
const mockLeadId = '00000000-0000-0000-0000-000000000002' // Lead of Coding Club (Prof. Rajesh Sharma)
let currentAuthUserId = mockStudentId

vi.mock('@/shared/auth/guards', () => ({
  requireAuth: vi.fn().mockImplementation(async () => ({
    user: { id: currentAuthUserId, email: 'student@campus.edu' },
  })),
}))

vi.mock('@/shared/auth/session', () => ({
  getCurrentProfile: vi.fn().mockImplementation(async () => ({
    id: currentAuthUserId,
    full_name: currentAuthUserId === mockLeadId ? 'Prof. Rajesh Sharma' : 'Test Student',
    college_id: currentAuthUserId === mockLeadId ? 'TCH101' : '23BCE9999',
    role_primary: currentAuthUserId === mockLeadId ? 'teacher' : 'student',
  })),
}))

// Track dispatched notifications
const dispatchedNotifications: Array<Record<string, unknown>> = []
vi.mock('@/shared/notifications/notify', () => ({
  notify: vi.fn().mockImplementation(async (input: Record<string, unknown>) => {
    dispatchedNotifications.push(input)
    return { ok: true, data: { id: 'notif-1', ...input, createdAt: new Date().toISOString() } }
  }),
}))

describe('Clubs Feature: feat/clubs-join-and-payments', () => {
  const freeClubId = '00000000-0000-0000-0060-000000000001' // Coding Club (Fee 0)
  const paidClubId = '00000000-0000-0000-0060-000000000002' // Photography Club (Fee 200)

  beforeEach(() => {
    currentAuthUserId = mockStudentId
    dispatchedNotifications.length = 0
    // Clean up student from mock members
    const cleanMembers = MOCK_CLUB_MEMBERS.filter((m) => m.user_id !== mockStudentId)
    MOCK_CLUB_MEMBERS.length = 0
    MOCK_CLUB_MEMBERS.push(...cleanMembers)
  })

  describe('1. Zod Schemas & Status Chips (schema.ts)', () => {
    it('validates all 4 status chip values', () => {
      expect(ClubMemberStatusSchema.safeParse('requested').success).toBe(true)
      expect(ClubMemberStatusSchema.safeParse('payment_pending').success).toBe(true)
      expect(ClubMemberStatusSchema.safeParse('member').success).toBe(true)
      expect(ClubMemberStatusSchema.safeParse('rejected').success).toBe(true)
      expect(ClubMemberStatusSchema.safeParse('invalid_status').success).toBe(false)
    })

    it('validates initiate payment input schema', () => {
      expect(InitiateClubPaymentSchema.safeParse({ club_id: freeClubId }).success).toBe(true)
      expect(InitiateClubPaymentSchema.safeParse({ club_id: 'not-a-uuid' }).success).toBe(false)
    })

    it('validates Razorpay webhook payload schema structure', () => {
      const validPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_123456',
              amount: 20000,
              currency: 'INR',
              status: 'captured',
              order_id: 'order_123',
              notes: { club_id: paidClubId, user_id: mockStudentId },
            },
          },
        },
      }
      const parsed = RazorpayWebhookPayloadSchema.safeParse(validPayload)
      expect(parsed.success).toBe(true)
    })
  })

  describe('2. Free Club Join Flow (Lead Approval)', () => {
    it('allows student to request to join a free club with status = "requested"', async () => {
      const res = await joinClubAction({ club_id: freeClubId })
      expect(res.success).toBe(true)
      if (!res.success) return

      expect(res.data?.status).toBe('requested')
      expect(res.data?.needs_payment).toBe(false)

      // Verifies notification was sent to club lead
      const leadNotif = dispatchedNotifications.find((n) => n.type === 'clubs.join_requested')
      expect(leadNotif).toBeDefined()
      expect(leadNotif?.userId).toBe(mockLeadId)
    })

    it('prevents duplicate join requests for the same club', async () => {
      await joinClubAction({ club_id: freeClubId })
      const duplicateRes = await joinClubAction({ club_id: freeClubId })
      expect(duplicateRes.success).toBe(false)
      if (!duplicateRes.success) {
        expect(duplicateRes.error).toContain('already')
      }
    })

    it('allows club lead to approve request, transitioning status to "member"', async () => {
      // 1. Student requests
      await joinClubAction({ club_id: freeClubId })

      // 2. Club lead approves
      currentAuthUserId = mockLeadId
      const approveRes = await approveClubMemberAction({
        club_id: freeClubId,
        user_id: mockStudentId,
      })
      expect(approveRes.success).toBe(true)

      const member = MOCK_CLUB_MEMBERS.find(
        (m) => m.club_id === freeClubId && m.user_id === mockStudentId
      )
      expect(member?.status).toBe('member')
      expect(member?.joined_at).toBeDefined()

      // Verifies notification to student
      const approvalNotif = dispatchedNotifications.find((n) => n.type === 'clubs.join_approved')
      expect(approvalNotif).toBeDefined()
      expect(approvalNotif?.userId).toBe(mockStudentId)
    })

    it('prevents non-lead from approving join requests', async () => {
      await joinClubAction({ club_id: freeClubId })

      // Another student tries to approve
      currentAuthUserId = '00000000-0000-0000-0000-000000000098'
      const approveRes = await approveClubMemberAction({
        club_id: freeClubId,
        user_id: mockStudentId,
      })
      expect(approveRes.success).toBe(false)
      if (!approveRes.success) {
        expect(approveRes.error).toContain('Only the club lead')
      }
    })

    it('allows club lead to reject request with a reason', async () => {
      await joinClubAction({ club_id: freeClubId })

      currentAuthUserId = mockLeadId
      const rejectRes = await rejectClubMemberAction({
        club_id: freeClubId,
        user_id: mockStudentId,
        reason: 'Prerequisites not met',
      })
      expect(rejectRes.success).toBe(true)

      const member = MOCK_CLUB_MEMBERS.find(
        (m) => m.club_id === freeClubId && m.user_id === mockStudentId
      )
      expect(member?.status).toBe('rejected')

      const rejectNotif = dispatchedNotifications.find((n) => n.type === 'clubs.join_rejected')
      expect(rejectNotif).toBeDefined()
    })
  })

  describe('3. Paid Club Join & Initiate Payment', () => {
    it('sets initial status to "payment_pending" when requesting a paid club', async () => {
      const res = await joinClubAction({ club_id: paidClubId })
      expect(res.success).toBe(true)
      if (!res.success) return

      expect(res.data?.status).toBe('payment_pending')
      expect(res.data?.needs_payment).toBe(true)
      expect(res.data?.fee).toBe(200)
      expect(res.data?.order_id).toBeDefined()
    })

    it('initiates payment order and returns fee and order details', async () => {
      const res = await initiateClubPaymentAction({ club_id: paidClubId })
      expect(res.success).toBe(true)
      if (!res.success) return

      expect(res.data?.amount).toBe(200)
      expect(res.data?.currency).toBe('INR')
      expect(res.data?.order_id).toMatch(/^order_/)

      const member = MOCK_CLUB_MEMBERS.find(
        (m) => m.club_id === paidClubId && m.user_id === mockStudentId
      )
      expect(member?.status).toBe('payment_pending')
      expect(member?.payment_ref).toBe(res.data?.order_id)
    })
  })

  describe('4. Server-Side Payment Webhook & Idempotency', () => {
    it('activates membership ONLY upon verified server webhook (payment.captured)', async () => {
      // 1. Student requests paid club -> payment_pending
      const initRes = await initiateClubPaymentAction({ club_id: paidClubId })
      expect(initRes.success).toBe(true)
      const orderId = initRes.success && initRes.data ? initRes.data.order_id : ''

      const memberBefore = MOCK_CLUB_MEMBERS.find(
        (m) => m.club_id === paidClubId && m.user_id === mockStudentId
      )
      expect(memberBefore?.status).toBe('payment_pending')

      // 2. Razorpay webhook fires server-side
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_mock_001',
              order_id: orderId,
              amount: 20000,
              currency: 'INR',
              status: 'captured',
              notes: {
                club_id: paidClubId,
                user_id: mockStudentId,
              },
            },
          },
        },
      }

      const webhookRes = await verifyClubPaymentWebhookInternal(webhookPayload)
      expect(webhookRes.ok).toBe(true)
      expect(webhookRes.status).toBe('activated')

      // Verifies membership is now active
      const memberAfter = MOCK_CLUB_MEMBERS.find(
        (m) => m.club_id === paidClubId && m.user_id === mockStudentId
      )
      expect(memberAfter?.status).toBe('member')
      expect(memberAfter?.payment_ref).toBe('pay_rzp_mock_001')
      expect(memberAfter?.payment_verified_at).toBeDefined()

      // Verifies confirmation notification was sent
      const paymentNotif = dispatchedNotifications.find((n) => n.type === 'clubs.payment_confirmed')
      expect(paymentNotif).toBeDefined()
      expect(paymentNotif?.userId).toBe(mockStudentId)
    })

    it('enforces webhook idempotency on duplicate retry events', async () => {
      const orderId = `order_test_${Date.now()}`
      MOCK_CLUB_MEMBERS.push({
        id: crypto.randomUUID(),
        club_id: paidClubId,
        user_id: mockStudentId,
        status: 'payment_pending',
        payment_ref: orderId,
        payment_verified_at: null,
        joined_at: null,
        created_at: new Date().toISOString(),
      })

      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_idempotent_001',
              order_id: orderId,
              amount: 20000,
              currency: 'INR',
              status: 'captured',
              notes: { club_id: paidClubId, user_id: mockStudentId },
            },
          },
        },
      }

      // First webhook call -> activated
      const firstCall = await verifyClubPaymentWebhookInternal(webhookPayload)
      expect(firstCall.status).toBe('activated')

      const club = MOCK_CLUBS.find((c) => c.id === paidClubId)
      const countAfterFirst = club?.member_count || 0

      // Duplicate webhook call -> already_processed (no duplicate count increment)
      const secondCall = await verifyClubPaymentWebhookInternal(webhookPayload)
      expect(secondCall.status).toBe('already_processed')
      expect(secondCall.message).toContain('idempotent')
      expect(club?.member_count).toBe(countAfterFirst)
    })

    it('handles payment.failed webhook event and alerts student', async () => {
      const webhookPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_001',
              order_id: 'order_failed_001',
              amount: 20000,
              currency: 'INR',
              status: 'failed',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Card declined by issuing bank',
              notes: { club_id: paidClubId, user_id: mockStudentId },
            },
          },
        },
      }

      const res = await verifyClubPaymentWebhookInternal(webhookPayload)
      expect(res.ok).toBe(true)
      expect(res.status).toBe('payment_failed')

      const failedNotif = dispatchedNotifications.find((n) => n.type === 'clubs.payment_failed')
      expect(failedNotif).toBeDefined()
      expect(failedNotif?.userId).toBe(mockStudentId)
    })
  })

  describe('5. Webhook HTTP Route & Signature Verification (POST /api/webhooks/razorpay)', () => {
    it('rejects requests with invalid HMAC signature when secret is configured', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = 'super_secret_webhook_key'

      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123' } } },
      })

      const req = new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-razorpay-signature': 'invalid_forged_signature',
        },
        body: rawBody,
      })

      const response = await razorpayWebhookRoute(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Invalid webhook signature')

      delete process.env.RAZORPAY_WEBHOOK_SECRET
    })

    it('accepts and verifies genuine HMAC signature from payment provider', async () => {
      const secret = 'valid_test_secret_key'
      process.env.RAZORPAY_WEBHOOK_SECRET = secret

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_genuine_signature_test',
              order_id: 'order_genuine',
              amount: 20000,
              notes: { club_id: paidClubId, user_id: mockStudentId },
            },
          },
        },
      }

      const rawBody = JSON.stringify(payload)
      const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      const req = new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-razorpay-signature': validSignature,
        },
        body: rawBody,
      })

      const response = await razorpayWebhookRoute(req)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.received).toBe(true)

      delete process.env.RAZORPAY_WEBHOOK_SECRET
    })
  })
})
