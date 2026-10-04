import { z } from 'zod'

export const EventKindSchema = z.enum(['college', 'external'])
export type EventKind = z.infer<typeof EventKindSchema>

export const EventStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled'])
export type EventStatus = z.infer<typeof EventStatusSchema>

export const EventOrganizerTypeSchema = z.enum(['club', 'department', 'admin', 'external'])
export type EventOrganizerType = z.infer<typeof EventOrganizerTypeSchema>

export const RsvpStatusSchema = z.enum(['attending', 'waitlist', 'cancelled'])
export type RsvpStatus = z.infer<typeof RsvpStatusSchema>

export const CreateEventInputSchema = z
  .object({
    kind: EventKindSchema,
    title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(3000, 'Description too long'),
    organizerName: z.string().min(2, 'Organizer name is required').max(100),
    organizerType: EventOrganizerTypeSchema,
    location: z.string().min(2, 'Location is required').max(150),
    startsAt: z.string().datetime({ message: 'Start date must be a valid ISO datetime' }),
    endsAt: z.string().datetime({ message: 'End date must be a valid ISO datetime' }),
    registrationLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    capacity: z.coerce.number().int().positive('Capacity must be positive').optional().nullable(),
    bannerUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    tags: z.array(z.string()).default([]),
    allowTeams: z.boolean().default(false),
    minTeamSize: z.coerce.number().int().min(1).max(10).default(1),
    maxTeamSize: z.coerce.number().int().min(1).max(10).default(4),
  })
  .refine((data) => new Date(data.endsAt) >= new Date(data.startsAt), {
    message: 'End date must be after or equal to start date',
    path: ['endsAt'],
  })

export type CreateEventInput = z.infer<typeof CreateEventInputSchema>

export const RsvpEventInputSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  status: RsvpStatusSchema.default('attending'),
  addToCalendar: z.boolean().default(true),
  teamName: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
})

export type RsvpEventInput = z.infer<typeof RsvpEventInputSchema>

export const CreateEventTeamInputSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50),
  lookingForMembers: z.boolean().default(true),
  desiredSkills: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
})

export type CreateEventTeamInput = z.infer<typeof CreateEventTeamInputSchema>

export const PostEventMessageInputSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
})

export type PostEventMessageInput = z.infer<typeof PostEventMessageInputSchema>

export interface EventItem {
  id: string
  kind: EventKind
  title: string
  description: string
  organizerName: string
  organizerType: EventOrganizerType
  createdBy?: string | null
  location: string
  startsAt: string
  endsAt: string
  status: EventStatus
  registrationLink?: string | null
  capacity?: number | null
  bannerUrl?: string | null
  tags: string[]
  allowTeams: boolean
  minTeamSize: number
  maxTeamSize: number
  createdAt: string
  updatedAt: string
  rsvpCount?: number
  userRsvpStatus?: RsvpStatus | null
  teamsCount?: number
}

export interface EventTeamItem {
  id: string
  eventId: string
  name: string
  leaderId: string
  leaderName?: string
  lookingForMembers: boolean
  desiredSkills: string[]
  notes?: string | null
  createdAt: string
}

export interface EventMessageItem {
  id: string
  eventId: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
}
