import { describe, it, expect } from 'vitest'
import {
  SaveAvailabilityRuleSchema,
  AddExceptionSchema,
  type AvailabilityRule,
  type AvailabilityException,
  type GeneratedSlot,
} from '@/features/meet/schema'

/**
 * Unit tests for Campus Meet: Teacher Availability & Slot Generation Engine.
 * Source of truth: src/features/meet/README.md & TEAM_TASKS.md (feat/meet-availability)
 */

describe('Meet Availability Schemas', () => {
  it('validates a valid recurring availability rule', () => {
    const valid = SaveAvailabilityRuleSchema.safeParse({
      weekday: 1, // Monday
      start_time: '14:00',
      end_time: '16:00',
      slot_minutes: 30,
    })
    expect(valid.success).toBe(true)
  })

  it('rejects an availability rule where end_time <= start_time', () => {
    const invalid = SaveAvailabilityRuleSchema.safeParse({
      weekday: 2,
      start_time: '16:00',
      end_time: '14:00',
      slot_minutes: 30,
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.errors[0]?.message).toContain('End time must be later than start time')
    }
  })

  it('rejects an invalid slot_minutes duration', () => {
    const invalid = SaveAvailabilityRuleSchema.safeParse({
      weekday: 3,
      start_time: '09:00',
      end_time: '11:00',
      slot_minutes: 25 as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    })
    expect(invalid.success).toBe(false)
  })

  it('validates a whole-day blocked exception', () => {
    const valid = AddExceptionSchema.safeParse({
      date: '2026-10-15',
      kind: 'blocked',
      reason: 'Department Review & Conference',
    })
    expect(valid.success).toBe(true)
  })

  it('validates a partial-day extra slots exception', () => {
    const valid = AddExceptionSchema.safeParse({
      date: '2026-10-20',
      kind: 'extra',
      start_time: '10:00',
      end_time: '12:00',
      reason: 'Extra office hours before midterms',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects an exception where end_time <= start_time', () => {
    const invalid = AddExceptionSchema.safeParse({
      date: '2026-10-20',
      kind: 'extra',
      start_time: '12:00',
      end_time: '10:00',
    })
    expect(invalid.success).toBe(false)
  })
})

describe('Slot Generation Algorithm Logic', () => {
  function timeToMinutes(t: string): number {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }

  function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  function computeSlots(
    rules: AvailabilityRule[],
    exceptions: AvailabilityException[],
    dateStr: string,
    teacherId = 'teacher-1'
  ): GeneratedSlot[] {
    const fullDayBlocked = exceptions.some(
      (e) => e.kind === 'blocked' && (!e.start_time || !e.end_time)
    )

    const slots: GeneratedSlot[] = []

    if (!fullDayBlocked) {
      for (const rule of rules) {
        const startMin = timeToMinutes(rule.start_time)
        const endMin = timeToMinutes(rule.end_time)
        const step = rule.slot_minutes

        for (let curr = startMin; curr + step <= endMin; curr += step) {
          const slotStartStr = minutesToTime(curr)
          const slotEndStr = minutesToTime(curr + step)

          const isBlocked = exceptions.some((e) => {
            if (e.kind !== 'blocked' || !e.start_time || !e.end_time) return false
            const bStart = timeToMinutes(e.start_time)
            const bEnd = timeToMinutes(e.end_time)
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

    // Extra slots
    const extraExceptions = exceptions.filter(
      (e) => e.kind === 'extra' && e.start_time && e.end_time
    )

    for (const extra of extraExceptions) {
      const startMin = timeToMinutes(extra.start_time!)
      const endMin = timeToMinutes(extra.end_time!)
      const step = 30

      for (let curr = startMin; curr + step <= endMin; curr += step) {
        const slotStartStr = minutesToTime(curr)
        const slotEndStr = minutesToTime(curr + step)

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

    return slots.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
  }

  it('generates regular slots accurately from 30-min window', () => {
    const rules: AvailabilityRule[] = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        teacher_id: '20000000-0000-0000-0000-000000000002',
        weekday: 1,
        start_time: '14:00:00',
        end_time: '16:00:00',
        slot_minutes: 30,
      },
    ]

    const slots = computeSlots(rules, [], '2026-10-12')
    expect(slots.length).toBe(4)
    expect(slots[0].start_time).toBe('14:00')
    expect(slots[0].end_time).toBe('14:30')
    expect(slots[3].start_time).toBe('15:30')
    expect(slots[3].end_time).toBe('16:00')
    expect(slots.every((s) => s.override_type === 'regular')).toBe(true)
  })

  it('generates slots for non-standard duration (e.g. 45-min slots)', () => {
    const rules: AvailabilityRule[] = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        teacher_id: '20000000-0000-0000-0000-000000000002',
        weekday: 1,
        start_time: '14:00:00',
        end_time: '16:00:00',
        slot_minutes: 45,
      },
    ]

    const slots = computeSlots(rules, [], '2026-10-12')
    // 120 mins / 45 = 2 slots (14:00-14:45, 14:45-15:30), remaining 30 mins dropped
    expect(slots.length).toBe(2)
    expect(slots[0].start_time).toBe('14:00')
    expect(slots[0].end_time).toBe('14:45')
    expect(slots[1].start_time).toBe('14:45')
    expect(slots[1].end_time).toBe('15:30')
  })

  it('drops all recurring slots on a full-day blocked holiday', () => {
    const rules: AvailabilityRule[] = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        teacher_id: '20000000-0000-0000-0000-000000000002',
        weekday: 1,
        start_time: '14:00:00',
        end_time: '16:00:00',
        slot_minutes: 30,
      },
    ]

    const exceptions: AvailabilityException[] = [
      {
        id: '30000000-0000-0000-0000-000000000003',
        teacher_id: '20000000-0000-0000-0000-000000000002',
        date: '2026-10-12',
        kind: 'blocked',
        reason: 'National Holiday',
      },
    ]

    const slots = computeSlots(rules, exceptions, '2026-10-12')
    expect(slots.length).toBe(0)
  })

  it('drops only overlapping slots on a partial-day blocked exception', () => {
    const rules: AvailabilityRule[] = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        teacher_id: '20000000-0000-0000-0000-000000000002',
        weekday: 1,
        start_time: '14:00:00',
        end_time: '16:00:00',
        slot_minutes: 30,
      },
    ]

    // Block 14:00 to 15:00 for meeting
    const exceptions: AvailabilityException[] = [
      {
        id: '30000000-0000-0000-0000-000000000003',
        teacher_id: '20000000-0000-0000-0000-000000000002',
        date: '2026-10-12',
        start_time: '14:00:00',
        end_time: '15:00:00',
        kind: 'blocked',
        reason: 'Faculty Meeting',
      },
    ]

    const slots = computeSlots(rules, exceptions, '2026-10-12')
    // 14:00-14:30 and 14:30-15:00 are blocked. 15:00-15:30 and 15:30-16:00 remain.
    expect(slots.length).toBe(2)
    expect(slots[0].start_time).toBe('15:00')
    expect(slots[0].end_time).toBe('15:30')
    expect(slots[1].start_time).toBe('15:30')
    expect(slots[1].end_time).toBe('16:00')
  })

  it('adds extra slots for special review days', () => {
    // No recurring rules
    const exceptions: AvailabilityException[] = [
      {
        id: '30000000-0000-0000-0000-000000000003',
        teacher_id: '20000000-0000-0000-0000-000000000002',
        date: '2026-10-17', // Saturday
        start_time: '10:00:00',
        end_time: '11:00:00',
        kind: 'extra',
        reason: 'Project Review viva',
      },
    ]

    const slots = computeSlots([], exceptions, '2026-10-17')
    expect(slots.length).toBe(2)
    expect(slots[0].start_time).toBe('10:00')
    expect(slots[0].end_time).toBe('10:30')
    expect(slots[0].override_type).toBe('extra')
    expect(slots[1].start_time).toBe('10:30')
    expect(slots[1].end_time).toBe('11:00')
    expect(slots[1].override_type).toBe('extra')
  })
})
