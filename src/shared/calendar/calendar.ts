import { z } from 'zod'

export const CalendarSourceTypeSchema = z.enum([
  'meet',
  'event',
  'club_event',
  'class',
  'personal',
  'complaints',
  'lostfound',
])

export type CalendarSourceType = z.infer<typeof CalendarSourceTypeSchema>

export const AddCalendarEntryInputSchema = z
  .object({
    userId: z.string().uuid('Invalid user UUID for calendar entry'),
    sourceType: CalendarSourceTypeSchema,
    sourceId: z.string().optional(),
    title: z.string().min(1, 'Title is required').max(140, 'Title too long'),
    description: z.string().optional(),
    location: z.string().optional(),
    link: z.string().optional(),
    startsAt: z.string().datetime({ message: 'startsAt must be a valid ISO datetime string' }),
    endsAt: z.string().datetime({ message: 'endsAt must be a valid ISO datetime string' }),
  })
  .refine((data) => new Date(data.endsAt) >= new Date(data.startsAt), {
    message: 'endsAt must be after or equal to startsAt',
    path: ['endsAt'],
  })

export type AddCalendarEntryInput = z.infer<typeof AddCalendarEntryInputSchema>

export const RemoveCalendarEntryInputSchema = z.object({
  sourceType: CalendarSourceTypeSchema,
  sourceId: z.string().min(1, 'sourceId is required to remove entry'),
  userId: z.string().uuid().optional(),
})

export type RemoveCalendarEntryInput = z.infer<typeof RemoveCalendarEntryInputSchema>

export interface CalendarEntryRecord {
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
}

export type CalendarResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

/**
 * Shared helper to add an event or session to a user's calendar
 * Source of Truth: documents/CONTRACT.md §5.2
 */
export async function addCalendarEntry(
  input: AddCalendarEntryInput,
  client?: {
    from: (table: string) => {
      insert: (record: unknown) => {
        select: () => {
          single: () => Promise<{ data: unknown; error: unknown }>
        }
      }
    }
  }
): Promise<CalendarResult<CalendarEntryRecord>> {
  const parseResult = AddCalendarEntryInputSchema.safeParse(input)
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      },
    }
  }

  const { userId, sourceType, sourceId, title, description, location, link, startsAt, endsAt } =
    parseResult.data

  if (client) {
    try {
      const { data, error } = await client
        .from('calendar_entries')
        .insert({
          user_id: userId,
          source_type: sourceType,
          source_id: sourceId,
          title,
          description,
          location,
          link,
          starts_at: startsAt,
          ends_at: endsAt,
        })
        .select()
        .single()

      if (error || !data) {
        return {
          ok: false,
          error: {
            code: 'DB_ERROR',
            message: 'Failed to record entry in calendar_entries table',
          },
        }
      }

      const rec = data as {
        id: string
        user_id: string
        source_type: CalendarSourceType
        source_id?: string | null
        title: string
        description?: string | null
        location?: string | null
        link?: string | null
        starts_at: string
        ends_at: string
        created_at: string
      }

      return {
        ok: true,
        data: {
          id: rec.id,
          userId: rec.user_id,
          sourceType: rec.source_type,
          sourceId: rec.source_id,
          title: rec.title,
          description: rec.description,
          location: rec.location,
          link: rec.link,
          startsAt: rec.starts_at,
          endsAt: rec.ends_at,
          createdAt: rec.created_at,
        },
      }
    } catch {
      return {
        ok: false,
        error: {
          code: 'PERSISTENCE_FAILED',
          message: 'An unexpected error occurred while adding calendar entry',
        },
      }
    }
  }

  return {
    ok: true,
    data: {
      id: crypto.randomUUID(),
      userId,
      sourceType,
      sourceId,
      title,
      description,
      location,
      link,
      startsAt,
      endsAt,
      createdAt: new Date().toISOString(),
    },
  }
}

/**
 * Shared helper to remove a calendar entry (e.g. cancelled session, declined invite)
 * Source of Truth: documents/CONTRACT.md §5.2
 */
export async function removeCalendarEntry(
  input: RemoveCalendarEntryInput,
  client?: {
    from: (table: string) => {
      delete: () => {
        eq: (col: string, val: string) => {
          eq?: (col: string, val: string) => Promise<{ error: unknown }>
        }
      }
    }
  }
): Promise<CalendarResult<{ removed: boolean }>> {
  const parseResult = RemoveCalendarEntryInputSchema.safeParse(input)
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      },
    }
  }

  const { sourceType, sourceId } = parseResult.data

  if (client) {
    try {
      const deleteQuery = client.from('calendar_entries').delete().eq('source_type', sourceType)
      const res = deleteQuery.eq ? await deleteQuery.eq('source_id', sourceId) : await deleteQuery
      if (res && 'error' in res && res.error) {
        return {
          ok: false,
          error: {
            code: 'DB_ERROR',
            message: 'Failed to remove calendar entry from database',
          },
        }
      }
      return { ok: true, data: { removed: true } }
    } catch {
      return {
        ok: false,
        error: {
          code: 'DELETION_FAILED',
          message: 'An unexpected error occurred while removing calendar entry',
        },
      }
    }
  }

  return { ok: true, data: { removed: true } }
}
