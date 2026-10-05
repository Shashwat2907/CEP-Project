import { describe, it, expect } from 'vitest'
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CALENDAR_SOURCE_METAS,
  CreatePersonalEntryInputSchema,
  UpdatePersonalEntryInputSchema,
  type CalendarEventItem,
} from '@/features/calendar/schema'
import {
  getCalendarEntriesAction,
  getTodayCalendarEntriesAction,
  createPersonalEntryAction,
  updatePersonalEntryAction,
  deletePersonalEntryAction,
} from '@/features/calendar/actions'
import { TodayScheduleBlock } from '@/features/calendar/components/today-schedule-block'
import { CalendarView } from '@/features/calendar/components/calendar-view'

describe('Calendar Feature — Schema & Design Tokens (DESIGN.MD §8, PLAN.MD §5.11)', () => {
  it('defines 5-color categorical palette distinct from status colors', () => {
    // 5 primary categories per DESIGN.MD §8
    expect(CALENDAR_SOURCE_METAS.class.hex).toBe('#0EA5E9')
    expect(CALENDAR_SOURCE_METAS.meet.hex).toBe('#3B82F6')
    expect(CALENDAR_SOURCE_METAS.event.hex).toBe('#8B5CF6')
    expect(CALENDAR_SOURCE_METAS.club_event.hex).toBe('#EC4899')
    expect(CALENDAR_SOURCE_METAS.personal.hex).toBe('#6B7280')

    // Additional cross-module sources
    expect(CALENDAR_SOURCE_METAS.complaints.hex).toBe('#D64545')
    expect(CALENDAR_SOURCE_METAS.lostfound.hex).toBe('#D98A00')
  })

  it('validates personal entry input schemas', () => {
    const valid = CreatePersonalEntryInputSchema.safeParse({
      title: 'Study OS Paging',
      description: 'Review textbook chapter 8',
      location: 'Library',
      startsAt: '2026-10-04T10:00:00Z',
      endsAt: '2026-10-04T11:30:00Z',
    })
    expect(valid.success).toBe(true)

    const invalidTimes = CreatePersonalEntryInputSchema.safeParse({
      title: 'Study OS Paging',
      startsAt: '2026-10-04T12:00:00Z',
      endsAt: '2026-10-04T10:00:00Z', // ends before starts
    })
    expect(invalidTimes.success).toBe(false)
  })

  it('validates update personal entry schema', () => {
    const valid = UpdatePersonalEntryInputSchema.safeParse({
      id: '11111111-2222-3333-4444-555555555555',
      title: 'Updated title',
      startsAt: '2026-10-04T10:00:00Z',
      endsAt: '2026-10-04T11:00:00Z',
    })
    expect(valid.success).toBe(true)
  })
})

describe('Calendar Feature — Server Actions', () => {
  it('aggregates entries across classes, meets, events, and personal items', async () => {
    const entries = await getCalendarEntriesAction()
    expect(entries.length).toBeGreaterThan(0)

    const sourceTypes = entries.map((e) => e.sourceType)
    expect(sourceTypes).toContain('class')
    expect(sourceTypes).toContain('meet')
    expect(sourceTypes).toContain('personal')
  })

  it('filters entries by source type', async () => {
    const meetOnly = await getCalendarEntriesAction({ sourceTypes: ['meet'] })
    expect(meetOnly.every((e) => e.sourceType === 'meet')).toBe(true)
  })

  it('fetches today schedule block items', async () => {
    const todayItems = await getTodayCalendarEntriesAction()
    expect(Array.isArray(todayItems)).toBe(true)
  })

  it('creates and updates personal calendar entries', async () => {
    const created = await createPersonalEntryAction({
      title: 'Hackathon Practice Session',
      location: 'Lab 2',
      startsAt: '2026-10-04T16:00:00Z',
      endsAt: '2026-10-04T18:00:00Z',
    })

    expect(created.ok).toBe(true)
    expect(created.data?.title).toBe('Hackathon Practice Session')
    expect(created.data?.isPersonal).toBe(true)

    const updated = await updatePersonalEntryAction({
      id: '11111111-2222-3333-4444-555555555555',
      title: 'Updated Session Title',
      startsAt: '2026-10-04T16:00:00Z',
      endsAt: '2026-10-04T18:00:00Z',
    })
    expect(updated.ok).toBe(true)

    const deleted = await deletePersonalEntryAction('11111111-2222-3333-4444-555555555555')
    expect(deleted.ok).toBe(true)
  })
})

describe('Calendar Feature — UI Components (DESIGN.MD §8, PLAN.MD §5.11)', () => {
  const sampleEntries: CalendarEventItem[] = [
    {
      id: 'c1',
      userId: 'u1',
      sourceType: 'class',
      title: 'CS302: Operating Systems',
      description: 'Virtual Memory and Paging Algorithms',
      location: 'Block A, Room 402',
      link: '/acad/cs302',
      startsAt: '2026-10-04T09:00:00Z',
      endsAt: '2026-10-04T10:30:00Z',
      createdAt: '2026-10-01T00:00:00Z',
      isPersonal: false,
    },
    {
      id: 'c2',
      userId: 'u1',
      sourceType: 'meet',
      title: '1:1 Mentorship Session',
      location: 'Department Office',
      link: '/meet',
      startsAt: '2026-10-04T11:00:00Z',
      endsAt: '2026-10-04T12:00:00Z',
      createdAt: '2026-10-01T00:00:00Z',
      isPersonal: false,
    },
    {
      id: 'c3',
      userId: 'u1',
      sourceType: 'personal',
      title: 'Assignment 3 Submission Deadline',
      location: 'Hostel Room',
      startsAt: '2026-10-04T17:00:00Z',
      endsAt: '2026-10-04T18:00:00Z',
      createdAt: '2026-10-01T00:00:00Z',
      isPersonal: true,
    },
  ]

  it('renders TodayScheduleBlock with colored left bars per source', () => {
    render(<TodayScheduleBlock initialEntries={sampleEntries} />)

    expect(screen.getByText('Today on Campus')).toBeInTheDocument()
    expect(screen.getByText('CS302: Operating Systems')).toBeInTheDocument()
    expect(screen.getByText('1:1 Mentorship Session')).toBeInTheDocument()
    expect(screen.getByText('Assignment 3 Submission Deadline')).toBeInTheDocument()
    expect(screen.getByText('Full calendar')).toBeInTheDocument()
  })

  it('renders CalendarView with Day, Week, and Agenda modes', () => {
    render(<CalendarView initialEntries={sampleEntries} initialViewMode="agenda" />)

    expect(screen.getByText('Campus Calendar')).toBeInTheDocument()

    // Mode tabs
    const dayBtn = screen.getByRole('button', { name: /^day$/i })
    const weekBtn = screen.getByRole('button', { name: /^week$/i })
    const agendaBtn = screen.getByRole('button', { name: /^agenda$/i })

    expect(dayBtn).toBeInTheDocument()
    expect(weekBtn).toBeInTheDocument()
    expect(agendaBtn).toBeInTheDocument()

    // Switch to Day view
    fireEvent.click(dayBtn)
    expect(screen.getByText(/Timeline for/i)).toBeInTheDocument()

    // Switch to Week view
    fireEvent.click(weekBtn)
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
  })

  it('filters entries when toggling source chips in CalendarView', () => {
    render(<CalendarView initialEntries={sampleEntries} initialViewMode="agenda" />)

    expect(screen.getByText('CS302: Operating Systems')).toBeInTheDocument()

    // Toggle off Classes & Labs
    const classFilterChip = screen.getByRole('button', { name: /Classes & Labs/i })
    fireEvent.click(classFilterChip)

    // Class entry should now be hidden
    expect(screen.queryByText('CS302: Operating Systems')).not.toBeInTheDocument()
    // Other entries should still exist
    expect(screen.getByText('1:1 Mentorship Session')).toBeInTheDocument()
  })
})
