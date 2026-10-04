import { z } from 'zod'

export const FriendshipStatusSchema = z.enum(['pending', 'accepted', 'declined', 'blocked'])
export type FriendshipStatus = z.infer<typeof FriendshipStatusSchema>

export const SendFriendRequestInputSchema = z.object({
  targetUserId: z.string().uuid('Invalid user UUID'),
})
export type SendFriendRequestInput = z.infer<typeof SendFriendRequestInputSchema>

export const RespondFriendRequestInputSchema = z.object({
  friendshipId: z.string().uuid('Invalid friendship ID'),
  action: z.enum(['accept', 'decline', 'block']),
})
export type RespondFriendRequestInput = z.infer<typeof RespondFriendRequestInputSchema>

export const RemoveFriendInputSchema = z.object({
  targetUserId: z.string().uuid('Invalid user UUID'),
})
export type RemoveFriendInput = z.infer<typeof RemoveFriendInputSchema>

export interface FriendPresenceInfo {
  state: 'inside' | 'outside' | 'unknown' | 'hidden'
  zoneName?: string | null
  lastSeen?: string | null
}

export interface FriendItem {
  friendshipId: string
  userId: string
  fullName: string
  collegeEmail: string
  collegeId: string
  role: string
  branch: string
  year: number
  photoUrl?: string | null
  status: FriendshipStatus
  isRequester: boolean
  sharedCommunities: string[]
  presence: FriendPresenceInfo
  createdAt: string
}

export interface PublicStudentProfile {
  userId: string
  fullName: string
  collegeId: string
  role: string
  branch: string
  year: number
  photoUrl?: string | null
  sharedCommunities: string[]
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'
  friendshipId?: string | null
  presence: FriendPresenceInfo
}
