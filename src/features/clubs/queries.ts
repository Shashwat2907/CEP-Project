/**
 * Clubs Feature Queries
 * Source of truth: src/features/clubs/README.md, documents/PLAN.md §5.8
 * Owner: Kedar
 *
 * Pattern: Supabase-first; fallback to MOCK_* when offline or table missing.
 */

import { requireAuth } from '@/shared/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseOnline } from '@/lib/supabase/status'
import {
  MOCK_CLUBS,
  MOCK_CLUB_MEMBERS,
  MOCK_CLUB_NOTICES,
} from './mock-clubs-data'
import type { Club, ClubMember, ClubNotice } from './schema'

// ── Directory ───────────────────────────────────────────────────────────────

export interface GetClubsOptions {
  search?: string
  freeOnly?: boolean
  myOnly?: boolean
}

export async function getClubs(options?: GetClubsOptions): Promise<Club[]> {
  const { user } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('clubs')
        .select(`
          *,
          members:club_members(user_id, status),
          lead:profiles!clubs_lead_id_fkey(full_name, college_id, role_primary)
        `)
        .eq('active', true)
        .order('name', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((c) => {
          const userMembership = c.members?.find(
            (m: { user_id: string; status: string }) => m.user_id === user.id
          )
          return {
            ...c,
            lead: c.lead,
            user_status: userMembership?.status ?? null,
          } as Club
        })
      }
    } catch {
      // Offline or table missing
    }
  }

  // Fallback: MOCK_CLUBS
  let list = MOCK_CLUBS.filter((c) => c.active)

  list = list.map((c) => {
    const membership = MOCK_CLUB_MEMBERS.find(
      (m) => m.club_id === c.id && m.user_id === user.id
    )
    return { ...c, user_status: membership?.status ?? null }
  })

  if (options?.freeOnly) list = list.filter((c) => c.fee === 0)
  if (options?.myOnly) {
    list = list.filter((c) => c.user_status === 'member')
  }
  if (options?.search) {
    const q = options.search.toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.tagline && c.tagline.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }

  return list
}

// ── Single Club ─────────────────────────────────────────────────────────────

export async function getClubById(id: string): Promise<Club | null> {
  const { user } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('clubs')
        .select(`
          *,
          members:club_members(user_id, status),
          lead:profiles!clubs_lead_id_fkey(full_name, college_id, role_primary)
        `)
        .eq('id', id)
        .single()

      if (!error && data) {
        const userMembership = data.members?.find(
          (m: { user_id: string; status: string }) => m.user_id === user.id
        )
        return {
          ...data,
          user_status: userMembership?.status ?? null,
        } as Club
      }
    } catch {
      // Offline or table missing
    }
  }

  const found = MOCK_CLUBS.find((c) => c.id === id)
  if (!found) return null

  const membership = MOCK_CLUB_MEMBERS.find(
    (m) => m.club_id === id && m.user_id === user.id
  )
  return { ...found, user_status: membership?.status ?? null }
}

// ── Club Members ─────────────────────────────────────────────────────────────

export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('club_members')
        .select(`
          *,
          user:profiles(full_name, college_id, role_primary)
        `)
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as ClubMember[]
      }
    } catch {
      // Offline
    }
  }

  return MOCK_CLUB_MEMBERS.filter((m) => m.club_id === clubId)
}

// ── Pending Requests (for lead dashboard) ─────────────────────────────────

export async function getPendingClubRequests(clubId: string): Promise<ClubMember[]> {
  await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('club_members')
        .select(`
          *,
          user:profiles(full_name, college_id, role_primary)
        `)
        .eq('club_id', clubId)
        .eq('status', 'requested')
        .order('created_at', { ascending: true })

      if (!error && Array.isArray(data)) {
        return data as ClubMember[]
      }
    } catch {
      // Offline
    }
  }

  return MOCK_CLUB_MEMBERS.filter(
    (m) => m.club_id === clubId && m.status === 'requested'
  )
}

// ── Club Notices ──────────────────────────────────────────────────────────

export async function getClubNotices(clubId: string): Promise<ClubNotice[]> {
  await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('club_notices')
        .select(`
          *,
          author:profiles(full_name, college_id, role_primary)
        `)
        .eq('club_id', clubId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as ClubNotice[]
      }
    } catch {
      // Offline
    }
  }

  return MOCK_CLUB_NOTICES.filter((n) => n.club_id === clubId).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

// ── My Clubs ─────────────────────────────────────────────────────────────

export async function getMyClubs(): Promise<Club[]> {
  const { user } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('club_members')
        .select(`
          club:clubs(*, lead:profiles!clubs_lead_id_fkey(full_name, college_id, role_primary)),
          status
        `)
        .eq('user_id', user.id)
        .eq('status', 'member')

      if (!error && Array.isArray(data)) {
        return data
          .filter((row) => row.club)
          .map((row) => ({
            ...(row.club as Club),
            user_status: 'member' as const,
          }))
      }
    } catch {
      // Offline
    }
  }

  const myMemberships = MOCK_CLUB_MEMBERS.filter(
    (m) => m.user_id === user.id && m.status === 'member'
  )

  return myMemberships
    .map((m) => MOCK_CLUBS.find((c) => c.id === m.club_id))
    .filter((c): c is Club => Boolean(c))
    .map((c) => ({ ...c, user_status: 'member' as const }))
}
