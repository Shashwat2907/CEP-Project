'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/shared/auth/guards'
import { revalidatePath } from 'next/cache'
import {
  SaveAvailabilityRuleSchema,
  AddExceptionSchema,
  DeleteRuleSchema,
  DeleteExceptionSchema,
  type SaveAvailabilityRuleInput,
  type AddExceptionInput,
  type DeleteRuleInput,
  type DeleteExceptionInput,
  type ActionResult,
  type GeneratedSlot,
} from './schema'
import { generateTeacherSlots } from './queries'

/**
 * Server Actions for Meet Availability (Rules & Exceptions).
 * Source of truth: src/features/meet/README.md §6
 */

// ---------------------------------------------------------------------------
// 1. Save or Update Weekly Rule
// ---------------------------------------------------------------------------

export async function saveAvailabilityRule(
  input: SaveAvailabilityRuleInput
): Promise<ActionResult<{ ruleId: string }>> {
  const { user, profile } = await requireAuth()

  const isTeacher = profile.role_primary === 'teacher'
  const isAdmin = profile.role_primary === 'admin'
  if (!isTeacher && !isAdmin) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Only faculty members can configure availability rules' },
    }
  }

  const parsed = SaveAvailabilityRuleSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid rule' },
    }
  }

  const { id, weekday, start_time, end_time, slot_minutes } = parsed.data
  const supabase = await createClient()

  if (id) {
    // Update existing rule
    const { error } = await supabase
      .from('availability_rules')
      .update({ weekday, start_time, end_time, slot_minutes })
      .eq('id', id)
      .eq('teacher_id', user.id)

    if (error) {
      console.error('[meet/actions] updateRule error:', error.message)
      return { ok: false, error: { code: 'DB_UPDATE_FAILED', message: error.message } }
    }

    revalidatePath('/meet')
    revalidatePath('/meet/availability')
    return { ok: true, data: { ruleId: id } }
  }

  // Insert new rule
  const { data: newRow, error } = await supabase
    .from('availability_rules')
    .insert({
      teacher_id: user.id,
      weekday,
      start_time,
      end_time,
      slot_minutes,
    })
    .select('id')
    .single()

  if (error || !newRow) {
    console.error('[meet/actions] insertRule error:', error?.message)
    return {
      ok: false,
      error: { code: 'DB_INSERT_FAILED', message: error?.message ?? 'Failed to save rule' },
    }
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: { ruleId: newRow.id } }
}

// ---------------------------------------------------------------------------
// 2. Delete Weekly Rule
// ---------------------------------------------------------------------------

export async function deleteAvailabilityRule(
  input: DeleteRuleInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = DeleteRuleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid rule ID' } }
  }

  const supabase = await createClient()
  let query = supabase.from('availability_rules').delete().eq('id', parsed.data.rule_id)

  if (profile.role_primary !== 'admin') {
    query = query.eq('teacher_id', user.id)
  }

  const { error } = await query
  if (error) {
    console.error('[meet/actions] deleteRule error:', error.message)
    return { ok: false, error: { code: 'DB_DELETE_FAILED', message: error.message } }
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 3. Add Date Exception (Blocked / Extra)
// ---------------------------------------------------------------------------

export async function addAvailabilityException(
  input: AddExceptionInput
): Promise<ActionResult<{ exceptionId: string }>> {
  const { user, profile } = await requireAuth()

  const isTeacher = profile.role_primary === 'teacher'
  const isAdmin = profile.role_primary === 'admin'
  if (!isTeacher && !isAdmin) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Only faculty members can set date overrides' },
    }
  }

  const parsed = AddExceptionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid exception' },
    }
  }

  const { date, kind, start_time, end_time, reason } = parsed.data
  const supabase = await createClient()

  const { data: newRow, error } = await supabase
    .from('availability_exceptions')
    .insert({
      teacher_id: user.id,
      date,
      kind,
      start_time: start_time || null,
      end_time: end_time || null,
      reason: reason || null,
    })
    .select('id')
    .single()

  if (error || !newRow) {
    console.error('[meet/actions] addException error:', error?.message)
    return {
      ok: false,
      error: { code: 'DB_INSERT_FAILED', message: error?.message ?? 'Failed to add exception' },
    }
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: { exceptionId: newRow.id } }
}

// ---------------------------------------------------------------------------
// 4. Delete Date Exception
// ---------------------------------------------------------------------------

export async function deleteAvailabilityException(
  input: DeleteExceptionInput
): Promise<ActionResult> {
  const { user, profile } = await requireAuth()

  const parsed = DeleteExceptionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid exception ID' } }
  }

  const supabase = await createClient()
  let query = supabase.from('availability_exceptions').delete().eq('id', parsed.data.exception_id)

  if (profile.role_primary !== 'admin') {
    query = query.eq('teacher_id', user.id)
  }

  const { error } = await query
  if (error) {
    console.error('[meet/actions] deleteException error:', error.message)
    return { ok: false, error: { code: 'DB_DELETE_FAILED', message: error.message } }
  }

  revalidatePath('/meet')
  revalidatePath('/meet/availability')
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// 5. Client Action: Dynamic Slot Fetching
// ---------------------------------------------------------------------------

export async function fetchSlotsAction(
  teacherId: string,
  dateStr: string
): Promise<GeneratedSlot[]> {
  return generateTeacherSlots(teacherId, dateStr)
}
