import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  CreateEventInputSchema,
  RsvpEventInputSchema,
  CreateEventTeamInputSchema,
  PostEventMessageInputSchema,
  type EventItem,
} from '@/features/events/schema'
import {
  getEventsAction,
  getEventByIdAction,
  createEventAction,
  rsvpEventAction,
  cancelRsvpAction,
  createEventTeamAction,
  postEventMessageAction,
  approveEventAction,
  rejectEventAction,
} from '@/features/events/actions'
import { EventCard } from '@/features/events/components/event-card'
import { EventsList } from '@/features/events/components/events-list'
import { EventDetailModal } from '@/features/events/components/event-detail-modal'

describe('Events Feature — Schemas & Validation (PLAN.MD §5.9 & TEAM_TASKS)', () => {
  it('validates college and external event creation schema', () => {
    const validCollege = CreateEventInputSchema.safeParse({
      kind: 'college',
      title: 'Turing Workshop: Distributed Consensus',
      description: 'Hands-on seminar exploring Paxos and Raft consensus algorithms.',
      organizerName: 'Turing Society',
      organizerType: 'club',
      location: 'Seminar Hall 3',
      startsAt: '2026-10-10T10:00:00Z',
      endsAt: '2026-10-10T13:00:00Z',
      tags: ['Systems', 'Distributed', 'Workshop'],
      allowTeams: false,
    })
    expect(validCollege.success).toBe(true)

    const validExternal = CreateEventInputSchema.safeParse({
      kind: 'external',
      title: 'Global Hackathon 2026',
      description: 'Annual 48-hour student hackathon with hardware lab and AI track.',
      organizerName: 'External Organizer: OpenDev Foundation',
      organizerType: 'external',
      location: 'Convention Arena A',
      startsAt: '2026-11-01T09:00:00Z',
      endsAt: '2026-11-03T18:00:00Z',
      registrationLink: 'https://opendev.org/hack',
      tags: ['Hackathon', 'AI'],
      allowTeams: true,
      minTeamSize: 2,
      maxTeamSize: 4,
    })
    expect(validExternal.success).toBe(true)
  })

  it('rejects invalid event times and short titles', () => {
    const invalidTime = CreateEventInputSchema.safeParse({
      kind: 'college',
      title: 'Invalid Event',
      description: 'This has invalid time bounds where endsAt is before startsAt.',
      organizerName: 'Robotics Club',
      organizerType: 'club',
      location: 'Lab 1',
      startsAt: '2026-10-10T15:00:00Z',
      endsAt: '2026-10-10T10:00:00Z', // ends before starts
      tags: [],
    })
    expect(invalidTime.success).toBe(false)

    const shortTitle = CreateEventInputSchema.safeParse({
      kind: 'college',
      title: 'Hi', // too short
      description: 'Valid long description here for testing.',
      organizerName: 'ACM',
      organizerType: 'club',
      location: 'Hall',
      startsAt: '2026-10-10T10:00:00Z',
      endsAt: '2026-10-10T12:00:00Z',
    })
    expect(shortTitle.success).toBe(false)
  })

  it('validates RSVP and team input schemas', () => {
    const validRsvp = RsvpEventInputSchema.safeParse({
      eventId: '11111111-2222-3333-4444-555555555555',
      status: 'attending',
      addToCalendar: true,
    })
    expect(validRsvp.success).toBe(true)

    const validTeam = CreateEventTeamInputSchema.safeParse({
      eventId: '11111111-2222-3333-4444-555555555555',
      name: 'AsyncWarriors',
      lookingForMembers: true,
      desiredSkills: ['Rust', 'Tokio', 'PostgreSQL'],
      notes: 'Building high-throughput telemetry pipeline.',
    })
    expect(validTeam.success).toBe(true)

    const validMsg = PostEventMessageInputSchema.safeParse({
      eventId: '11111111-2222-3333-4444-555555555555',
      content: 'Will certificates be provided for attendees?',
    })
    expect(validMsg.success).toBe(true)
  })
})

describe('Events Feature — Server Actions & Workflows', () => {
  it('fetches events with college and external separation', async () => {
    const allEvents = await getEventsAction()
    expect(allEvents.length).toBeGreaterThan(0)

    const collegeEvents = await getEventsAction({ kind: 'college' })
    expect(collegeEvents.every((e) => e.kind === 'college')).toBe(true)

    const externalEvents = await getEventsAction({ kind: 'external' })
    expect(externalEvents.every((e) => e.kind === 'external')).toBe(true)
  })

  it('creates an event with approval requirement notice', async () => {
    const res = await createEventAction({
      kind: 'college',
      title: 'Autonomous Robotics Showcase',
      description: 'Demonstrations of obstacle avoiding quadcopters and robotic arms.',
      organizerName: 'Robotics & Automation Society',
      organizerType: 'club',
      location: 'Mechanical Workshop 101',
      startsAt: '2026-10-25T14:00:00Z',
      endsAt: '2026-10-25T17:00:00Z',
      tags: ['Robotics', 'Hardware'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
    })

    expect(res.ok).toBe(true)
    expect(res.data?.title).toBe('Autonomous Robotics Showcase')
    expect(res.data?.status).toBe('pending') // Requires approval
    expect(res.message).toContain('approval queue')
  })

  it('performs RSVP and automatically syncs to calendar with one tap', async () => {
    const events = await getEventsAction()
    const targetEvent = events[0]
    expect(targetEvent).toBeDefined()

    const rsvpRes = await rsvpEventAction({
      eventId: targetEvent.id,
      status: 'attending',
      addToCalendar: true,
    })

    expect(rsvpRes.ok).toBe(true)
    expect(rsvpRes.status).toBe('attending')
    expect(rsvpRes.addedToCalendar).toBe(true)

    // Cancel RSVP
    const cancelRes = await cancelRsvpAction(targetEvent.id)
    expect(cancelRes.ok).toBe(true)
  })

  it('allows forming hackathon teams and posting discussion messages', async () => {
    const events = await getEventsAction()
    const targetEvent = events[0]

    // Create Team
    const teamRes = await createEventTeamAction({
      eventId: targetEvent.id,
      name: 'QuantumCoders',
      lookingForMembers: true,
      desiredSkills: ['Qiskit', 'Python'],
      notes: 'Working on quantum key distribution prototype.',
    })
    expect(teamRes.ok).toBe(true)
    expect(teamRes.data?.name).toBe('QuantumCoders')

    // Post discussion message
    const msgRes = await postEventMessageAction({
      eventId: targetEvent.id,
      content: 'Where can we submit problem statements?',
    })
    expect(msgRes.ok).toBe(true)
    expect(msgRes.data?.content).toBe('Where can we submit problem statements?')

    // Fetch event detail by ID
    const detail = await getEventByIdAction(targetEvent.id)
    expect(detail.event?.id).toBe(targetEvent.id)
    expect(detail.teams.some((t) => t.name === 'QuantumCoders')).toBe(true)
    expect(detail.messages.some((m) => m.content === 'Where can we submit problem statements?')).toBe(true)
  })

  it('allows admin to approve and reject events', async () => {
    const createRes = await createEventAction({
      kind: 'external',
      title: 'Regional AI Summit 2026',
      description: 'External summit featuring state-of-the-art multimodal AI research.',
      organizerName: 'External Organizer: AI Council',
      organizerType: 'external',
      location: 'Central Auditorium',
      startsAt: '2026-11-15T09:00:00Z',
      endsAt: '2026-11-15T18:00:00Z',
      tags: ['AI', 'Summit'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
    })
    expect(createRes.ok).toBe(true)
    const eventId = createRes.data!.id

    // Approve
    const approveRes = await approveEventAction(eventId)
    expect(approveRes.ok).toBe(true)

    // Reject
    const rejectRes = await rejectEventAction(eventId)
    expect(rejectRes.ok).toBe(true)
  })
})

describe('Events Feature — UI Components', () => {
  const mockEvent: EventItem = {
    id: '00000000-0000-0000-0000-000000000101',
    kind: 'college',
    title: 'Annual Campus Hackathon 2026: InnovateX',
    description: 'Flagship hackathon with cash prizes and industry mentorship.',
    organizerName: 'Turing Computer Society',
    organizerType: 'club',
    location: 'Tech Park Hall 1',
    startsAt: '2026-10-12T10:00:00Z',
    endsAt: '2026-10-13T22:00:00Z',
    status: 'approved',
    tags: ['Hackathon', 'AI'],
    allowTeams: true,
    minTeamSize: 2,
    maxTeamSize: 4,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    rsvpCount: 85,
    userRsvpStatus: null,
  }

  it('renders EventCard with title, organizer, and RSVP button', () => {
    const onSelect = vi.fn()
    const onQuickRsvp = vi.fn()

    render(
      <EventCard
        event={mockEvent}
        onSelect={onSelect}
        onQuickRsvp={onQuickRsvp}
      />
    )

    expect(screen.getByText('Annual Campus Hackathon 2026: InnovateX')).toBeDefined()
    expect(screen.getByText('Turing Computer Society')).toBeDefined()
    expect(screen.getByText('College event')).toBeDefined()
    expect(screen.getByText('85 attending')).toBeDefined()

    // Test selection
    fireEvent.click(screen.getByText('Annual Campus Hackathon 2026: InnovateX'))
    expect(onSelect).toHaveBeenCalledWith(mockEvent)
  })

  it('renders EventsList with tabs, search, and action button', () => {
    render(<EventsList initialEvents={[mockEvent]} />)

    expect(screen.getByText('Campus Events & Hackathons')).toBeDefined()
    expect(screen.getByText('Propose event')).toBeDefined()
    expect(screen.getByText(/All events/i)).toBeDefined()
    expect(screen.getByText('College events')).toBeDefined()
    expect(screen.getByText('External hackathons')).toBeDefined()
  })

  it('renders EventDetailModal with overview, teams, and discussion tabs', () => {
    const onClose = vi.fn()
    const onUpdated = vi.fn()

    render(
      <EventDetailModal
        event={mockEvent}
        teams={[
          {
            id: 't-1',
            eventId: mockEvent.id,
            name: 'VisionX',
            leaderId: 'l-1',
            leaderName: 'Aarav Patel',
            lookingForMembers: true,
            desiredSkills: ['Python', 'OpenCV'],
            createdAt: '2026-10-02T10:00:00Z',
          },
        ]}
        messages={[
          {
            id: 'm-1',
            eventId: mockEvent.id,
            authorId: 'u-1',
            authorName: 'Rohan Gupta',
            content: 'Is food provided for all 36 hours?',
            createdAt: '2026-10-02T11:00:00Z',
          },
        ]}
        isOpen={true}
        onClose={onClose}
        onEventUpdated={onUpdated}
      />
    )

    expect(screen.getByText('Overview & RSVP')).toBeDefined()
    expect(screen.getByText('Teams (1)')).toBeDefined()
    expect(screen.getByText('Discussion (1)')).toBeDefined()
    expect(screen.getByText('RSVP Attending')).toBeDefined()

    // Switch to Teams tab
    fireEvent.click(screen.getByText('Teams (1)'))
    expect(screen.getByText('VisionX')).toBeDefined()
    expect(screen.getByText('Leader: Aarav Patel')).toBeDefined()

    // Switch to Discussion tab
    fireEvent.click(screen.getByText('Discussion (1)'))
    expect(screen.getByText('Is food provided for all 36 hours?')).toBeDefined()
    expect(screen.getByText('Rohan Gupta')).toBeDefined()
  })
})
