import { z } from 'zod'

export const AuditInputSchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().min(1, 'Action description required').max(80, 'Action too long'),
  entity: z.string().min(1, 'Entity type required').max(80, 'Entity name too long'),
  entityId: z.string().optional(),
  meta: z.record(z.unknown()).optional().default({}),
})

export type AuditInput = z.input<typeof AuditInputSchema>

export interface AuditRecord {
  id: string
  actorId?: string | null
  action: string
  entity: string
  entityId?: string | null
  at: string
  meta: Record<string, unknown>
}

export type AuditResult =
  | { ok: true; data: AuditRecord }
  | { ok: false; error: { code: string; message: string } }

/**
 * Shared audit log helper for recording sensitive actions
 * Source of Truth: documents/CONTRACT.md §5.2
 */
export async function writeAudit(
  input: AuditInput,
  client?: {
    from: (table: string) => {
      insert: (record: unknown) => {
        select: () => {
          single: () => Promise<{ data: unknown; error: unknown }>
        }
      }
    }
  }
): Promise<AuditResult> {
  const parseResult = AuditInputSchema.safeParse(input)
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      },
    }
  }

  const { actorId, action, entity, entityId, meta } = parseResult.data

  if (client) {
    try {
      const { data, error } = await client
        .from('audit_log')
        .insert({
          actor_id: actorId,
          action,
          entity,
          entity_id: entityId,
          meta,
        })
        .select()
        .single()

      if (error || !data) {
        return {
          ok: false,
          error: {
            code: 'DB_ERROR',
            message: 'Failed to record audit log in database',
          },
        }
      }

      const rec = data as {
        id: string
        actor_id?: string | null
        action: string
        entity: string
        entity_id?: string | null
        at: string
        meta: Record<string, unknown>
      }

      return {
        ok: true,
        data: {
          id: rec.id,
          actorId: rec.actor_id,
          action: rec.action,
          entity: rec.entity,
          entityId: rec.entity_id,
          at: rec.at,
          meta: rec.meta,
        },
      }
    } catch {
      return {
        ok: false,
        error: {
          code: 'PERSISTENCE_FAILED',
          message: 'An unexpected error occurred while writing audit record',
        },
      }
    }
  }

  return {
    ok: true,
    data: {
      id: crypto.randomUUID(),
      actorId: actorId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      at: new Date().toISOString(),
      meta,
    },
  }
}
