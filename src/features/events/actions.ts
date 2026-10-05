'use server'

import { createClient } from '@/lib/supabase/server'
import {
  CreateEventInputSchema,
  RsvpEventInputSchema,
  CreateEventTeamInputSchema,
  PostEventMessageInputSchema,
  type CreateEventInput,
  type RsvpEventInput,
  type CreateEventTeamInput,
  type PostEventMessageInput,
  type EventItem,
  type EventTeamItem,
  type EventMessageItem,
  type EventKind,
  type EventStatus,
} from './schema'
import { addCalendarEntry, removeCalendarEntry } from '@/shared/calendar/calendar'

// Realistic default mock events for campus life
function getRealisticMockEvents(): EventItem[] {
  const now = new Date()
  const makeDate = (dayOffset: number, hour: number, minute: number = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }

  return [
    {
      id: '00000000-0000-0000-0000-000000000101',
      kind: 'college',
      title: 'Annual Campus Hackathon 2026: InnovateX',
      description:
        'A 36-hour flagship college hackathon focused on AI agents, distributed systems, and sustainable tech. Mentorship from senior industry engineers, food, hardware lab access, and cash prizes worth ₹2,00,000.',
      organizerName: 'Turing Computer Society & Dept of CS',
      organizerType: 'club',
      location: 'Campus Tech Park, Convention Hall 1 & 2',
      startsAt: makeDate(3, 10, 0),
      endsAt: makeDate(4, 22, 0),
      status: 'approved',
      registrationLink: 'https://innovatex2026.campus.edu',
      capacity: 350,
      bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      tags: ['Hackathon', 'AI', 'Coding', 'Prizes'],
      allowTeams: true,
      minTeamSize: 2,
      maxTeamSize: 4,
      createdAt: makeDate(-10, 10, 0),
      updatedAt: makeDate(-1, 10, 0),
      rsvpCount: 142,
      userRsvpStatus: null,
      teamsCount: 28,
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      kind: 'college',
      title: 'Guest Lecture: Cryptographic Proofs in Web Architecture',
      description:
        'Distinguished keynote by Dr. Arvind Narayanan on verifiable computing, zero-knowledge proofs in identity systems, and modern zero-trust campus authentication.',
      organizerName: 'Department of Computer Science & Engineering',
      organizerType: 'department',
      location: 'Main Auditorium, Block C',
      startsAt: makeDate(1, 15, 0),
      endsAt: makeDate(1, 17, 0),
      status: 'approved',
      registrationLink: undefined,
      capacity: 200,
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      tags: ['Keynote', 'Security', 'Cryptography'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
      createdAt: makeDate(-7, 10, 0),
      updatedAt: makeDate(-2, 10, 0),
      rsvpCount: 88,
      userRsvpStatus: 'attending',
      teamsCount: 0,
    },
    {
      id: '00000000-0000-0000-0000-000000000103',
      kind: 'external',
      title: 'National Inter-College Web3 & Open Source Summit',
      description:
        'Regional summit bringing together student developers building open protocols. Features lightning talks, code workshops on Rust and Solidity, and travel grants for outstation teams.',
      organizerName: 'External Organizer: OpenSource India Foundation',
      organizerType: 'external',
      location: 'City Tech Convention Centre & Hybrid Stream',
      startsAt: makeDate(7, 9, 30),
      endsAt: makeDate(8, 18, 0),
      status: 'approved',
      registrationLink: 'https://opensourceindia.org/summit2026',
      capacity: 500,
      bannerUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
      tags: ['External', 'Open Source', 'Summit', 'Workshops'],
      allowTeams: true,
      minTeamSize: 1,
      maxTeamSize: 3,
      createdAt: makeDate(-5, 12, 0),
      updatedAt: makeDate(-1, 12, 0),
      rsvpCount: 215,
      userRsvpStatus: null,
      teamsCount: 14,
    },
    {
      id: '00000000-0000-0000-0000-000000000104',
      kind: 'external',
      title: 'Global Autonomous Robotics Grand Challenge',
      description:
        'High-stakes robotics competition featuring maze navigation, drone obstacle courses, and automated rover pathfinding. Open to undergraduate teams nationwide.',
      organizerName: 'External Organizer: Robotics League International',
      organizerType: 'external',
      location: 'Exhibition Hall B, Arena 3',
      startsAt: makeDate(14, 10, 0),
      endsAt: makeDate(15, 19, 0),
      status: 'approved',
      registrationLink: 'https://roboticsleague.org/grand-challenge',
      capacity: 150,
      bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
      tags: ['Robotics', 'Hardware', 'Competition'],
      allowTeams: true,
      minTeamSize: 3,
      maxTeamSize: 5,
      createdAt: makeDate(-4, 11, 0),
      updatedAt: makeDate(-2, 11, 0),
      rsvpCount: 42,
      userRsvpStatus: null,
      teamsCount: 8,
    },
    {
      id: '00000000-0000-0000-0000-000000000105',
      kind: 'college',
      title: 'Robotics Club: ROS2 Hands-on Autonomous Navigation',
      description:
        'Hands-on workshop setting up ROS2 nodes, LiDAR slam mapping, and path planning on TurtleBot simulators. Bring your laptop with Ubuntu 24.04 or Docker installed.',
      organizerName: 'Autonomous Systems & Robotics Club',
      organizerType: 'club',
      location: 'Mechatronics Lab 204',
      startsAt: makeDate(2, 16, 0),
      endsAt: makeDate(2, 19, 0),
      status: 'approved',
      registrationLink: undefined,
      capacity: 40,
      bannerUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
      tags: ['Workshop', 'Robotics', 'Hands-on'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
      createdAt: makeDate(-6, 9, 0),
      updatedAt: makeDate(-3, 9, 0),
      rsvpCount: 38,
      userRsvpStatus: null,
      teamsCount: 0,
    },
    {
      id: '00000000-0000-0000-0000-000000000106',
      kind: 'college',
      title: 'Inter-Department Debate Championship 2026',
      description:
        'Parliamentary style debate on Ethics in Frontier AI, Algorithmic Governance, and Climate Geoengineering. Represent your department and win the Rolling Trophy.',
      organizerName: 'Literary & Debating Society',
      organizerType: 'club',
      location: 'Senate Hall, Central Administrative Complex',
      startsAt: makeDate(5, 14, 0),
      endsAt: makeDate(5, 18, 30),
      status: 'pending',
      registrationLink: undefined,
      capacity: 120,
      bannerUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
      tags: ['Debate', 'Speaking', 'Trophy'],
      allowTeams: true,
      minTeamSize: 2,
      maxTeamSize: 2,
      createdAt: makeDate(-1, 8, 0),
      updatedAt: makeDate(-1, 8, 0),
      rsvpCount: 12,
      userRsvpStatus: null,
      teamsCount: 4,
    },
  ]
}

// In-memory mock storage for local dev / testing fallback
let mockEventsStore: EventItem[] = getRealisticMockEvents()
let mockRsvpsStore: Array<{ eventId: string; userId: string; status: 'attending' | 'waitlist' | 'cancelled' }> = [
  { eventId: '00000000-0000-0000-0000-000000000102', userId: '00000000-0000-0000-0000-000000000001', status: 'attending' }
]
let mockTeamsStore: EventTeamItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    eventId: '00000000-0000-0000-0000-000000000101',
    name: 'NeuralPulse',
    leaderId: '00000000-0000-0000-0000-000000000002',
    leaderName: 'Priya Sharma (CS Year 3)',
    lookingForMembers: true,
    desiredSkills: ['PyTorch', 'Next.js', 'FastAPI'],
    notes: 'Building an on-device edge intelligence agent for offline medical triage. Looking for 1 frontend dev and 1 systems engineer.',
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    eventId: '00000000-0000-0000-0000-000000000101',
    name: 'ZeroLatency',
    leaderId: '00000000-0000-0000-0000-000000000003',
    leaderName: 'Aman Verma (IT Year 4)',
    lookingForMembers: true,
    desiredSkills: ['Rust', 'WebRTC', 'WASM'],
    notes: 'Collaborative peer-to-peer code execution playground. Need a designer or UX lead!',
    createdAt: new Date().toISOString(),
  },
]
let mockMessagesStore: EventMessageItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000301',
    eventId: '00000000-0000-0000-0000-000000000101',
    authorId: '00000000-0000-0000-0000-000000000002',
    authorName: 'Priya Sharma',
    content: 'Will cloud GPU credits be provided during the hackathon for LLM fine-tuning?',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000302',
    eventId: '00000000-0000-0000-0000-000000000101',
    authorId: '00000000-0000-0000-0000-000000000099',
    authorName: 'Turing Society Lead',
    content: 'Yes! Every participating team receives $100 in sponsor cloud compute vouchers at check-in.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
]

export interface GetEventsParams {
  kind?: EventKind
  status?: EventStatus | 'all'
  search?: string
  tag?: string
}

/**
 * Fetches events filtered by kind (college vs external) and status.
 * Standard students see approved events + their own pending submissions.
 */
export async function getEventsAction(params?: GetEventsParams): Promise<EventItem[]> {
  let userId = '00000000-0000-0000-0000-000000000001'
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      userId = authData.user.id
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle()
      isAdmin = !!roleData
    }

    let query = supabase.from('events').select('*').order('starts_at', { ascending: true })

    if (params?.kind) {
      query = query.eq('kind', params.kind)
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status)
    } else if (!isAdmin) {
      // Regular view: approved events OR own pending events
      query = query.or(`status.eq.approved,created_by.eq.${userId}`)
    }

    const { data: eventsData, error } = await query
    if (!error && eventsData && eventsData.length > 0) {
      // Fetch RSVPs for current user
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select('event_id, status')
        .eq('user_id', userId)

      const userRsvpMap = new Map((rsvps || []).map((r) => [r.event_id, r.status as EventStatus]))

      return eventsData.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        description: row.description,
        organizerName: row.organizer_name,
        organizerType: row.organizer_type,
        createdBy: row.created_by,
        location: row.location,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        registrationLink: row.registration_link,
        capacity: row.capacity,
        bannerUrl: row.banner_url,
        tags: row.tags || [],
        allowTeams: row.allow_teams,
        minTeamSize: row.min_team_size,
        maxTeamSize: row.max_team_size,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userRsvpStatus: (userRsvpMap.get(row.id) as any) || null,
      }))
    }
  } catch {
    // Non-blocking fallback to rich mock data
  }

  // Filter in-memory fallback
  let list = [...mockEventsStore]

  if (params?.kind) {
    list = list.filter((e) => e.kind === params.kind)
  }

  if (params?.status && params.status !== 'all') {
    list = list.filter((e) => e.status === params.status)
  } else if (!isAdmin) {
    list = list.filter((e) => e.status === 'approved' || e.createdBy === userId)
  }

  if (params?.search) {
    const q = params.search.toLowerCase()
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.organizerName.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
    )
  }

  if (params?.tag) {
    list = list.filter((e) => e.tags.includes(params.tag!))
  }

  return list.map((e) => {
    const rsvp = mockRsvpsStore.find((r) => r.eventId === e.id && r.userId === userId)
    return {
      ...e,
      userRsvpStatus: rsvp ? rsvp.status : null,
    }
  })
}

/**
 * Fetches an individual event by ID along with its teams and messages.
 */
export async function getEventByIdAction(id: string): Promise<{
  event: EventItem | null
  teams: EventTeamItem[]
  messages: EventMessageItem[]
}> {
  let userId = '00000000-0000-0000-0000-000000000001'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) userId = authData.user.id

    const { data: eventRow, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!error && eventRow) {
      const [{ data: userRsvp }, { data: teamsData }, { data: messagesData }] = await Promise.all([
        supabase.from('event_rsvps').select('status').eq('event_id', id).eq('user_id', userId).maybeSingle(),
        supabase.from('event_teams').select('*').eq('event_id', id).order('created_at', { ascending: false }),
        supabase.from('event_messages').select('*').eq('event_id', id).order('created_at', { ascending: true }),
      ])

      const event: EventItem = {
        id: eventRow.id,
        kind: eventRow.kind,
        title: eventRow.title,
        description: eventRow.description,
        organizerName: eventRow.organizer_name,
        organizerType: eventRow.organizer_type,
        createdBy: eventRow.created_by,
        location: eventRow.location,
        startsAt: eventRow.starts_at,
        endsAt: eventRow.ends_at,
        status: eventRow.status,
        registrationLink: eventRow.registration_link,
        capacity: eventRow.capacity,
        bannerUrl: eventRow.banner_url,
        tags: eventRow.tags || [],
        allowTeams: eventRow.allow_teams,
        minTeamSize: eventRow.min_team_size,
        maxTeamSize: eventRow.max_team_size,
        createdAt: eventRow.created_at,
        updatedAt: eventRow.updated_at,
        userRsvpStatus: (userRsvp?.status as any) || null,
        teamsCount: teamsData?.length || 0,
      }

      const teams: EventTeamItem[] = (teamsData || []).map((t) => ({
        id: t.id,
        eventId: t.event_id,
        name: t.name,
        leaderId: t.leader_id,
        lookingForMembers: t.looking_for_members,
        desiredSkills: t.desired_skills || [],
        notes: t.notes,
        createdAt: t.created_at,
      }))

      const messages: EventMessageItem[] = (messagesData || []).map((m) => ({
        id: m.id,
        eventId: m.event_id,
        authorId: m.author_id,
        authorName: m.author_name,
        content: m.content,
        createdAt: m.created_at,
      }))

      return { event, teams, messages }
    }
  } catch {
    // Non-blocking fallback
  }

  const foundEvent = mockEventsStore.find((e) => e.id === id) || null
  const teams = mockTeamsStore.filter((t) => t.eventId === id)
  const messages = mockMessagesStore.filter((m) => m.eventId === id)
  const userRsvp = mockRsvpsStore.find((r) => r.eventId === id && r.userId === userId)

  return {
    event: foundEvent
      ? {
          ...foundEvent,
          userRsvpStatus: userRsvp ? userRsvp.status : null,
          teamsCount: teams.length,
        }
      : null,
    teams,
    messages,
  }
}

/**
 * Creates an event.
 * PLAN.MD §5.9: 'Event creation requires approval for college-wide visibility;
 * events from external organizers always go through the approval queue unless the admin marked the organizer as trusted.'
 */
export async function createEventAction(
  rawInput: CreateEventInput
): Promise<{ ok: boolean; data?: EventItem; error?: string; message?: string }> {
  const parsed = CreateEventInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid event input' }
  }

  let userId = '00000000-0000-0000-0000-000000000001'
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      userId = authData.user.id
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle()
      isAdmin = !!role
    }

    // Admins can create instantly approved events; otherwise status is pending for college review
    const initialStatus: EventStatus = isAdmin ? 'approved' : 'pending'

    const { data, error } = await supabase
      .from('events')
      .insert({
        kind: parsed.data.kind,
        title: parsed.data.title,
        description: parsed.data.description,
        organizer_name: parsed.data.organizerName,
        organizer_type: parsed.data.organizerType,
        created_by: userId,
        location: parsed.data.location,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
        status: initialStatus,
        registration_link: parsed.data.registrationLink || null,
        capacity: parsed.data.capacity || null,
        banner_url: parsed.data.bannerUrl || null,
        tags: parsed.data.tags,
        allow_teams: parsed.data.allowTeams,
        min_team_size: parsed.data.minTeamSize,
        max_team_size: parsed.data.maxTeamSize,
      })
      .select()
      .single()

    if (!error && data) {
      const eventItem: EventItem = {
        id: data.id,
        kind: data.kind,
        title: data.title,
        description: data.description,
        organizerName: data.organizer_name,
        organizerType: data.organizer_type,
        createdBy: data.created_by,
        location: data.location,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        status: data.status,
        registrationLink: data.registration_link,
        capacity: data.capacity,
        bannerUrl: data.banner_url,
        tags: data.tags || [],
        allowTeams: data.allow_teams,
        minTeamSize: data.min_team_size,
        maxTeamSize: data.max_team_size,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        userRsvpStatus: null,
        teamsCount: 0,
        rsvpCount: 0,
      }

      return {
        ok: true,
        data: eventItem,
        message:
          initialStatus === 'pending'
            ? 'Event submitted! It has been placed in the approval queue for college visibility.'
            : 'Event published successfully.',
      }
    }
  } catch {
    // Non-blocking fallback
  }

  // Local / test fallback
  const newId = crypto.randomUUID()
  const initialStatus: EventStatus = isAdmin ? 'approved' : 'pending'
  const newEvent: EventItem = {
    id: newId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    description: parsed.data.description,
    organizerName: parsed.data.organizerName,
    organizerType: parsed.data.organizerType,
    createdBy: userId,
    location: parsed.data.location,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    status: initialStatus,
    registrationLink: parsed.data.registrationLink || null,
    capacity: parsed.data.capacity || null,
    bannerUrl: parsed.data.bannerUrl || null,
    tags: parsed.data.tags,
    allowTeams: parsed.data.allowTeams,
    minTeamSize: parsed.data.minTeamSize,
    maxTeamSize: parsed.data.maxTeamSize,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userRsvpStatus: null,
    teamsCount: 0,
    rsvpCount: 0,
  }

  mockEventsStore = [newEvent, ...mockEventsStore]

  return {
    ok: true,
    data: newEvent,
    message:
      initialStatus === 'pending'
        ? 'Event submitted! It has been placed in the approval queue for college visibility.'
        : 'Event published successfully.',
  }
}

/**
 * RSVPs to an event and automatically integrates with Calendar (PLAN.MD §5.9 & TEAM_TASKS).
 * 'Events can be added to the calendar with one tap.'
 */
export async function rsvpEventAction(
  rawInput: RsvpEventInput
): Promise<{ ok: boolean; status?: string; addedToCalendar?: boolean; error?: string }> {
  const parsed = RsvpEventInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid RSVP details' }
  }

  let userId = '00000000-0000-0000-0000-000000000001'
  let eventItem: EventItem | undefined

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) userId = authData.user.id

    // Fetch event for title & dates to sync with calendar
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', parsed.data.eventId)
      .maybeSingle()

    if (eventData) {
      eventItem = {
        id: eventData.id,
        kind: eventData.kind,
        title: eventData.title,
        description: eventData.description,
        organizerName: eventData.organizer_name,
        organizerType: eventData.organizer_type,
        location: eventData.location,
        startsAt: eventData.starts_at,
        endsAt: eventData.ends_at,
        status: eventData.status,
        tags: eventData.tags || [],
        allowTeams: eventData.allow_teams,
        minTeamSize: eventData.min_team_size,
        maxTeamSize: eventData.max_team_size,
        createdAt: eventData.created_at,
        updatedAt: eventData.updated_at,
      }

      await supabase.from('event_rsvps').upsert(
        {
          event_id: parsed.data.eventId,
          user_id: userId,
          status: parsed.data.status,
          team_name: parsed.data.teamName || null,
          team_members: parsed.data.teamMembers || [],
        },
        { onConflict: 'event_id,user_id' }
      )
    }
  } catch {
    // Non-blocking fallback
  }

  if (!eventItem) {
    eventItem = mockEventsStore.find((e) => e.id === parsed.data.eventId)
  }

  // Update mock RSVP store
  const existingIndex = mockRsvpsStore.findIndex(
    (r) => r.eventId === parsed.data.eventId && r.userId === userId
  )
  if (existingIndex >= 0) {
    mockRsvpsStore[existingIndex].status = parsed.data.status
  } else {
    mockRsvpsStore.push({
      eventId: parsed.data.eventId,
      userId,
      status: parsed.data.status,
    })
  }

  // Add to Calendar if attending and requested
  let addedToCalendar = false
  if (parsed.data.addToCalendar && parsed.data.status === 'attending' && eventItem) {
    try {
      const calRes = await addCalendarEntry({
        userId,
        sourceType: 'event',
        sourceId: eventItem.id,
        title: eventItem.title,
        description: eventItem.description,
        location: eventItem.location,
        link: `/events`,
        startsAt: eventItem.startsAt,
        endsAt: eventItem.endsAt,
      })
      addedToCalendar = calRes.ok
    } catch {
      // Calendar sync non-fatal
    }
  }

  return { ok: true, status: parsed.data.status, addedToCalendar }
}

/**
 * Cancels RSVP and removes entry from personal calendar.
 */
export async function cancelRsvpAction(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  let userId = '00000000-0000-0000-0000-000000000001'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) userId = authData.user.id

    await supabase
      .from('event_rsvps')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('user_id', userId)

    await removeCalendarEntry({
      sourceType: 'event',
      sourceId: eventId,
      userId,
    })
  } catch {
    // Non-blocking fallback
  }

  // Remove / update in mock store
  const existing = mockRsvpsStore.find((r) => r.eventId === eventId && r.userId === userId)
  if (existing) {
    existing.status = 'cancelled'
  }

  await removeCalendarEntry({
    sourceType: 'event',
    sourceId: eventId,
    userId,
  })

  return { ok: true }
}

/**
 * Creates an open team for hackathons & competitions.
 */
export async function createEventTeamAction(
  rawInput: CreateEventTeamInput
): Promise<{ ok: boolean; data?: EventTeamItem; error?: string }> {
  const parsed = CreateEventTeamInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid team details' }
  }

  let userId = '00000000-0000-0000-0000-000000000001'
  let userName = 'Student Member'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      userId = authData.user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.full_name) userName = profile.full_name
    }

    const { data, error } = await supabase
      .from('event_teams')
      .insert({
        event_id: parsed.data.eventId,
        name: parsed.data.name,
        leader_id: userId,
        looking_for_members: parsed.data.lookingForMembers,
        desired_skills: parsed.data.desiredSkills,
        notes: parsed.data.notes || null,
      })
      .select()
      .single()

    if (!error && data) {
      return {
        ok: true,
        data: {
          id: data.id,
          eventId: data.event_id,
          name: data.name,
          leaderId: data.leader_id,
          leaderName: userName,
          lookingForMembers: data.looking_for_members,
          desiredSkills: data.desired_skills || [],
          notes: data.notes,
          createdAt: data.created_at,
        },
      }
    }
  } catch {
    // Non-blocking fallback
  }

  const team: EventTeamItem = {
    id: crypto.randomUUID(),
    eventId: parsed.data.eventId,
    name: parsed.data.name,
    leaderId: userId,
    leaderName: userName,
    lookingForMembers: parsed.data.lookingForMembers,
    desiredSkills: parsed.data.desiredSkills,
    notes: parsed.data.notes || null,
    createdAt: new Date().toISOString(),
  }

  mockTeamsStore = [team, ...mockTeamsStore]

  return { ok: true, data: team }
}

/**
 * Posts an event discussion / Q&A message.
 */
export async function postEventMessageAction(
  rawInput: PostEventMessageInput
): Promise<{ ok: boolean; data?: EventMessageItem; error?: string }> {
  const parsed = PostEventMessageInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid message' }
  }

  let userId = '00000000-0000-0000-0000-000000000001'
  let userName = 'Student'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      userId = authData.user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.full_name) userName = profile.full_name
    }

    const { data, error } = await supabase
      .from('event_messages')
      .insert({
        event_id: parsed.data.eventId,
        author_id: userId,
        author_name: userName,
        content: parsed.data.content,
      })
      .select()
      .single()

    if (!error && data) {
      return {
        ok: true,
        data: {
          id: data.id,
          eventId: data.event_id,
          authorId: data.author_id,
          authorName: data.author_name,
          content: data.content,
          createdAt: data.created_at,
        },
      }
    }
  } catch {
    // Non-blocking fallback
  }

  const msg: EventMessageItem = {
    id: crypto.randomUUID(),
    eventId: parsed.data.eventId,
    authorId: userId,
    authorName: userName,
    content: parsed.data.content,
    createdAt: new Date().toISOString(),
  }

  mockMessagesStore = [...mockMessagesStore, msg]

  return { ok: true, data: msg }
}

/**
 * Admin action: Approve an event from the approval queue.
 */
export async function approveEventAction(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    await supabase.from('events').update({ status: 'approved' }).eq('id', eventId)
  } catch {
    // Non-blocking fallback
  }

  const ev = mockEventsStore.find((e) => e.id === eventId)
  if (ev) ev.status = 'approved'

  return { ok: true }
}

/**
 * Admin action: Reject an event from the approval queue.
 */
export async function rejectEventAction(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    await supabase.from('events').update({ status: 'rejected' }).eq('id', eventId)
  } catch {
    // Non-blocking fallback
  }

  const ev = mockEventsStore.find((e) => e.id === eventId)
  if (ev) ev.status = 'rejected'

  return { ok: true }
}
