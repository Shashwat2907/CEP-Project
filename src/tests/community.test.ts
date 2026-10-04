import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CommunityKindSchema,
  CommunityMemberRoleSchema,
  CommunityTagTypeSchema,
  CreateCommunitySchema,
  SendMessageSchema,
  VoteReplySchema,
  AddReactionSchema,
  ReportMessageSchema,
  LeaveCommunitySchema,
  JoinCommunitySchema,
  CommunitySchema,
  CommunityMessageSchema,
} from '@/features/community/schema'
import {
  checkRateLimit,
  resetRateLimitsForTesting,
} from '@/features/community/rate-limiter'
import {
  createCommunityAction,
  joinCommunityAction,
  leaveCommunityAction,
  sendMessageAction,
  voteReplyAction,
  addReactionAction,
  deleteMessageAction,
  reportMessageAction,
} from '@/features/community/actions'
import {
  MOCK_COMMUNITIES,
  MOCK_COMMUNITY_MEMBERS,
  MOCK_COMMUNITY_MESSAGES,
  MOCK_COMMUNITY_TAGS,
  MOCK_MESSAGE_VOTES,
} from '@/features/community/mock-community-data'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase status to test offline/resilient store logic reliably
vi.mock('@/lib/supabase/status', () => ({
  isSupabaseOnline: vi.fn().mockResolvedValue(false),
}))

// Mock auth & profile sessions
const mockUserId = '00000000-0000-0000-0000-000000000010' // Aarav Mehta
const mockTeacherId = '00000000-0000-0000-0000-000000000002' // Prof. Rajesh Sharma
const mockPeerId = '00000000-0000-0000-0000-000000000011' // Diya Sen

vi.mock('@/shared/auth/guards', () => ({
  requireAuth: vi.fn().mockImplementation(async () => ({
    user: { id: mockUserId, email: 'aarav@campus.edu' },
  })),
}))

vi.mock('@/shared/auth/session', () => ({
  getCurrentProfile: vi.fn().mockImplementation(async () => ({
    id: mockUserId,
    full_name: 'Aarav Mehta',
    college_id: '23BCE1001',
    role_primary: 'student',
    branch: 'Computer Science',
    year: 2,
    photo_url: null,
  })),
}))

describe('Community Slices — Schemas & Validation', () => {
  it('validates community kinds', () => {
    expect(CommunityKindSchema.safeParse('year_branch').success).toBe(true)
    expect(CommunityKindSchema.safeParse('subject').success).toBe(true)
    expect(CommunityKindSchema.safeParse('batch').success).toBe(true)
    expect(CommunityKindSchema.safeParse('unofficial').success).toBe(true)
    expect(CommunityKindSchema.safeParse('club_group').success).toBe(false)
  })

  it('validates community tag types', () => {
    expect(CommunityTagTypeSchema.safeParse('helper').success).toBe(true)
    expect(CommunityTagTypeSchema.safeParse('doubt_solver').success).toBe(true)
    expect(CommunityTagTypeSchema.safeParse('top_contributor').success).toBe(true)
    expect(CommunityTagTypeSchema.safeParse('superstar').success).toBe(false)
  })

  it('validates CreateCommunitySchema bounds', () => {
    // Valid
    const valid = CreateCommunitySchema.safeParse({
      name: 'Open Source Developers',
      description: 'A community for open source enthusiasts on campus.',
      private: false,
    })
    expect(valid.success).toBe(true)

    // Name too short (<3 chars)
    const tooShort = CreateCommunitySchema.safeParse({ name: 'OS' })
    expect(tooShort.success).toBe(false)

    // Name too long (>60 chars)
    const tooLong = CreateCommunitySchema.safeParse({ name: 'A'.repeat(61) })
    expect(tooLong.success).toBe(false)

    // Description too long (>300 chars)
    const descLong = CreateCommunitySchema.safeParse({
      name: 'AI Club',
      description: 'X'.repeat(301),
    })
    expect(descLong.success).toBe(false)
  })

  it('validates SendMessageSchema constraints', () => {
    const valid = SendMessageSchema.safeParse({
      community_id: '00000000-0000-0000-0050-000000000002',
      body: 'Can someone explain AVL tree double rotations?',
    })
    expect(valid.success).toBe(true)

    // Empty body
    const empty = SendMessageSchema.safeParse({
      community_id: '00000000-0000-0000-0050-000000000002',
      body: '   ',
    })
    expect(empty.success).toBe(false)

    // Exceeds 2000 chars
    const tooLong = SendMessageSchema.safeParse({
      community_id: '00000000-0000-0000-0050-000000000002',
      body: 'A'.repeat(2001),
    })
    expect(tooLong.success).toBe(false)
  })

  it('validates ReportMessageSchema', () => {
    const valid = ReportMessageSchema.safeParse({
      message_id: '00000000-0000-0000-0051-000000000001',
      reason: 'This message contains unacademic spam.',
    })
    expect(valid.success).toBe(true)

    const tooShortReason = ReportMessageSchema.safeParse({
      message_id: '00000000-0000-0000-0051-000000000001',
      reason: 'bad',
    })
    expect(tooShortReason.success).toBe(false)
  })
})

describe('Community Rate Limiting (10 msgs / min per user / room)', () => {
  beforeEach(() => {
    resetRateLimitsForTesting()
  })

  it('allows up to 10 messages within one minute and blocks the 11th', () => {
    const userId = 'user-test-1'
    const commId = 'comm-test-1'

    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(userId, commId, 10, 60000)).toBe(true)
    }

    // 11th message must be blocked
    expect(checkRateLimit(userId, commId, 10, 60000)).toBe(false)
  })

  it('isolates rate limits per community room and per user', () => {
    const userA = 'user-a'
    const userB = 'user-b'
    const comm1 = 'comm-1'
    const comm2 = 'comm-2'

    // userA sends 10 messages in comm1
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(userA, comm1, 10, 60000)).toBe(true)
    }
    expect(checkRateLimit(userA, comm1, 10, 60000)).toBe(false)

    // userA can still send in comm2
    expect(checkRateLimit(userA, comm2, 10, 60000)).toBe(true)

    // userB can send in comm1
    expect(checkRateLimit(userB, comm1, 10, 60000)).toBe(true)
  })
})

describe('feat/community-core — Community Membership & Lifecycle', () => {
  it('creates an unofficial community and assigns creator as moderator', async () => {
    const res = await createCommunityAction({
      name: 'Mobile App Hackers',
      description: 'Flutter and React Native group.',
      private: false,
    })

    expect(res.success).toBe(true)
    expect(res.communityId).toBeDefined()

    const created = MOCK_COMMUNITIES.find((c) => c.id === res.communityId)
    expect(created).toBeDefined()
    expect(created?.kind).toBe('unofficial')
    expect(created?.official).toBe(false)
    expect(created?.member_count).toBe(1)

    // Creator membership
    const membership = MOCK_COMMUNITY_MEMBERS.find(
      (m) => m.community_id === res.communityId && m.user_id === mockUserId
    )
    expect(membership).toBeDefined()
    expect(membership?.role).toBe('moderator')
  })

  it('blocks joining an official roster community manually', async () => {
    // Official year_branch community
    const officialId = '00000000-0000-0000-0050-000000000001'
    const res = await joinCommunityAction({ community_id: officialId })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/roster/i)
  })

  it('blocks leaving an official roster community manually', async () => {
    const officialId = '00000000-0000-0000-0050-000000000001'
    const res = await leaveCommunityAction({ community_id: officialId })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/official/i)
  })

  it('allows joining and leaving an unofficial community', async () => {
    // Competitive Programming group (mock id: ...0006)
    const commId = '00000000-0000-0000-0050-000000000006'
    const comm = MOCK_COMMUNITIES.find((c) => c.id === commId)!
    const initialCount = comm.member_count

    // Join
    const joinRes = await joinCommunityAction({ community_id: commId })
    expect(joinRes.success).toBe(true)
    expect(comm.member_count).toBe(initialCount + 1)

    // Leave
    const leaveRes = await leaveCommunityAction({ community_id: commId })
    expect(leaveRes.success).toBe(true)
    expect(comm.member_count).toBe(initialCount)
  })
})

describe('feat/community-chat — Realtime Threading & Moderation', () => {
  beforeEach(() => {
    resetRateLimitsForTesting()
  })

  it('sends a top-level message in a community', async () => {
    const commId = '00000000-0000-0000-0050-000000000002'
    const res = await sendMessageAction({
      community_id: commId,
      body: 'Has the assignment 2 submission deadline been extended?',
    })

    expect(res.success).toBe(true)
    expect(res.message).toBeDefined()
    expect(res.message?.parent_id).toBeNull()
    expect(res.message?.body).toBe('Has the assignment 2 submission deadline been extended?')
  })

  it('sends a threaded reply to an existing question', async () => {
    const commId = '00000000-0000-0000-0050-000000000002'
    const parentId = '00000000-0000-0000-0051-000000000002'

    const res = await sendMessageAction({
      community_id: commId,
      parent_id: parentId,
      body: 'Yes, professor announced it is moved to Friday 5 PM.',
    })

    expect(res.success).toBe(true)
    expect(res.message?.parent_id).toBe(parentId)
  })

  it('allows author to soft-delete their message', async () => {
    const commId = '00000000-0000-0000-0050-000000000002'
    const sendRes = await sendMessageAction({
      community_id: commId,
      body: 'Accidental typo message to delete',
    })

    expect(sendRes.success).toBe(true)
    const msgId = sendRes.message!.id

    const delRes = await deleteMessageAction({ message_id: msgId })
    expect(delRes.success).toBe(true)

    const deletedMsg = MOCK_COMMUNITY_MESSAGES.find((m) => m.id === msgId)
    expect(deletedMsg?.deleted_at).toBeDefined()
    expect(deletedMsg?.body).toMatch(/Message deleted/)
  })

  it('submits a moderation report for a message', async () => {
    const res = await reportMessageAction({
      message_id: '00000000-0000-0000-0051-000000000001',
      reason: 'Please review this message for academic guidelines compliance.',
    })

    expect(res.success).toBe(true)
    expect(res.message).toMatch(/reported/i)
  })
})

describe('feat/community-tags — Upvotes & Automatic Reputation Badges', () => {
  it('rejects upvoting a top-level message (only threaded replies can be upvoted)', async () => {
    // Message ...0001 is a top-level announcement (parent_id is null)
    const topLevelId = '00000000-0000-0000-0051-000000000001'
    const res = await voteReplyAction({ message_id: topLevelId })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/replies can be upvoted/i)
  })

  it('rejects upvoting own reply', async () => {
    // Create a reply authored by the current mock user (Aarav Mehta)
    const commId = '00000000-0000-0000-0050-000000000002'
    const parentId = '00000000-0000-0000-0051-000000000002'

    const sendRes = await sendMessageAction({
      community_id: commId,
      parent_id: parentId,
      body: 'My own doubt solution',
    })
    expect(sendRes.success).toBe(true)

    const res = await voteReplyAction({ message_id: sendRes.message!.id })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/own reply/i)
  })

  it('upvotes a peer reply and toggles it on second click', async () => {
    // Reply ...0003 is authored by Diya Sen (mockPeerId), not current user
    const peerReplyId = '00000000-0000-0000-0051-000000000003'
    const targetMsg = MOCK_COMMUNITY_MESSAGES.find((m) => m.id === peerReplyId)!

    // Reset initial state
    MOCK_MESSAGE_VOTES.delete(`${peerReplyId}:${mockUserId}`)
    targetMsg.upvote_count = 10

    // 1. Upvote
    const vote1 = await voteReplyAction({ message_id: peerReplyId })
    expect(vote1.success).toBe(true)
    expect(vote1.upvoted).toBe(true)
    expect(vote1.upvote_count).toBe(11)

    // 2. Toggle off
    const vote2 = await voteReplyAction({ message_id: peerReplyId })
    expect(vote2.success).toBe(true)
    expect(vote2.upvoted).toBe(false)
    expect(vote2.upvote_count).toBe(10)
  })

  it('automatically awards Helper (10), Doubt Solver (25), and Top Contributor (50) badges idempotently', async () => {
    const commId = '00000000-0000-0000-0050-000000000002'
    const newAuthorId = '00000000-0000-0000-0000-000000000099'

    // Create a reply by this author with 9 upvotes
    const replyId = '00000000-0000-0000-0051-000000000099'
    MOCK_COMMUNITY_MESSAGES.push({
      id: replyId,
      community_id: commId,
      author_id: newAuthorId,
      parent_id: '00000000-0000-0000-0051-000000000002',
      body: 'Excellent mathematical proof for AVL height upper-bound.',
      upvote_count: 9,
      reactions: {},
      created_at: new Date().toISOString(),
    })

    // Vote 10: crosses Helper threshold (>= 10)
    await voteReplyAction({ message_id: replyId })

    let authorTags = MOCK_COMMUNITY_TAGS.filter(
      (t) => t.community_id === commId && t.user_id === newAuthorId
    ).map((t) => t.tag)
    expect(authorTags).toContain('helper')
    expect(authorTags).not.toContain('doubt_solver')

    // Simulate reaching 25 upvotes
    const msg = MOCK_COMMUNITY_MESSAGES.find((m) => m.id === replyId)!
    msg.upvote_count = 24
    MOCK_MESSAGE_VOTES.delete(`${replyId}:${mockUserId}`)

    await voteReplyAction({ message_id: replyId })

    authorTags = MOCK_COMMUNITY_TAGS.filter(
      (t) => t.community_id === commId && t.user_id === newAuthorId
    ).map((t) => t.tag)
    expect(authorTags).toContain('helper')
    expect(authorTags).toContain('doubt_solver')
    expect(authorTags).not.toContain('top_contributor')

    // Simulate reaching 50 upvotes
    msg.upvote_count = 49
    MOCK_MESSAGE_VOTES.delete(`${replyId}:${mockUserId}`)

    await voteReplyAction({ message_id: replyId })

    authorTags = MOCK_COMMUNITY_TAGS.filter(
      (t) => t.community_id === commId && t.user_id === newAuthorId
    ).map((t) => t.tag)
    expect(authorTags).toContain('helper')
    expect(authorTags).toContain('doubt_solver')
    expect(authorTags).toContain('top_contributor')

    // Verify idempotency: no duplicate tags
    const helperTagsCount = MOCK_COMMUNITY_TAGS.filter(
      (t) => t.community_id === commId && t.user_id === newAuthorId && t.tag === 'helper'
    ).length
    expect(helperTagsCount).toBe(1)
  })
})
