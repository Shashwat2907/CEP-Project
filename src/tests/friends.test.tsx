import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  SendFriendRequestInputSchema,
  RespondFriendRequestInputSchema,
  RemoveFriendInputSchema,
  type PublicStudentProfile,
} from '@/features/friends/schema'
import {
  getFriendsAction,
  getFriendRequestsAction,
  searchStudentsAction,
  sendFriendRequestAction,
  respondFriendRequestAction,
  removeFriendAction,
  getStudentProfileByIdAction,
} from '@/features/friends/actions'
import { FriendsManager } from '@/features/friends/components/friends-manager'
import { StudentProfileDialog } from '@/features/friends/components/student-profile-dialog'

describe('Friends Feature — Schemas & Validation (PLAN.MD §5.10 & TEAM_TASKS)', () => {
  it('validates friend request schemas', () => {
    const valid = SendFriendRequestInputSchema.safeParse({
      targetUserId: '11111111-2222-3333-4444-555555555555',
    })
    expect(valid.success).toBe(true)

    const invalid = SendFriendRequestInputSchema.safeParse({
      targetUserId: 'not-a-uuid',
    })
    expect(invalid.success).toBe(false)
  })

  it('validates request response schema', () => {
    const validAccept = RespondFriendRequestInputSchema.safeParse({
      friendshipId: '11111111-2222-3333-4444-555555555555',
      action: 'accept',
    })
    expect(validAccept.success).toBe(true)

    const invalidAction = RespondFriendRequestInputSchema.safeParse({
      friendshipId: '11111111-2222-3333-4444-555555555555',
      action: 'maybe',
    })
    expect(invalidAction.success).toBe(false)
  })
})

describe('Friends Feature — Lifecycle & Presence Visibility Wiring', () => {
  it('prevents self-friend requests', async () => {
    const selfId = '00000000-0000-0000-0000-000000000001'
    const res = await sendFriendRequestAction(selfId)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('cannot send a friend request to yourself')
  })

  it('sends friend request and reflects in pending requests', async () => {
    const targetId = '00000000-0000-0000-0000-000000000004' // Rohan Gupta
    const sendRes = await sendFriendRequestAction(targetId)
    expect(sendRes.ok).toBe(true)

    const reqs = await getFriendRequestsAction()
    expect(reqs.outgoing.some((r) => r.userId === targetId)).toBe(true)
  })

  it('accepts incoming friend request and updates friends list', async () => {
    const reqs = await getFriendRequestsAction()
    const incomingReq = reqs.incoming[0] // Aman Verma request
    expect(incomingReq).toBeDefined()

    const acceptRes = await respondFriendRequestAction(incomingReq.friendshipId, 'accept')
    expect(acceptRes.ok).toBe(true)

    const friendsList = await getFriendsAction()
    expect(friendsList.some((f) => f.userId === incomingReq.userId)).toBe(true)
  })

  it('wires presence visibility strictly according to privacy controls (PLAN.MD §5.1 & §5.10)', async () => {
    // 1. Target with statusVisibility = 'nobody' (Rohan Gupta) -> always hidden
    const rohanProfile = await getStudentProfileByIdAction('00000000-0000-0000-0000-000000000004')
    expect(rohanProfile?.presence.state).toBe('hidden')

    // 2. Target with statusVisibility = 'friends' (Priya Sharma, accepted friend) -> visible
    const priyaProfile = await getStudentProfileByIdAction('00000000-0000-0000-0000-000000000002')
    expect(priyaProfile?.presence.state).toBe('inside')
    expect(priyaProfile?.presence.zoneName).toBe('Computer Lab 3')

    // 3. Target with statusVisibility = 'everyone' (Ananya Deshmukh) -> visible to all
    const ananyaProfile = await getStudentProfileByIdAction('00000000-0000-0000-0000-000000000005')
    expect(ananyaProfile?.presence.state).toBe('outside')
  })

  it('removes an existing friend', async () => {
    const targetId = '00000000-0000-0000-0000-000000000002'
    const removeRes = await removeFriendAction(targetId)
    expect(removeRes.ok).toBe(true)

    const friendsList = await getFriendsAction()
    expect(friendsList.some((f) => f.userId === targetId)).toBe(false)
  })
})

describe('Friends Feature — UI Components', () => {
  const mockProfile: PublicStudentProfile = {
    userId: '00000000-0000-0000-0000-000000000002',
    fullName: 'Priya Sharma',
    collegeId: '23BCE1043',
    role: 'student',
    branch: 'Computer Science & Engineering',
    year: 3,
    sharedCommunities: ['CS Year 3 Official', 'Turing Computer Society'],
    friendshipStatus: 'friends',
    presence: {
      state: 'inside',
      zoneName: 'Computer Lab 3',
    },
  }

  it('renders FriendsManager tabs and view', () => {
    render(<FriendsManager />)
    expect(screen.getByText('Campus Friends & Network')).toBeDefined()
    expect(screen.getByText(/Friends \(/)).toBeDefined()
    expect(screen.getByText(/Requests/)).toBeDefined()
    expect(screen.getByText('Find Campus Students')).toBeDefined()
  })

  it('renders StudentProfileDialog with academic info and presence state', () => {
    const onClose = vi.fn()

    render(
      <StudentProfileDialog
        profile={mockProfile}
        isOpen={true}
        onClose={onClose}
      />
    )

    expect(screen.getByText('Priya Sharma')).toBeDefined()
    expect(screen.getByText('23BCE1043')).toBeDefined()
    expect(screen.getByText(/Year 3 · Computer Science & Engineering/)).toBeDefined()
    expect(screen.getByText(/On Campus \(Computer Lab 3\)/)).toBeDefined()
    expect(screen.getByText('CS Year 3 Official')).toBeDefined()
  })
})
