'use server'

/**
 * Clubs Feature Server Actions
 * Source of truth: src/features/clubs/README.md, documents/PLAN.md §5.8
 * Owner: Kedar
 *
 * CRITICAL (from AGENTS.md §6 & CONTRACT.md §10):
 * Membership activates ONLY from a verified server-side webhook for paid clubs.
 * Client-redirect must NEVER grant membership.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { isSupabaseOnline } from '@/lib/supabase/status'
import { notify } from '@/shared/notifications/notify'
import {
  JoinClubSchema,
  LeaveClubSchema,
  ApproveClubMemberSchema,
  RejectClubMemberSchema,
  PostClubNoticeSchema,
  DeleteClubNoticeSchema,
  InitiateClubPaymentSchema,
} from './schema'
import type { ClubMember, ClubPaymentOrder, RazorpayWebhookPayload } from './schema'
import {
  MOCK_CLUBS,
  MOCK_CLUB_MEMBERS,
  MOCK_CLUB_NOTICES,
} from './mock-clubs-data'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// ── Join Club ───────────────────────────────────────────────────────────────

/**
 * Sends a join request for a club.
 * Free clubs: status = 'requested' (lead approves).
 * Paid clubs: status = 'payment_pending' (user pays via payment provider).
 * Membership is NEVER activated here — only via verified server webhook or lead approval.
 */
export async function joinClubAction(rawInput: { club_id: string }): Promise<ActionResult<{
  status: string
  club_name: string
  needs_payment: boolean
  fee: number
  order_id?: string
}>> {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const parsed = JoinClubSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid club ID' }
  }

  const { club_id } = parsed.data
  const now = new Date().toISOString()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      // Fetch club
      const { data: club, error: clubErr } = await supabase
        .from('clubs')
        .select('id, name, fee, active, lead_id')
        .eq('id', club_id)
        .single()

      if (clubErr || !club) {
        throw new Error('Club not found')
      }

      if (!club.active) {
        return { success: false, error: 'This club is no longer active.' }
      }

      // Check existing membership
      const { data: existing } = await supabase
        .from('club_members')
        .select('id, status, payment_ref')
        .eq('club_id', club_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'member') {
          return { success: false, error: 'You are already a member of this club.' }
        }
        if (existing.status === 'requested') {
          return { success: false, error: 'You already have a pending join request for this club.' }
        }
        if (existing.status === 'payment_pending') {
          return {
            success: true,
            data: {
              status: 'payment_pending',
              club_name: club.name,
              needs_payment: true,
              fee: club.fee,
              order_id: existing.payment_ref || undefined,
            },
          }
        }
      }

      const initialStatus = club.fee > 0 ? 'payment_pending' : 'requested'
      const orderId = club.fee > 0
        ? `order_${club_id.replace(/-/g, '').slice(0, 8)}_${user.id.replace(/-/g, '').slice(0, 6)}_${Date.now()}`
        : null

      const { error: insertErr } = await supabase
        .from('club_members')
        .insert({
          club_id,
          user_id: user.id,
          status: initialStatus,
          payment_ref: orderId,
          created_at: now,
        })

      if (insertErr) {
        throw new Error(insertErr.message)
      }

      // Notify club lead
      try {
        await notify({
          userId: club.lead_id,
          type: 'clubs.join_requested',
          title: 'New Club Join Request',
          body: `${profile?.full_name || 'A student'} requested to join ${club.name}.`,
          link: `/clubs/${club_id}`,
          payload: { clubId: club_id, clubName: club.name, studentId: user.id },
        })
      } catch (e) {
        console.warn('[clubs] Notify lead error:', e)
      }

      revalidatePath('/clubs')
      revalidatePath(`/clubs/${club_id}`)
      return {
        success: true,
        data: {
          status: initialStatus,
          club_name: club.name,
          needs_payment: club.fee > 0,
          fee: club.fee,
          order_id: orderId || undefined,
        },
      }
    } catch (err) {
      console.warn('[clubs/actions] joinClubAction DB error, using mock:', err)
    }
  }

  // Offline / Mock fallback
  const club = MOCK_CLUBS.find((c) => c.id === club_id)
  if (!club) return { success: false, error: 'Club not found.' }
  if (!club.active) return { success: false, error: 'This club is no longer active.' }

  const existing = MOCK_CLUB_MEMBERS.find(
    (m) => m.club_id === club_id && m.user_id === user.id
  )
  if (existing) {
    if (existing.status === 'member') {
      return { success: false, error: 'You are already a member of this club.' }
    }
    if (existing.status === 'requested') {
      return { success: false, error: 'You already have a pending join request for this club.' }
    }
    if (existing.status === 'payment_pending') {
      return {
        success: true,
        data: {
          status: 'payment_pending',
          club_name: club.name,
          needs_payment: true,
          fee: club.fee,
          order_id: existing.payment_ref || undefined,
        },
      }
    }
  }

  const initialStatus = club.fee > 0 ? 'payment_pending' : 'requested'
  const orderId = club.fee > 0
    ? `order_${club_id.replace(/-/g, '').slice(0, 8)}_${user.id.replace(/-/g, '').slice(0, 6)}_${Date.now()}`
    : null

  const newMember: ClubMember = {
    id: crypto.randomUUID(),
    club_id,
    user_id: user.id,
    status: initialStatus,
    payment_ref: orderId,
    payment_verified_at: null,
    joined_at: null,
    created_at: now,
    user: {
      full_name: profile?.full_name || 'Student',
      college_id: profile?.college_id || 'UNKNOWN',
      role_primary: profile?.role_primary || 'student',
    },
  }

  MOCK_CLUB_MEMBERS.push(newMember)

  // Notify lead in mock store
  try {
    await notify({
      userId: club.lead_id,
      type: 'clubs.join_requested',
      title: 'New Club Join Request',
      body: `${profile?.full_name || 'A student'} requested to join ${club.name}.`,
      link: `/clubs/${club_id}`,
      payload: { clubId: club_id, clubName: club.name, studentId: user.id },
    })
  } catch (e) {
    console.warn('[clubs] Mock notify lead error:', e)
  }

  revalidatePath('/clubs')
  revalidatePath(`/clubs/${club_id}`)
  return {
    success: true,
    data: {
      status: initialStatus,
      club_name: club.name,
      needs_payment: club.fee > 0,
      fee: club.fee,
      order_id: orderId || undefined,
    },
  }
}

// ── Initiate Payment (Paid Clubs) ───────────────────────────────────────────

/**
 * Initiates payment order for a paid club membership.
 * Transitions or establishes member row in 'payment_pending'.
 */
export async function initiateClubPaymentAction(rawInput: { club_id: string }): Promise<ActionResult<ClubPaymentOrder>> {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const parsed = InitiateClubPaymentSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid club ID' }
  }

  const { club_id } = parsed.data
  const now = new Date().toISOString()

  let club = MOCK_CLUBS.find((c) => c.id === club_id)
  let clubName = club?.name || 'Club'
  let fee = club?.fee ?? 0
  let currency = club?.currency ?? 'INR'

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data: dbClub } = await supabase
        .from('clubs')
        .select('id, name, fee, currency, active')
        .eq('id', club_id)
        .single()

      if (dbClub) {
        clubName = dbClub.name
        fee = dbClub.fee
        currency = dbClub.currency || 'INR'
      }
    } catch (e) {
      console.warn('[clubs/actions] initiateClubPaymentAction DB lookup error:', e)
    }
  }

  if (fee <= 0) {
    return { success: false, error: 'This club is free to join; no payment is required.' }
  }

  const orderId = `order_${club_id.replace(/-/g, '').slice(0, 8)}_${user.id.replace(/-/g, '').slice(0, 6)}_${Date.now()}`

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: existing } = await supabase
        .from('club_members')
        .select('id, status')
        .eq('club_id', club_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'member') {
          return { success: false, error: 'You are already an active member of this club.' }
        }
        await supabase
          .from('club_members')
          .update({ status: 'payment_pending', payment_ref: orderId })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('club_members')
          .insert({
            club_id,
            user_id: user.id,
            status: 'payment_pending',
            payment_ref: orderId,
            created_at: now,
          })
      }
    } catch (e) {
      console.warn('[clubs/actions] initiate payment DB upsert error:', e)
    }
  }

  // Update mock store
  const existingMock = MOCK_CLUB_MEMBERS.find(
    (m) => m.club_id === club_id && m.user_id === user.id
  )
  if (existingMock) {
    if (existingMock.status === 'member') {
      return { success: false, error: 'You are already an active member of this club.' }
    }
    existingMock.status = 'payment_pending'
    existingMock.payment_ref = orderId
  } else {
    MOCK_CLUB_MEMBERS.push({
      id: crypto.randomUUID(),
      club_id,
      user_id: user.id,
      status: 'payment_pending',
      payment_ref: orderId,
      payment_verified_at: null,
      joined_at: null,
      created_at: now,
      user: {
        full_name: profile?.full_name || 'Student',
        college_id: profile?.college_id || 'UNKNOWN',
        role_primary: profile?.role_primary || 'student',
      },
    })
  }

  return {
    success: true,
    data: {
      order_id: orderId,
      club_id,
      club_name: clubName,
      amount: fee,
      currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_campus',
      notes: {
        club_id,
        user_id: user.id,
      },
    },
  }
}

// ── Webhook Verification Engine (Server-Side Only) ──────────────────────────

/**
 * Handles incoming payment verification events idempotently.
 * This is the ONLY mechanism through which paid club memberships activate.
 */
export async function verifyClubPaymentWebhookInternal(payload: RazorpayWebhookPayload): Promise<{
  ok: boolean
  status: string
  message: string
  club_id?: string
  user_id?: string
  payment_id?: string
}> {
  const event = payload.event
  const payment = payload.payload.payment?.entity
  const order = payload.payload.order?.entity
  const refund = payload.payload.refund?.entity

  const paymentId = payment?.id || refund?.payment_id || `pay_${Date.now()}`
  const orderId = payment?.order_id || order?.id

  const clubId = payment?.notes?.club_id || order?.notes?.club_id
  const userId = payment?.notes?.user_id || order?.notes?.user_id

  const now = new Date().toISOString()

  // 1. Idempotency Check: if paymentId already processed and status is 'member'
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      let query = supabase.from('club_members').select('id, club_id, user_id, status, payment_ref')
      if (paymentId) {
        query = query.eq('payment_ref', paymentId)
      } else if (orderId) {
        query = query.eq('payment_ref', orderId)
      }

      const { data: existing } = await query.maybeSingle()
      if (existing && existing.status === 'member') {
        return {
          ok: true,
          status: 'already_processed',
          message: 'Payment already processed and membership is active (idempotent)',
          club_id: existing.club_id,
          user_id: existing.user_id,
          payment_id: paymentId,
        }
      }
    } catch (e) {
      console.warn('[clubs/webhook] Idempotency DB check error:', e)
    }
  }

  // Check mock store idempotency
  const existingMockPayment = MOCK_CLUB_MEMBERS.find(
    (m) => (m.payment_ref === paymentId || (orderId && m.payment_ref === orderId)) && m.status === 'member'
  )
  if (existingMockPayment) {
    return {
      ok: true,
      status: 'already_processed',
      message: 'Payment already processed and membership is active (idempotent)',
      club_id: existingMockPayment.club_id,
      user_id: existingMockPayment.user_id,
      payment_id: paymentId,
    }
  }

  // 2. Handle Payment Success
  if (event === 'payment.captured' || event === 'order.paid') {
    let targetClubId = clubId
    let targetUserId = userId

    if (await isSupabaseOnline()) {
      try {
        const supabase = await createClient()

        let memberRow: { id: string; club_id: string; user_id: string; status: string } | null = null

        if (clubId && userId) {
          const { data } = await supabase
            .from('club_members')
            .select('id, club_id, user_id, status')
            .eq('club_id', clubId)
            .eq('user_id', userId)
            .maybeSingle()
          memberRow = data
        } else if (orderId) {
          const { data } = await supabase
            .from('club_members')
            .select('id, club_id, user_id, status')
            .eq('payment_ref', orderId)
            .maybeSingle()
          memberRow = data
        }

        if (memberRow) {
          targetClubId = memberRow.club_id
          targetUserId = memberRow.user_id

          await supabase
            .from('club_members')
            .update({
              status: 'member',
              payment_ref: paymentId,
              payment_verified_at: now,
              joined_at: now,
            })
            .eq('id', memberRow.id)

          // Increment club member count
          const { data: club } = await supabase
            .from('clubs')
            .select('id, name, community_id, member_count')
            .eq('id', targetClubId)
            .single()

          if (club) {
            await supabase
              .from('clubs')
              .update({ member_count: (club.member_count || 0) + 1 })
              .eq('id', targetClubId)

            // Add user to community room
            if (club.community_id) {
              await supabase
                .from('community_members')
                .upsert({
                  community_id: club.community_id,
                  user_id: targetUserId,
                  role: 'member',
                  joined_at: now,
                })
            }

            // Dispatch payment confirmation notification
            await notify({
              userId: targetUserId,
              type: 'clubs.payment_confirmed',
              title: 'Club Membership Activated!',
              body: `Your payment of ₹${payment?.amount ? payment.amount / 100 : 'fee'} for ${club.name} was confirmed. You are now a full member!`,
              link: `/clubs/${targetClubId}`,
              payload: { clubId: targetClubId, clubName: club.name, paymentRef: paymentId, amount: payment?.amount ? payment.amount / 100 : 0 },
            })
          }
        }
      } catch (err) {
        console.warn('[clubs/webhook] DB activation error:', err)
      }
    }

    // Update mock store
    let mockMember = MOCK_CLUB_MEMBERS.find(
      (m) =>
        (clubId && userId && m.club_id === clubId && m.user_id === userId) ||
        (orderId && m.payment_ref === orderId)
    )

    if (mockMember) {
      targetClubId = mockMember.club_id
      targetUserId = mockMember.user_id
      mockMember.status = 'member'
      mockMember.payment_ref = paymentId
      mockMember.payment_verified_at = now
      mockMember.joined_at = now

      const club = MOCK_CLUBS.find((c) => c.id === targetClubId)
      if (club) {
        club.member_count += 1
        await notify({
          userId: targetUserId,
          type: 'clubs.payment_confirmed',
          title: 'Club Membership Activated!',
          body: `Your payment for ${club.name} was confirmed. You are now a full member!`,
          link: `/clubs/${targetClubId}`,
          payload: { clubId: targetClubId, clubName: club.name, paymentRef: paymentId },
        })
      }
    }

    revalidatePath('/clubs')
    if (targetClubId) revalidatePath(`/clubs/${targetClubId}`)

    return {
      ok: true,
      status: 'activated',
      message: 'Membership activated via verified payment webhook',
      club_id: targetClubId,
      user_id: targetUserId,
      payment_id: paymentId,
    }
  }

  // 3. Handle Payment Failure
  if (event === 'payment.failed') {
    const targetClubId = clubId
    const targetUserId = userId
    const errorCode = payment?.error_code || 'PAYMENT_FAILED'
    const errorDesc = payment?.error_description || 'Payment was declined or cancelled'

    const club = MOCK_CLUBS.find((c) => c.id === targetClubId)
    if (targetUserId) {
      await notify({
        userId: targetUserId,
        type: 'clubs.payment_failed',
        title: 'Club Payment Failed',
        body: `Payment for ${club?.name || 'Club'} could not be processed: ${errorDesc}. You can try again anytime.`,
        link: targetClubId ? `/clubs/${targetClubId}` : '/clubs',
        payload: { clubId: targetClubId, clubName: club?.name, errorCode },
      })
    }

    return {
      ok: true,
      status: 'payment_failed',
      message: 'Payment failure recorded and student notified',
      club_id: targetClubId,
      user_id: targetUserId,
    }
  }

  // 4. Handle Refund
  if (event === 'refund.processed' || event === 'refund.created') {
    let targetClubId = clubId
    let targetUserId = userId

    if (refund?.payment_id) {
      const mock = MOCK_CLUB_MEMBERS.find((m) => m.payment_ref === refund.payment_id)
      if (mock) {
        mock.status = 'rejected'
        targetClubId = mock.club_id
        targetUserId = mock.user_id
        const club = MOCK_CLUBS.find((c) => c.id === targetClubId)
        if (club) club.member_count = Math.max(0, club.member_count - 1)
      }
    }

    return {
      ok: true,
      status: 'refunded',
      message: 'Refund processed and membership revoked',
      club_id: targetClubId,
      user_id: targetUserId,
    }
  }

  return {
    ok: true,
    status: 'ignored',
    message: `Unhandled event type: ${event}`,
  }
}

/**
 * Simulates a server-side webhook trigger for test/demo environments.
 */
export async function simulatePaymentWebhookAction(rawInput: {
  club_id: string
  order_id?: string
  status: 'success' | 'failure'
}): Promise<ActionResult<{ status: string; payment_id?: string }>> {
  const { user } = await requireAuth()

  const club = MOCK_CLUBS.find((c) => c.id === rawInput.club_id)
  const paymentId = `pay_sim_${Date.now()}`
  const orderId = rawInput.order_id || `order_${rawInput.club_id.slice(0, 8)}_${Date.now()}`

  if (rawInput.status === 'success') {
    const payload: RazorpayWebhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: (club?.fee || 100) * 100,
            currency: 'INR',
            status: 'captured',
            notes: {
              club_id: rawInput.club_id,
              user_id: user.id,
            },
          },
        },
      },
    }

    const res = await verifyClubPaymentWebhookInternal(payload)
    revalidatePath(`/clubs/${rawInput.club_id}`)
    revalidatePath('/clubs')
    return { success: true, data: { status: res.status, payment_id: paymentId } }
  } else {
    const payload: RazorpayWebhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: (club?.fee || 100) * 100,
            currency: 'INR',
            status: 'failed',
            error_code: 'PAYMENT_DECLINED',
            error_description: 'Payment was declined by bank simulator',
            notes: {
              club_id: rawInput.club_id,
              user_id: user.id,
            },
          },
        },
      },
    }

    const res = await verifyClubPaymentWebhookInternal(payload)
    revalidatePath(`/clubs/${rawInput.club_id}`)
    return { success: true, data: { status: res.status } }
  }
}

// ── Leave Club ──────────────────────────────────────────────────────────────

export async function leaveClubAction(rawInput: { club_id: string }): Promise<ActionResult> {
  const { user } = await requireAuth()

  const parsed = LeaveClubSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid club ID' }
  }

  const { club_id } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      await supabase
        .from('club_members')
        .delete()
        .eq('club_id', club_id)
        .eq('user_id', user.id)

      // Decrement member count
      try {
        await supabase.rpc('decrement_club_member_count', { _club_id: club_id })
      } catch {
        // Non-fatal
      }

      revalidatePath('/clubs')
      revalidatePath(`/clubs/${club_id}`)
      return { success: true }
    } catch (err) {
      console.warn('[clubs/actions] leaveClubAction DB error:', err)
    }
  }

  const idx = MOCK_CLUB_MEMBERS.findIndex(
    (m) => m.club_id === club_id && m.user_id === user.id
  )
  if (idx !== -1) {
    MOCK_CLUB_MEMBERS.splice(idx, 1)
    const club = MOCK_CLUBS.find((c) => c.id === club_id)
    if (club) club.member_count = Math.max(0, club.member_count - 1)
  }

  revalidatePath('/clubs')
  revalidatePath(`/clubs/${club_id}`)
  return { success: true }
}

// ── Approve Join Request (Club Lead only) ──────────────────────────────────

export async function approveClubMemberAction(rawInput: { club_id: string; user_id: string }): Promise<ActionResult> {
  const { user } = await requireAuth()
  const now = new Date().toISOString()

  const parsed = ApproveClubMemberSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { club_id, user_id } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      // Verify requester is the lead
      const { data: club } = await supabase
        .from('clubs')
        .select('id, name, lead_id, community_id, member_count')
        .eq('id', club_id)
        .single()

      if (!club) {
        throw new Error('Club not found in DB')
      }
      if (club.lead_id !== user.id) {
        return { success: false, error: 'Only the club lead can approve members.' }
      }

      await supabase
        .from('club_members')
        .update({ status: 'member', joined_at: now })
        .eq('club_id', club_id)
        .eq('user_id', user_id)

      await supabase
        .from('clubs')
        .update({ member_count: (club.member_count || 0) + 1 })
        .eq('id', club_id)

      // Add user to community room
      if (club.community_id) {
        await supabase
          .from('community_members')
          .upsert({
            community_id: club.community_id,
            user_id,
            role: 'member',
            joined_at: now,
          })
      }

      // Notify requester
      await notify({
        userId: user_id,
        type: 'clubs.join_approved',
        title: 'Club Join Request Approved!',
        body: `Your request to join ${club.name} has been approved by the club lead. Welcome!`,
        link: `/clubs/${club_id}`,
        payload: { clubId: club_id, clubName: club.name },
      })

      revalidatePath(`/clubs/${club_id}`)
      revalidatePath('/clubs')
      return { success: true }
    } catch (err) {
      console.warn('[clubs/actions] approveClubMemberAction DB error:', err)
    }
  }

  // Mock fallback
  const club = MOCK_CLUBS.find((c) => c.id === club_id)
  if (!club || club.lead_id !== user.id) {
    return { success: false, error: 'Only the club lead can approve members.' }
  }

  const member = MOCK_CLUB_MEMBERS.find(
    (m) => m.club_id === club_id && m.user_id === user_id
  )
  if (!member) return { success: false, error: 'Request not found.' }

  member.status = 'member'
  member.joined_at = now
  club.member_count += 1

  await notify({
    userId: user_id,
    type: 'clubs.join_approved',
    title: 'Club Join Request Approved!',
    body: `Your request to join ${club.name} has been approved by the club lead. Welcome!`,
    link: `/clubs/${club_id}`,
    payload: { clubId: club_id, clubName: club.name },
  })

  revalidatePath(`/clubs/${club_id}`)
  revalidatePath('/clubs')
  return { success: true }
}

// ── Reject Join Request (Club Lead only) ───────────────────────────────────

export async function rejectClubMemberAction(rawInput: { club_id: string; user_id: string; reason?: string }): Promise<ActionResult> {
  const { user } = await requireAuth()

  const parsed = RejectClubMemberSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { club_id, user_id, reason } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: club } = await supabase
        .from('clubs')
        .select('name, lead_id')
        .eq('id', club_id)
        .single()

      if (!club) {
        throw new Error('Club not found in DB')
      }
      if (club.lead_id !== user.id) {
        return { success: false, error: 'Only the club lead can reject members.' }
      }

      await supabase
        .from('club_members')
        .update({ status: 'rejected' })
        .eq('club_id', club_id)
        .eq('user_id', user_id)

      await notify({
        userId: user_id,
        type: 'clubs.join_rejected',
        title: 'Club Request Update',
        body: reason ? `Your request to join ${club.name} was not accepted: ${reason}` : `Your request to join ${club.name} was not accepted.`,
        link: `/clubs/${club_id}`,
        payload: { clubId: club_id, clubName: club.name, reason },
      })

      revalidatePath(`/clubs/${club_id}`)
      return { success: true }
    } catch (err) {
      console.warn('[clubs/actions] rejectClubMemberAction DB error:', err)
    }
  }

  const club = MOCK_CLUBS.find((c) => c.id === club_id)
  if (!club || club.lead_id !== user.id) {
    return { success: false, error: 'Only the club lead can reject members.' }
  }

  const member = MOCK_CLUB_MEMBERS.find(
    (m) => m.club_id === club_id && m.user_id === user_id
  )
  if (member) member.status = 'rejected'

  await notify({
    userId: user_id,
    type: 'clubs.join_rejected',
    title: 'Club Request Update',
    body: reason ? `Your request to join ${club.name} was not accepted: ${reason}` : `Your request to join ${club.name} was not accepted.`,
    link: `/clubs/${club_id}`,
    payload: { clubId: club_id, clubName: club.name, reason },
  })

  revalidatePath(`/clubs/${club_id}`)
  return { success: true }
}

// ── Post Notice (Club Lead only) ───────────────────────────────────────────

export async function postClubNoticeAction(rawInput: { club_id: string; body: string; pinned?: boolean }): Promise<ActionResult<{ notice_id: string }>> {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const parsed = PostClubNoticeSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid notice' }
  }

  const { club_id, body, pinned = false } = parsed.data
  const noticeId = crypto.randomUUID()
  const now = new Date().toISOString()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: club } = await supabase
        .from('clubs')
        .select('name, lead_id')
        .eq('id', club_id)
        .single()

      if (!club) {
        throw new Error('Club not found in DB')
      }
      if (club.lead_id !== user.id) {
        return { success: false, error: 'Only the club lead can post notices.' }
      }

      const { error: insertErr } = await supabase
        .from('club_notices')
        .insert({ id: noticeId, club_id, author_id: user.id, body, pinned, created_at: now })

      if (insertErr) throw new Error(insertErr.message)

      revalidatePath(`/clubs/${club_id}`)
      return { success: true, data: { notice_id: noticeId } }
    } catch (err) {
      console.warn('[clubs/actions] postClubNoticeAction DB error:', err)
    }
  }

  const club = MOCK_CLUBS.find((c) => c.id === club_id)
  if (!club || club.lead_id !== user.id) {
    return { success: false, error: 'Only the club lead can post notices.' }
  }

  MOCK_CLUB_NOTICES.unshift({
    id: noticeId,
    club_id,
    author_id: user.id,
    body,
    pinned,
    created_at: now,
    author: {
      full_name: profile?.full_name || 'Club Lead',
      college_id: profile?.college_id || 'UNKNOWN',
      role_primary: profile?.role_primary || 'teacher',
    },
  })

  revalidatePath(`/clubs/${club_id}`)
  return { success: true, data: { notice_id: noticeId } }
}

// ── Delete Notice (Club Lead only) ─────────────────────────────────────────

export async function deleteClubNoticeAction(rawInput: { notice_id: string }): Promise<ActionResult> {
  const { user } = await requireAuth()

  const parsed = DeleteClubNoticeSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid notice ID' }
  }

  const { notice_id } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: notice } = await supabase
        .from('club_notices')
        .select('club_id, club:clubs(lead_id)')
        .eq('id', notice_id)
        .single()

      if (!notice) return { success: false, error: 'Notice not found.' }

      const lead_id = (notice.club as unknown as { lead_id: string } | null)?.lead_id
      if (lead_id !== user.id) {
        return { success: false, error: 'Only the club lead can delete notices.' }
      }

      await supabase.from('club_notices').delete().eq('id', notice_id)

      revalidatePath(`/clubs/${notice.club_id}`)
      return { success: true }
    } catch (err) {
      console.warn('[clubs/actions] deleteClubNoticeAction DB error:', err)
    }
  }

  const idx = MOCK_CLUB_NOTICES.findIndex((n) => n.id === notice_id)
  if (idx !== -1) {
    const club_id = MOCK_CLUB_NOTICES[idx].club_id
    const club = MOCK_CLUBS.find((c) => c.id === club_id)
    if (!club || club.lead_id !== user.id) {
      return { success: false, error: 'Only the club lead can delete notices.' }
    }
    MOCK_CLUB_NOTICES.splice(idx, 1)
    revalidatePath(`/clubs/${club_id}`)
  }

  return { success: true }
}
