import { z } from 'zod'

export const OutboxEventInputSchema = z.object({
  type: z.string().min(3, 'Event type required (e.g. complaint.escalated)'),
  payload: z.record(z.unknown()),
})

export type OutboxEventInput = z.infer<typeof OutboxEventInputSchema>

export interface OutboxRecord {
  id: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
  processedAt?: string | null
}

export type OutboxResult =
  | { ok: true; data: OutboxRecord }
  | { ok: false; error: { code: string; message: string } }

/**
 * Shared helper to emit asynchronous cross-feature events to events_outbox
 * Source of Truth: documents/CONTRACT.md §5.2 & §5.4
 */
export async function emitEvent(
  input: OutboxEventInput,
  client?: {
    from: (table: string) => {
      insert: (record: unknown) => {
        select: () => {
          single: () => Promise<{ data: unknown; error: unknown }>
        }
      }
    }
  }
): Promise<OutboxResult> {
  const parseResult = OutboxEventInputSchema.safeParse(input)
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      },
    }
  }

  const { type, payload } = parseResult.data

  if (client) {
    try {
      const { data, error } = await client
        .from('events_outbox')
        .insert({
          type,
          payload,
        })
        .select()
        .single()

      if (error || !data) {
        return {
          ok: false,
          error: {
            code: 'DB_ERROR',
            message: 'Failed to enqueue outbox event',
          },
        }
      }

      const rec = data as {
        id: string
        type: string
        payload: Record<string, unknown>
        created_at: string
        processed_at?: string | null
      }

      return {
        ok: true,
        data: {
          id: rec.id,
          type: rec.type,
          payload: rec.payload,
          createdAt: rec.created_at,
          processedAt: rec.processed_at,
        },
      }
    } catch {
      return {
        ok: false,
        error: {
          code: 'PERSISTENCE_FAILED',
          message: 'An unexpected error occurred while writing outbox event',
        },
      }
    }
  }

  return {
    ok: true,
    data: {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      processedAt: null,
    },
  }
}
