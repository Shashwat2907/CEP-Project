'use server'

import { createClient } from '@/lib/supabase/server'
import {
  SendFriendRequestInputSchema,
  RespondFriendRequestInputSchema,
  RemoveFriendInputSchema,
  type FriendItem,
  type PublicStudentProfile,
  type FriendPresenceInfo,
} from './schema'
import { notify } from '@/shared/notifications/notify'

// Realistic student directory for mock dev / test fallback
interface MockDirectoryUser {
  id: string
  fullName: string
  collegeEmail: string
  collegeId: string
  role: string
  branch: string
  year: number
  photoUrl?: string
  statusVisibility: 'nobody' | 'friends' | 'everyone'
  presenceState: 'inside' | 'outside' | 'unknown'
  presenceZone?: string
  sharedCommunities: string[]
}

const mockDirectory: MockDirectoryUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000002',
    fullName: 'Priya Sharma',
    collegeEmail: 'priya@college.edu',
    collegeId: '23BCE1043',
    role: 'student',
    branch: 'Computer Science & Engineering',
    year: 3,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    statusVisibility: 'friends',
    presenceState: 'inside',
    presenceZone: 'Computer Lab 3',
    sharedCommunities: ['CS Year 3 Official', 'Turing Computer Society'],
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    fullName: 'Aman Verma',
    collegeEmail: 'aman@college.edu',
    collegeId: '23BIT1012',
    role: 'student',
    branch: 'Information Technology',
    year: 4,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    statusVisibility: 'friends',
    presenceState: 'inside',
    presenceZone: 'Central Library',
    sharedCommunities: ['Robotics Club'],
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    fullName: 'Rohan Gupta',
    collegeEmail: 'rohan@college.edu',
    collegeId: '23BME1008',
    role: 'student',
    branch: 'Mechanical Engineering',
    year: 2,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    statusVisibility: 'nobody', // Hidden presence
    presenceState: 'inside',
    presenceZone: 'Mechanical Workshop',
    sharedCommunities: ['Robotics Club'],
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    fullName: 'Ananya Deshmukh',
    collegeEmail: 'ananya@college.edu',
    collegeId: '23BCE1055',
    role: 'student',
    branch: 'Computer Science & Engineering',
    year: 3,
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    statusVisibility: 'everyone',
    presenceState: 'outside',
    sharedCommunities: ['CS Year 3 Official', 'Debating Society'],
  },
]

interface StoredFriendship {
  id: string
  userA: string
  userB: string
  requesterId: string
  status: 'pending' | 'accepted' | 'declined' | 'blocked'
  createdAt: string
  updatedAt: string
}

let mockFriendships: StoredFriendship[] = [
  {
    id: '00000000-0000-0000-0000-000000000901',
    userA: '00000000-0000-0000-0000-000000000001',
    userB: '00000000-0000-0000-0000-000000000002',
    requesterId: '00000000-0000-0000-0000-000000000002',
    status: 'accepted',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:05:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000902',
    userA: '00000000-0000-0000-0000-000000000001',
    userB: '00000000-0000-0000-0000-000000000003',
    requesterId: '00000000-0000-0000-0000-000000000003',
    status: 'pending', // Incoming request for user 1
    createdAt: '2026-10-03T11:00:00Z',
    updatedAt: '2026-10-03T11:00:00Z',
  },
]

/**
 * Helper to compute presence visibility for viewer and target
 */
function resolvePresence(
  target: MockDirectoryUser,
  isFriend: boolean
): FriendPresenceInfo {
  // If target chose 'nobody', it is always hidden
  if (target.statusVisibility === 'nobody') {
    return { state: 'hidden' }
  }

  // If target chose 'friends', visible only if accepted friend
  if (target.statusVisibility === 'friends' && !isFriend) {
    return { state: 'hidden' }
  }

  // Otherwise visible
  return {
    state: target.presenceState,
    zoneName: target.presenceZone || null,
    lastSeen: new Date().toISOString(),
  }
}

/**
 * Gets all accepted friends of the current user.
 */
export async function getFriendsAction(): Promise<FriendItem[]> {
  let currentUserId = '00000000-0000-0000-0000-000000000001'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) currentUserId = authData.user.id
  } catch {
    // Non-blocking fallback
  }

  const accepted = mockFriendships.filter(
    (f) =>
      f.status === 'accepted' &&
      (f.userA === currentUserId || f.userB === currentUserId)
  )

  const items: FriendItem[] = []

  for (const f of accepted) {
    const otherId = f.userA === currentUserId ? f.userB : f.userA
    const dirUser = mockDirectory.find((u) => u.id === otherId)
    if (!dirUser) continue

    items.push({
      friendshipId: f.id,
      userId: dirUser.id,
      fullName: dirUser.fullName,
      collegeEmail: dirUser.collegeEmail,
      collegeId: dirUser.collegeId,
      role: dirUser.role,
      branch: dirUser.branch,
      year: dirUser.year,
      photoUrl: dirUser.photoUrl,
      status: f.status,
      isRequester: f.requesterId === currentUserId,
      sharedCommunities: dirUser.sharedCommunities,
      presence: resolvePresence(dirUser, true),
      createdAt: f.createdAt,
    })
  }

  return items
}

/**
 * Gets pending incoming and outgoing friend requests.
 */
export async function getFriendRequestsAction(): Promise<{
  incoming: FriendItem[]
  outgoing: FriendItem[]
}> {
  let currentUserId = '00000000-0000-0000-0000-000000000001'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) currentUserId = authData.user.id
  } catch {
    // Non-blocking fallback
  }

  const incoming: FriendItem[] = []
  const outgoing: FriendItem[] = []

  const pending = mockFriendships.filter(
    (f) =>
      f.status === 'pending' &&
      (f.userA === currentUserId || f.userB === currentUserId)
  )

  for (const f of pending) {
    const otherId = f.userA === currentUserId ? f.userB : f.userA
    const dirUser = mockDirectory.find((u) => u.id === otherId)
    if (!dirUser) continue

    const item: FriendItem = {
      friendshipId: f.id,
      userId: dirUser.id,
      fullName: dirUser.fullName,
      collegeEmail: dirUser.collegeEmail,
      collegeId: dirUser.collegeId,
      role: dirUser.role,
      branch: dirUser.branch,
      year: dirUser.year,
      photoUrl: dirUser.photoUrl,
      status: f.status,
      isRequester: f.requesterId === currentUserId,
      sharedCommunities: dirUser.sharedCommunities,
      presence: resolvePresence(dirUser, false),
      createdAt: f.createdAt,
    }

    if (f.requesterId === currentUserId) {
      outgoing.push(item)
    } else {
      incoming.push(item)
    }
  }

  return { incoming, outgoing }
}

/**
 * Searches directory of campus students and returns relationship status.
 */
export async function searchStudentsAction(
  searchQuery: string
): Promise<PublicStudentProfile[]> {
  let currentUserId = '00000000-0000-0000-0000-000000000001'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) currentUserId = authData.user.id
  } catch {
    // Non-blocking fallback
  }

  const q = searchQuery.toLowerCase().trim()
  const matching = mockDirectory.filter((u) => {
    if (u.id === currentUserId) return false
    if (!q) return true
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.collegeId.toLowerCase().includes(q) ||
      u.branch.toLowerCase().includes(q) ||
      u.collegeEmail.toLowerCase().includes(q)
    )
  })

  return matching.map((u) => {
    // Find friendship with current user
    const f = mockFriendships.find(
      (rel) =>
        (rel.userA === currentUserId && rel.userB === u.id) ||
        (rel.userB === currentUserId && rel.userA === u.id)
    )

    let friendshipStatus: PublicStudentProfile['friendshipStatus'] = 'none'
    if (f) {
      if (f.status === 'accepted') friendshipStatus = 'friends'
      else if (f.status === 'blocked') friendshipStatus = 'blocked'
      else if (f.status === 'pending') {
        friendshipStatus = f.requesterId === currentUserId ? 'pending_sent' : 'pending_received'
      }
    }

    const isFriend = friendshipStatus === 'friends'

    return {
      userId: u.id,
      fullName: u.fullName,
      collegeId: u.collegeId,
      role: u.role,
      branch: u.branch,
      year: u.year,
      photoUrl: u.photoUrl,
      sharedCommunities: u.sharedCommunities,
      friendshipStatus,
      friendshipId: f?.id || null,
      presence: resolvePresence(u, isFriend),
    }
  })
}

/**
 * Sends a friend request.
 */
export async function sendFriendRequestAction(
  targetUserId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const parsed = SendFriendRequestInputSchema.safeParse({ targetUserId })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message }
  }

  let currentUserId = '00000000-0000-0000-0000-000000000001'
  let currentUserName = 'Shashwat Choudhary'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) currentUserId = authData.user.id
  } catch {
    // Non-blocking fallback
  }

  if (targetUserId === currentUserId) {
    return { ok: false, error: 'You cannot send a friend request to yourself' }
  }

  // Canonical ordering
  const userA = currentUserId < targetUserId ? currentUserId : targetUserId
  const userB = currentUserId < targetUserId ? targetUserId : currentUserId

  const existing = mockFriendships.find(
    (f) => f.userA === userA && f.userB === userB
  )

  if (existing) {
    if (existing.status === 'accepted') {
      return { ok: false, error: 'You are already friends with this person' }
    }
    if (existing.status === 'pending') {
      return { ok: false, error: 'A friend request is already pending' }
    }
  }

  const newFriendship: StoredFriendship = {
    id: crypto.randomUUID(),
    userA,
    userB,
    requesterId: currentUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockFriendships.push(newFriendship)

  // Notify target user using shared notifications
  try {
    await notify({
      userId: targetUserId,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${currentUserName} sent you a friend request.`,
      link: '/friends',
    })
  } catch {
    // Non-fatal
  }

  return { ok: true, message: 'Friend request sent!' }
}

/**
 * Responds to a friend request (accept, decline, block).
 */
export async function respondFriendRequestAction(
  friendshipId: string,
  action: 'accept' | 'decline' | 'block'
): Promise<{ ok: boolean; error?: string }> {
  const parsed = RespondFriendRequestInputSchema.safeParse({ friendshipId, action })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message }
  }

  let currentUserId = '00000000-0000-0000-0000-000000000001'
  let currentUserName = 'Shashwat Choudhary'

  const f = mockFriendships.find((rel) => rel.id === friendshipId)
  if (!f) {
    return { ok: false, error: 'Friend request not found' }
  }

  if (action === 'accept') {
    f.status = 'accepted'
    f.updatedAt = new Date().toISOString()

    // Notify requester
    const requesterId = f.requesterId
    if (requesterId !== currentUserId) {
      try {
        await notify({
          userId: requesterId,
          type: 'friend_accepted',
          title: 'Friend Request Accepted',
          body: `${currentUserName} accepted your friend request.`,
          link: '/friends',
        })
      } catch {
        // Non-fatal
      }
    }
  } else if (action === 'decline') {
    f.status = 'declined'
    // Remove declined request
    mockFriendships = mockFriendships.filter((rel) => rel.id !== friendshipId)
  } else if (action === 'block') {
    f.status = 'blocked'
    f.updatedAt = new Date().toISOString()
  }

  return { ok: true }
}

/**
 * Removes an existing friend (unfriend).
 */
export async function removeFriendAction(
  targetUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const parsed = RemoveFriendInputSchema.safeParse({ targetUserId })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message }
  }

  let currentUserId = '00000000-0000-0000-0000-000000000001'

  mockFriendships = mockFriendships.filter(
    (f) =>
      !(
        (f.userA === currentUserId && f.userB === targetUserId) ||
        (f.userB === currentUserId && f.userA === targetUserId)
      )
  )

  return { ok: true }
}

/**
 * Gets student public or friend profile by ID.
 */
export async function getStudentProfileByIdAction(
  targetUserId: string
): Promise<PublicStudentProfile | null> {
  let currentUserId = '00000000-0000-0000-0000-000000000001'

  const user = mockDirectory.find((u) => u.id === targetUserId)
  if (!user) return null

  const f = mockFriendships.find(
    (rel) =>
      (rel.userA === currentUserId && rel.userB === targetUserId) ||
      (rel.userB === currentUserId && rel.userA === targetUserId)
  )

  let friendshipStatus: PublicStudentProfile['friendshipStatus'] = 'none'
  if (f) {
    if (f.status === 'accepted') friendshipStatus = 'friends'
    else if (f.status === 'blocked') friendshipStatus = 'blocked'
    else if (f.status === 'pending') {
      friendshipStatus = f.requesterId === currentUserId ? 'pending_sent' : 'pending_received'
    }
  }

  const isFriend = friendshipStatus === 'friends'

  return {
    userId: user.id,
    fullName: user.fullName,
    collegeId: user.collegeId,
    role: user.role,
    branch: user.branch,
    year: user.year,
    photoUrl: user.photoUrl,
    sharedCommunities: user.sharedCommunities,
    friendshipStatus,
    friendshipId: f?.id || null,
    presence: resolvePresence(user, isFriend),
  }
}
