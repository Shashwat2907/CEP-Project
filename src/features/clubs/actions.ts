'use server'

/**
 * Clubs Feature Server Actions
 * Source of truth: src/features/clubs/README.md, documents/PLAN.md §5.8
 * Owner: Kedar
 *
 * CRITICAL (from AGENTS.md §6): Membership activates ONLY from a verified
 * server-side webhook for paid clubs. Client-redirect must NEVER grant membership.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { isSupabaseOnline } from '@/lib/supabase/status'
import {
  JoinClubSchema,
  LeaveClubSchema,
  ApproveClubMemberSchema,
  RejectClubMemberSchema,
  PostClubNoticeSchema,
  DeleteClubNoticeSchema,
} from './schema'
import {
  MOCK_CLUBS,
  MOCK_CLUB_MEMBERS,
  MOCK_CLUB_NOTICES,
} from './mock-clubs-data'
import type { ClubMember } from './schema'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// ── Join Club ───────────────────────────────────────────────────────────────

/**
 * Sends a join request for a club.
 * Free clubs: status = 'requested' (lead approves).
 * Paid clubs: status = 'requested', then caller should redirect to payment.
 * Membership is NEVER granted here — only via webhook or lead approval.
 */
export async function joinClubAction(rawInput: { club_id: string }): Promise<ActionResult<{ status: string; club_name: string; needs_payment: boolean; fee: number }>> {
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
        .select('id, name, fee, active')
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
        .select('status')
        .eq('club_id', club_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        return { success: false, error: `You have already ${existing.status === 'member' ? 'joined' : `requested to join`} this club.` }
      }

      const { error: insertErr } = await supabase
        .from('club_members')
        .insert({
          club_id,
          user_id: user.id,
          status: 'requested',
          created_at: now,
        })

      if (insertErr) {
        throw new Error(insertErr.message)
      }

      revalidatePath('/clubs')
      revalidatePath(`/clubs/${club_id}`)
      return {
        success: true,
        data: {
          status: 'requested',
          club_name: club.name,
          needs_payment: club.fee > 0,
          fee: club.fee,
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
    return {
      success: false,
      error: `You have already ${existing.status === 'member' ? 'joined' : 'requested to join'} this club.`,
    }
  }

  const newMember: ClubMember = {
    id: crypto.randomUUID(),
    club_id,
    user_id: user.id,
    status: 'requested',
    payment_ref: null,
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
  club.member_count += 1

  revalidatePath('/clubs')
  revalidatePath(`/clubs/${club_id}`)
  return {
    success: true,
    data: {
      status: 'requested',
      club_name: club.name,
      needs_payment: club.fee > 0,
      fee: club.fee,
    },
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
      await supabase.rpc('decrement_club_member_count', { _club_id: club_id }).catch(() => {})

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
        .select('lead_id')
        .eq('id', club_id)
        .single()

      if (!club || club.lead_id !== user.id) {
        return { success: false, error: 'Only the club lead can approve members.' }
      }

      await supabase
        .from('club_members')
        .update({ status: 'member', joined_at: new Date().toISOString() })
        .eq('club_id', club_id)
        .eq('user_id', user_id)

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
  member.joined_at = new Date().toISOString()

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

  const { club_id, user_id } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: club } = await supabase
        .from('clubs')
        .select('lead_id')
        .eq('id', club_id)
        .single()

      if (!club || club.lead_id !== user.id) {
        return { success: false, error: 'Only the club lead can reject members.' }
      }

      await supabase
        .from('club_members')
        .update({ status: 'rejected' })
        .eq('club_id', club_id)
        .eq('user_id', user_id)

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
        .select('lead_id')
        .eq('id', club_id)
        .single()

      if (!club || club.lead_id !== user.id) {
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

      const lead_id = (notice.club as { lead_id: string } | null)?.lead_id
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
