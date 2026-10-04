'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  AvailabilityRule,
  AvailabilityException,
  GeneratedSlot,
  TeacherSummary,
} from './schema'

/**
 * Read-side queries and slot generation engine for Campus Meet.
 * Source of truth: src/features/meet/README.md §6
 */

// ---------------------------------------------------------------------------
// 1. Teacher Directory & Profiles
// ---------------------------------------------------------------------------

/** Fetch all verified teachers available for student booking. */
export async function getTeachersList(): Promise<TeacherSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, department, office_hours_text, avatar_url, email')
    .eq('role_primary', 'teacher')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[meet/queries] getTeachersList error:', error.message)
    return []
  }

  return (data as TeacherSummary[]) ?? []
}

/** Fetch specific teacher summary. */
export async function getTeacherProfile(teacherId: string): Promise<TeacherSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, department, office_hours_text, avatar_url, email')
    .eq('id', teacherId)
    .single()

  if (error || !data) {
    console.error('[meet/queries] getTeacherProfile error:', error?.message)
    return null
  }

  return data as TeacherSummary
}

// ---------------------------------------------------------------------------
// 2. Teacher Availability Rules & Exceptions
// ---------------------------------------------------------------------------

/** Fetch weekly recurring availability rules for a teacher. */
export async function getTeacherAvailabilityRules(
  teacherId: string
): Promise<AvailabilityRule[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('[meet/queries] getTeacherAvailabilityRules error:', error.message)
    return []
  }

  return (data as AvailabilityRule[]) ?? []
}

/** Fetch date exceptions for a teacher within a date range. */
export async function getTeacherExceptions(
  teacherId: string,
  startDate?: string,
  endDate?: string
): Promise<AvailabilityException[]> {
  const supabase = await createClient()
  let query = supabase
    .from('availability_exceptions')
    .select('*')
    .eq('teacher_id', teacherId)

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query.order('date', { ascending: true })

  if (error) {
    console.error('[meet/queries] getTeacherExceptions error:', error.message)
    return []
  }

  return (data as AvailabilityException[]) ?? []
}

// ---------------------------------------------------------------------------
// 3. Slot Generation Engine (On-the-fly calculation)
// ---------------------------------------------------------------------------

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function getDayOfWeek(dateStr: string): number {
  // Parse YYYY-MM-DD cleanly without local timezone shifts
  const [y, m, d] = dateStr.split('-').map(Number)
  const dateObj = new Date(Date.UTC(y, m - 1, d))
  return dateObj.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

/**
 * Generates open, bookable slots for a teacher on a specific date.
 * Per src/features/meet/README.md:
 * 1. Find teacher's weekly recurring rules matching the weekday.
 * 2. Segment rules into slot_minutes intervals.
 * 3. Filter out any 'blocked' exceptions (whole-day or overlapping time ranges).
 * 4. Add any 'extra' exception slots.
 * 5. Return sorted GeneratedSlot list.
 */
export async function generateTeacherSlots(
  teacherId: string,
  dateStr: string
): Promise<GeneratedSlot[]> {
  const supabase = await createClient()
  const weekday = getDayOfWeek(dateStr)

  // 1. Fetch recurring rules for this weekday
  const { data: rulesData } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('weekday', weekday)

  const rules: AvailabilityRule[] = rulesData ?? []

  // 2. Fetch exceptions for this specific date
  const { data: exceptionsData } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('date', dateStr)

  const exceptions: AvailabilityException[] = exceptionsData ?? []

  // Check if entire day is blocked
  const fullDayBlocked = exceptions.some(
    (e) => e.kind === 'blocked' && (!e.start_time || !e.end_time)
  )

  const slots: GeneratedSlot[] = []

  // 3. Generate recurring slots if day is not fully blocked
  if (!fullDayBlocked) {
    for (const rule of rules) {
      const startMin = timeToMinutes(rule.start_time)
      const endMin = timeToMinutes(rule.end_time)
      const step = rule.slot_minutes

      for (let curr = startMin; curr + step <= endMin; curr += step) {
        const slotStartStr = minutesToTime(curr)
        const slotEndStr = minutesToTime(curr + step)

        // Check if blocked by a partial-time exception
        const isBlocked = exceptions.some((e) => {
          if (e.kind !== 'blocked' || !e.start_time || !e.end_time) return false
          const bStart = timeToMinutes(e.start_time)
          const bEnd = timeToMinutes(e.end_time)
          // Overlaps if slot starts before block ends AND slot ends after block starts
          return curr < bEnd && curr + step > bStart
        })

        if (!isBlocked) {
          slots.push({
            id: `${teacherId}-${dateStr}-${slotStartStr}`,
            teacher_id: teacherId,
            date: dateStr,
            start_time: slotStartStr,
            end_time: slotEndStr,
            slot_minutes: step,
            is_available: true,
            override_type: 'regular',
          })
        }
      }
    }
  }

  // 4. Add extra slots from exceptions
  const extraExceptions = exceptions.filter(
    (e) => e.kind === 'extra' && e.start_time && e.end_time
  )

  for (const extra of extraExceptions) {
    const startMin = timeToMinutes(extra.start_time!)
    const endMin = timeToMinutes(extra.end_time!)
    const step = 30 // default 30 min for extra sessions

    for (let curr = startMin; curr + step <= endMin; curr += step) {
      const slotStartStr = minutesToTime(curr)
      const slotEndStr = minutesToTime(curr + step)

      // Avoid duplicates if already generated
      if (!slots.some((s) => s.start_time === slotStartStr)) {
        slots.push({
          id: `${teacherId}-${dateStr}-${slotStartStr}`,
          teacher_id: teacherId,
          date: dateStr,
          start_time: slotStartStr,
          end_time: slotEndStr,
          slot_minutes: step,
          is_available: true,
          override_type: 'extra',
        })
      }
    }
  }

  // 5. Sort by start_time ASC
  return slots.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
}
