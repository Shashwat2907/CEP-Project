import { z } from 'zod'

export const NotifyInputSchema = z.object({
  userId: z.string().uuid('Invalid user UUID for notification recipient'),
  type: z.string().min(3, 'Notification type required (e.g. complaint.escalated)'),
  title: z.string().min(1, 'Notification title required').max(120, 'Title too long'),
  body: z.string().min(1, 'Notification body required').max(500, 'Body too long'),
  link: z.string().optional(),
  payload: z.record(z.unknown()).optional().default({}),
})

export type NotifyInput = z.input<typeof NotifyInputSchema>

export interface NotificationRecord {
  id: string
  userId: string
  type: string
  title: string
  body: string
  link?: string | null
  payload: Record<string, unknown>
  readAt?: string | null
  createdAt: string
}

export type NotifyResult =
  | { ok: true; data: NotificationRecord }
  | { ok: false; error: { code: string; message: string } }

/**
 * Shared notification dispatcher
 * Source of Truth: documents/CONTRACT.md §5.2
 *
 * Dispatches an in-app notification to a user. Validated with Zod and adhering
 * to notification types registry conventions.
 */
export async function notify(
  input: NotifyInput,
  client?: {
    from: (table: string) => {
      insert: (record: unknown) => {
        select: () => {
          single: () => Promise<{ data: unknown; error: unknown }>
        }
      }
    }
  }
): Promise<NotifyResult> {
  const parseResult = NotifyInputSchema.safeParse(input)
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      },
    }
  }

  const { userId, type, title, body, link, payload } = parseResult.data

  // If a mock or active Supabase client is passed, persist to notifications table
  if (client) {
    try {
      const { data, error } = await client
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          body,
          link,
          payload,
        })
        .select()
        .single()

      if (error || !data) {
        return {
          ok: false,
          error: {
            code: 'DB_ERROR',
            message: 'Failed to record notification in database',
          },
        }
      }

      const rec = data as {
        id: string
        user_id: string
        type: string
        title: string
        body: string
        link?: string | null
        payload: Record<string, unknown>
        read_at?: string | null
        created_at: string
      }

      return {
        ok: true,
        data: {
          id: rec.id,
          userId: rec.user_id,
          type: rec.type,
          title: rec.title,
          body: rec.body,
          link: rec.link,
          payload: rec.payload,
          readAt: rec.read_at,
          createdAt: rec.created_at,
        },
      }
    } catch {
      return {
        ok: false,
        error: {
          code: 'PERSISTENCE_FAILED',
          message: 'An unexpected error occurred while saving notification',
        },
      }
    }
  }

  // Pure in-memory / unit fallback
  return {
    ok: true,
    data: {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      body,
      link,
      payload,
      readAt: null,
      createdAt: new Date().toISOString(),
    },
  }
}
