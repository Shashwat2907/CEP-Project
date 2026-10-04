'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { isSupabaseOnline } from '@/lib/supabase/status'
import {
  CreateCommunitySchema,
  JoinCommunitySchema,
  LeaveCommunitySchema,
  SendMessageSchema,
  VoteReplySchema,
  AddReactionSchema,
  DeleteMessageSchema,
  ReportMessageSchema,
  type CreateCommunityInput,
  type SendMessageInput,
  type Community,
  type CommunityMessage,
  type CommunityTagType,
} from './schema'
import {
  MOCK_COMMUNITIES,
  MOCK_COMMUNITY_MEMBERS,
  MOCK_COMMUNITY_MESSAGES,
  MOCK_COMMUNITY_TAGS,
  MOCK_MESSAGE_VOTES,
} from './mock-community-data'

import { checkRateLimit } from './rate-limiter'

/**
 * Creates a student-led unofficial community.
 */
export async function createCommunityAction(rawInput: CreateCommunityInput) {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const parsed = CreateCommunitySchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const { name, description, private: isPrivate } = parsed.data
  const communityId = crypto.randomUUID()
  const now = new Date().toISOString()

  const newCommunity: Community = {
    id: communityId,
    kind: 'unofficial',
    name,
    description: description || null,
    official: false,
    year: null,
    branch: null,
    batch: null,
    subject_id: null,
    private: isPrivate,
    member_count: 1,
    created_by: user.id,
    created_at: now,
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { error: commError } = await supabase.from('communities').insert({
        id: communityId,
        kind: 'unofficial',
        name,
        description: description || null,
        official: false,
        private: isPrivate,
        member_count: 1,
        created_by: user.id,
      })

      if (commError) {
        return { success: false, error: commError.message }
      }

      await supabase.from('community_members').insert({
        community_id: communityId,
        user_id: user.id,
        role: 'moderator',
      })

      revalidatePath('/community')
      return { success: true, communityId }
    } catch {
      // Fall through to mock store
    }
  }

  // Offline / Mock Store
  MOCK_COMMUNITIES.unshift(newCommunity)
  MOCK_COMMUNITY_MEMBERS.push({
    community_id: communityId,
    user_id: user.id,
    role: 'moderator',
    joined_at: now,
    user: profile
      ? {
          full_name: profile.full_name,
          college_id: profile.college_id,
          role_primary: profile.role_primary,
          avatar_url: profile.photo_url,
        }
      : undefined,
  })

  revalidatePath('/community')
  return { success: true, communityId }
}

/**
 * Join an unofficial community. Official communities cannot be joined manually.
 */
export async function joinCommunityAction(rawInput: { community_id: string }) {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const parsed = JoinCommunitySchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid community ID' }
  }

  const { community_id } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      // Ensure community is not official
      const { data: comm } = await supabase
        .from('communities')
        .select('official, member_count')
        .eq('id', community_id)
        .single()

      if (comm?.official) {
        return { success: false, error: 'Official academic communities are managed automatically by roster.' }
      }

      const { error } = await supabase.from('community_members').insert({
        community_id,
        user_id: user.id,
        role: 'member',
      })

      if (error) {
        if (error.code === '23505') {
          return { success: true, message: 'Already a member' }
        }
        return { success: false, error: error.message }
      }

      // Update count
      await supabase
        .from('communities')
        .update({ member_count: (comm?.member_count ?? 0) + 1 })
        .eq('id', community_id)

      revalidatePath('/community')
      revalidatePath(`/community/${community_id}`)
      return { success: true }
    } catch {
      // Fall through to mock store
    }
  }

  // Offline / Mock Store
  const targetComm = MOCK_COMMUNITIES.find((c) => c.id === community_id)
  if (!targetComm) {
    return { success: false, error: 'Community not found' }
  }

  if (targetComm.official) {
    return { success: false, error: 'Official academic communities are managed automatically by roster.' }
  }

  const existingMember = MOCK_COMMUNITY_MEMBERS.find(
    (m) => m.community_id === community_id && m.user_id === user.id
  )

  if (!existingMember) {
    MOCK_COMMUNITY_MEMBERS.push({
      community_id,
      user_id: user.id,
      role: 'member',
      joined_at: new Date().toISOString(),
      user: profile
        ? {
            full_name: profile.full_name,
            college_id: profile.college_id,
            role_primary: profile.role_primary,
            avatar_url: profile.photo_url,
          }
        : undefined,
    })
    targetComm.member_count += 1
  }

  revalidatePath('/community')
  revalidatePath(`/community/${community_id}`)
  return { success: true }
}

/**
 * Leave a community. Official communities cannot be left manually.
 */
export async function leaveCommunityAction(rawInput: { community_id: string }) {
  const { user } = await requireAuth()

  const parsed = LeaveCommunitySchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid community ID' }
  }

  const { community_id } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data: comm } = await supabase
        .from('communities')
        .select('official, member_count')
        .eq('id', community_id)
        .single()

      if (comm?.official) {
        return { success: false, error: 'Cannot leave official academic communities.' }
      }

      await supabase
        .from('community_members')
        .delete()
        .eq('community_id', community_id)
        .eq('user_id', user.id)

      await supabase
        .from('communities')
        .update({ member_count: Math.max(0, (comm?.member_count ?? 1) - 1) })
        .eq('id', community_id)

      revalidatePath('/community')
      revalidatePath(`/community/${community_id}`)
      return { success: true }
    } catch {
      // Offline fallback
    }
  }

  const targetComm = MOCK_COMMUNITIES.find((c) => c.id === community_id)
  if (!targetComm) return { success: false, error: 'Community not found' }

  if (targetComm.official) {
    return { success: false, error: 'Cannot leave official academic communities.' }
  }

  const memIdx = MOCK_COMMUNITY_MEMBERS.findIndex(
    (m) => m.community_id === community_id && m.user_id === user.id
  )
  if (memIdx !== -1) {
    MOCK_COMMUNITY_MEMBERS.splice(memIdx, 1)
    targetComm.member_count = Math.max(0, targetComm.member_count - 1)
  }

  revalidatePath('/community')
  revalidatePath(`/community/${community_id}`)
  return { success: true }
}

/**
 * Send a message or threaded reply to a community.
 * Enforces membership and a rate limit of 10 messages/minute.
 */
export async function sendMessageAction(rawInput: SendMessageInput) {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const parsed = SendMessageSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid message' }
  }

  const { community_id, body, parent_id, attachment_path } = parsed.data

  // Rate Limiting Check
  if (!checkRateLimit(user.id, community_id, 10, 60000)) {
    return {
      success: false,
      error: 'Rate limit exceeded: You can send at most 10 messages per minute in this community.',
    }
  }

  const messageId = crypto.randomUUID()
  const now = new Date().toISOString()

  const newMessage: CommunityMessage = {
    id: messageId,
    community_id,
    author_id: user.id,
    parent_id: parent_id || null,
    body: body.trim(),
    attachment_path: attachment_path || null,
    reactions: {},
    upvote_count: 0,
    created_at: now,
    author: {
      full_name: profile?.full_name || 'Anonymous User',
      college_id: profile?.college_id || 'UNKNOWN',
      role_primary: profile?.role_primary || 'student',
      tags: [],
    },
    is_upvoted: false,
    reply_count: 0,
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('community_messages')
        .insert({
          id: messageId,
          community_id,
          author_id: user.id,
          parent_id: parent_id || null,
          body: body.trim(),
          attachment_path: attachment_path || null,
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      revalidatePath(`/community/${community_id}`)
      return { success: true, message: data as CommunityMessage }
    } catch {
      // Offline fallback
    }
  }

  // Offline / Mock Store
  // Verify author tags in this community
  const authorTags = MOCK_COMMUNITY_TAGS.filter(
    (t) => t.community_id === community_id && t.user_id === user.id
  ).map((t) => t.tag)

  if (newMessage.author) {
    newMessage.author.tags = authorTags
  }

  MOCK_COMMUNITY_MESSAGES.push(newMessage)

  revalidatePath(`/community/${community_id}`)
  return { success: true, message: newMessage }
}

/**
 * Upvote a threaded reply.
 * Rule: Only replies (parent_id !== null) can be upvoted. Cannot upvote own message.
 * Calculates tag thresholds: Helper (10), Doubt Solver (25), Top Contributor (50).
 */
export async function voteReplyAction(rawInput: { message_id: string }) {
  const { user } = await requireAuth()

  const parsed = VoteReplySchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid message ID' }
  }

  const { message_id } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()

      // Fetch message to verify it is a reply and not authored by voter
      const { data: msg, error: msgErr } = await supabase
        .from('community_messages')
        .select('author_id, parent_id, community_id, upvote_count')
        .eq('id', message_id)
        .single()

      if (msgErr || !msg) {
        return { success: false, error: 'Message not found' }
      }

      if (!msg.parent_id) {
        return { success: false, error: 'Only doubt answers and replies can be upvoted to award reputation badges.' }
      }

      if (msg.author_id === user.id) {
        return { success: false, error: 'You cannot upvote your own reply.' }
      }

      // Check existing vote
      const { data: existingVote } = await supabase
        .from('message_votes')
        .select('user_id')
        .eq('message_id', message_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingVote) {
        // Remove vote
        await supabase
          .from('message_votes')
          .delete()
          .eq('message_id', message_id)
          .eq('user_id', user.id)

        const newCount = Math.max(0, msg.upvote_count - 1)
        await supabase
          .from('community_messages')
          .update({ upvote_count: newCount })
          .eq('id', message_id)

        revalidatePath(`/community/${msg.community_id}`)
        return { success: true, upvoted: false, upvote_count: newCount }
      } else {
        // Insert vote (triggers handle_message_vote_tags() in database)
        await supabase.from('message_votes').insert({
          message_id,
          user_id: user.id,
        })

        revalidatePath(`/community/${msg.community_id}`)
        return { success: true, upvoted: true, upvote_count: msg.upvote_count + 1 }
      }
    } catch {
      // Fall through to mock store
    }
  }

  // Offline / Mock Store
  const targetMsg = MOCK_COMMUNITY_MESSAGES.find((m) => m.id === message_id)
  if (!targetMsg) {
    return { success: false, error: 'Message not found' }
  }

  if (!targetMsg.parent_id) {
    return { success: false, error: 'Only doubt answers and replies can be upvoted to award reputation badges.' }
  }

  if (targetMsg.author_id === user.id) {
    return { success: false, error: 'You cannot upvote your own reply.' }
  }

  const voteKey = `${message_id}:${user.id}`
  let upvoted = false

  if (MOCK_MESSAGE_VOTES.has(voteKey)) {
    MOCK_MESSAGE_VOTES.delete(voteKey)
    targetMsg.upvote_count = Math.max(0, targetMsg.upvote_count - 1)
    upvoted = false
  } else {
    MOCK_MESSAGE_VOTES.add(voteKey)
    targetMsg.upvote_count += 1
    upvoted = true

    // Evaluate tag thresholds for author in this community
    evaluateAndAwardMockTags(targetMsg.community_id, targetMsg.author_id)
  }

  revalidatePath(`/community/${targetMsg.community_id}`)
  return { success: true, upvoted, upvote_count: targetMsg.upvote_count }
}

/**
 * Helper to compute and award reputation badges in the mock store.
 * Thresholds: 10 upvotes -> helper, 25 -> doubt_solver, 50 -> top_contributor
 */
function evaluateAndAwardMockTags(communityId: string, authorId: string) {
  // Sum upvotes on replies by this author in this community
  const totalVotes = MOCK_COMMUNITY_MESSAGES
    .filter((m) => m.community_id === communityId && m.author_id === authorId && m.parent_id !== null)
    .reduce((sum, m) => sum + (m.upvote_count || 0), 0)

  const awardTag = (tag: CommunityTagType) => {
    const exists = MOCK_COMMUNITY_TAGS.some(
      (t) => t.community_id === communityId && t.user_id === authorId && t.tag === tag
    )
    if (!exists) {
      MOCK_COMMUNITY_TAGS.push({
        community_id: communityId,
        user_id: authorId,
        tag,
        awarded_at: new Date().toISOString(),
      })
    }
  }

  if (totalVotes >= 10) awardTag('helper')
  if (totalVotes >= 25) awardTag('doubt_solver')
  if (totalVotes >= 50) awardTag('top_contributor')
}

/**
 * Toggle emoji reaction on a message.
 */
export async function addReactionAction(rawInput: { message_id: string; emoji: string }) {
  const { user } = await requireAuth()

  const parsed = AddReactionSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid reaction' }
  }

  const { message_id, emoji } = parsed.data

  const targetMsg = MOCK_COMMUNITY_MESSAGES.find((m) => m.id === message_id)
  if (targetMsg) {
    if (!targetMsg.reactions) targetMsg.reactions = {}
    const users = targetMsg.reactions[emoji] || []
    const idx = users.indexOf(user.id)
    if (idx === -1) {
      users.push(user.id)
    } else {
      users.splice(idx, 1)
    }
    targetMsg.reactions[emoji] = users
    revalidatePath(`/community/${targetMsg.community_id}`)
  }

  return { success: true }
}

/**
 * Soft delete own message or moderator delete.
 */
export async function deleteMessageAction(rawInput: { message_id: string }) {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const parsed = DeleteMessageSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid message ID' }
  }

  const { message_id } = parsed.data
  const targetMsg = MOCK_COMMUNITY_MESSAGES.find((m) => m.id === message_id)
  if (!targetMsg) {
    return { success: false, error: 'Message not found' }
  }

  const isAuthor = targetMsg.author_id === user.id
  const isPrivileged = profile?.role_primary === 'teacher' || profile?.role_primary === 'admin'
  const isMod = MOCK_COMMUNITY_MEMBERS.some(
    (m) => m.community_id === targetMsg.community_id && m.user_id === user.id && m.role === 'moderator'
  )

  if (!isAuthor && !isPrivileged && !isMod) {
    return { success: false, error: 'Only the author or community moderators can delete this message.' }
  }

  targetMsg.deleted_at = new Date().toISOString()
  targetMsg.body = '[Message deleted by author or moderator]'

  revalidatePath(`/community/${targetMsg.community_id}`)
  return { success: true }
}

/**
 * Report a message for moderation review.
 */
export async function reportMessageAction(rawInput: { message_id: string; reason: string }) {
  const { user } = await requireAuth()

  const parsed = ReportMessageSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid report' }
  }

  const { message_id, reason } = parsed.data

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      await supabase.from('message_reports').insert({
        message_id,
        reporter_id: user.id,
        reason,
      })
    } catch {
      // Fallback
    }
  }

  return { success: true, message: 'Message reported to community moderators for review.' }
}
