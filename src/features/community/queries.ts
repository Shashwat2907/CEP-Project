/**
 * Community Queries
 * Source of truth: src/features/community/README.md, documents/PLAN.md §5.7
 */

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/shared/auth/guards'
import { isSupabaseOnline } from '@/lib/supabase/status'
import type {
  Community,
  CommunityKind,
  CommunityMember,
  CommunityMessage,
  CommunityTagType,
} from './schema'
import {
  MOCK_COMMUNITIES,
  MOCK_COMMUNITY_MEMBERS,
  MOCK_COMMUNITY_MESSAGES,
  MOCK_COMMUNITY_TAGS,
  MOCK_MESSAGE_VOTES,
} from './mock-community-data'

export interface GetCommunitiesOptions {
  kind?: CommunityKind
  search?: string
  myOnly?: boolean
}

/**
 * Returns filtered communities with membership flag for the current user.
 */
export async function getCommunities(
  options?: GetCommunitiesOptions
): Promise<Community[]> {
  const { user } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      let query = supabase.from('communities').select(`
        *,
        members:community_members(user_id, role)
      `)

      if (options?.kind) {
        query = query.eq('kind', options.kind)
      }

      if (options?.search) {
        query = query.ilike('name', `%${options.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        const mapped = data.map((c) => {
          const membership = c.members?.find((m: { user_id: string; role: string }) => m.user_id === user.id)
          return {
            ...c,
            is_member: Boolean(membership),
            user_role: membership?.role,
          } as Community
        })

        if (options?.myOnly) {
          return mapped.filter((c) => c.is_member)
        }
        return mapped
      }
    } catch {
      // Fall through to mock store
    }
  }

  // Offline / Mock Data
  let list = MOCK_COMMUNITIES.map((c) => {
    const mem = MOCK_COMMUNITY_MEMBERS.find(
      (m) => m.community_id === c.id && m.user_id === user.id
    )
    const tags = MOCK_COMMUNITY_TAGS.filter(
      (t) => t.community_id === c.id && t.user_id === user.id
    ).map((t) => t.tag)

    return {
      ...c,
      is_member: Boolean(mem),
      user_role: mem?.role,
      user_tags: tags,
    }
  })

  if (options?.kind) {
    list = list.filter((c) => c.kind === options.kind)
  }

  if (options?.search) {
    const q = options.search.toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }

  if (options?.myOnly) {
    list = list.filter((c) => c.is_member)
  }

  return list
}

/**
 * Returns single community with current user membership details.
 */
export async function getCommunityById(id: string): Promise<Community | null> {
  const { user } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: c, error } = await supabase
        .from('communities')
        .select(`
          *,
          members:community_members(user_id, role)
        `)
        .eq('id', id)
        .single()

      if (!error && c) {
        const mem = c.members?.find((m: { user_id: string; role: string }) => m.user_id === user.id)
        return {
          ...c,
          is_member: Boolean(mem),
          user_role: mem?.role,
        } as Community
      }
    } catch {
      // Offline fallback
    }
  }

  const found = MOCK_COMMUNITIES.find((c) => c.id === id)
  if (!found) return null

  const mem = MOCK_COMMUNITY_MEMBERS.find(
    (m) => m.community_id === found.id && m.user_id === user.id
  )
  const tags = MOCK_COMMUNITY_TAGS.filter(
    (t) => t.community_id === found.id && t.user_id === user.id
  ).map((t) => t.tag)

  return {
    ...found,
    is_member: Boolean(mem),
    user_role: mem?.role,
    user_tags: tags,
  }
}

/**
 * Returns messages in a community, with reply counts and user vote states.
 */
export async function getCommunityMessages(
  communityId: string
): Promise<CommunityMessage[]> {
  const { user } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('community_messages')
        .select(`
          *,
          author:profiles(full_name, college_id, role_primary),
          votes:message_votes(user_id)
        `)
        .eq('community_id', communityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (!error && Array.isArray(data)) {
        return data.map((m) => ({
          ...m,
          is_upvoted: m.votes?.some((v: { user_id: string }) => v.user_id === user.id),
        })) as CommunityMessage[]
      }
    } catch {
      // Offline fallback
    }
  }

  // Offline / Mock Data
  return MOCK_COMMUNITY_MESSAGES.filter(
    (m) => m.community_id === communityId && !m.deleted_at
  ).map((m) => {
    const isUpvoted = MOCK_MESSAGE_VOTES.has(`${m.id}:${user.id}`)
    const replyCount = MOCK_COMMUNITY_MESSAGES.filter(
      (child) => child.parent_id === m.id && !child.deleted_at
    ).length

    // Attach user tags for that author in this community
    const authorTags = MOCK_COMMUNITY_TAGS.filter(
      (t) => t.community_id === communityId && t.user_id === m.author_id
    ).map((t) => t.tag as CommunityTagType)

    return {
      ...m,
      is_upvoted: isUpvoted,
      reply_count: replyCount,
      author: m.author
        ? {
            ...m.author,
            tags: authorTags,
          }
        : undefined,
    }
  })
}

/**
 * Returns members of a community.
 */
export async function getCommunityMembers(
  communityId: string
): Promise<CommunityMember[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('community_members')
        .select(`
          *,
          user:profiles(full_name, college_id, role_primary, avatar_url)
        `)
        .eq('community_id', communityId)
        .order('role', { ascending: false }) // moderators first

      if (!error && Array.isArray(data)) {
        return data as CommunityMember[]
      }
    } catch {
      // Offline fallback
    }
  }

  return MOCK_COMMUNITY_MEMBERS.filter((m) => m.community_id === communityId)
}
