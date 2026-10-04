import { z } from 'zod'
import { CalendarSourceTypeSchema, type CalendarSourceType } from '@/shared/calendar/calendar'

export type CalendarViewMode = 'day' | 'week' | 'agenda'

export interface SourceMeta {
  type: CalendarSourceType
  label: string
  colorToken: string
  hex: string
  borderColor: string
  badgeClass: string
}

export const CALENDAR_SOURCE_METAS: Record<CalendarSourceType, SourceMeta> = {
  class: {
    type: 'class',
    label: 'Classes & Labs',
    colorToken: 'var(--color-class)',
    hex: '#0EA5E9',
    borderColor: '#0EA5E9',
    badgeClass: 'bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/30',
  },
  meet: {
    type: 'meet',
    label: 'Teacher Sessions',
    colorToken: 'var(--color-meet)',
    hex: '#3B82F6',
    borderColor: '#3B82F6',
    badgeClass: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  },
  event: {
    type: 'event',
    label: 'College Events',
    colorToken: 'var(--color-events)',
    hex: '#8B5CF6',
    borderColor: '#8B5CF6',
    badgeClass: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30',
  },
  club_event: {
    type: 'club_event',
    label: 'Club Activities',
    colorToken: 'var(--color-clubs)',
    hex: '#EC4899',
    borderColor: '#EC4899',
    badgeClass: 'bg-[#EC4899]/10 text-[#EC4899] border-[#EC4899]/30',
  },
  personal: {
    type: 'personal',
    label: 'Personal Tasks',
    colorToken: 'var(--color-personal)',
    hex: '#6B7280',
    borderColor: '#6B7280',
    badgeClass: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30',
  },
  complaints: {
    type: 'complaints',
    label: 'Grievance Hearings',
    colorToken: 'var(--color-complaints)',
    hex: '#D64545',
    borderColor: '#D64545',
    badgeClass: 'bg-[#D64545]/10 text-[#D64545] border-[#D64545]/30',
  },
  lostfound: {
    type: 'lostfound',
    label: 'Desk Pickups',
    colorToken: 'var(--color-lostfound)',
    hex: '#D98A00',
    borderColor: '#D98A00',
    badgeClass: 'bg-[#D98A00]/10 text-[#D98A00] border-[#D98A00]/30',
  },
}

export const CreatePersonalEntryInputSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
    description: z.string().max(500, 'Description too long').optional(),
    location: z.string().max(100, 'Location too long').optional(),
    startsAt: z.string().datetime({ message: 'Start time must be a valid ISO timestamp' }),
    endsAt: z.string().datetime({ message: 'End time must be a valid ISO timestamp' }),
  })
  .refine((data) => new Date(data.endsAt) >= new Date(data.startsAt), {
    message: 'End time cannot be earlier than start time',
    path: ['endsAt'],
  })

export type CreatePersonalEntryInput = z.infer<typeof CreatePersonalEntryInputSchema>

export const UpdatePersonalEntryInputSchema = z
  .object({
    id: z.string().uuid('Invalid entry ID'),
    title: z.string().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
    description: z.string().max(500, 'Description too long').optional(),
    location: z.string().max(100, 'Location too long').optional(),
    startsAt: z.string().datetime({ message: 'Start time must be a valid ISO timestamp' }),
    endsAt: z.string().datetime({ message: 'End time must be a valid ISO timestamp' }),
  })
  .refine((data) => new Date(data.endsAt) >= new Date(data.startsAt), {
    message: 'End time cannot be earlier than start time',
    path: ['endsAt'],
  })

export type UpdatePersonalEntryInput = z.infer<typeof UpdatePersonalEntryInputSchema>

export interface CalendarEventItem {
  id: string
  userId: string
  sourceType: CalendarSourceType
  sourceId?: string | null
  title: string
  description?: string | null
  location?: string | null
  link?: string | null
  startsAt: string
  endsAt: string
  createdAt: string
  isPersonal: boolean
}
