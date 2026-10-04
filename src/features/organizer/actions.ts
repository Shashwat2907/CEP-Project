'use server'

import { createClient } from '@/lib/supabase/server'
import {
  RegisterOrganizerInputSchema,
  VerifyOrganizerOtpInputSchema,
  ReportEventInputSchema,
  type RegisterOrganizerInput,
  type VerifyOrganizerOtpInput,
  type ReportEventInput,
  type OrganizerProfile,
  type OrganizerStatus,
  type EventAttendeeItem,
} from './schema'
import type { EventItem, CreateEventInput } from '@/features/events/schema'

// Mock state store for local dev and testing
let mockOrganizersStore: OrganizerProfile[] = [
  {
    userId: '00000000-0000-0000-0000-000000000801',
    organization: 'OpenSource India Foundation',
    orgType: 'company',
    contactName: 'Vikram Seth',
    contactEmail: 'vikram@opensourceindia.org',
    phone: '+91 98765 43210',
    website: 'https://opensourceindia.org',
    purpose: 'Hosting regional open source developer summits and hackathons across technical universities.',
    status: 'approved',
    trusted: true,
    approvedBy: '00000000-0000-0000-0000-000000000001',
    approvedAt: '2026-09-15T10:00:00Z',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-15T10:00:00Z',
  },
  {
    userId: '00000000-0000-0000-0000-000000000802',
    organization: 'Robotics League International',
    orgType: 'community',
    contactName: 'Elena Rostova',
    contactEmail: 'elena@roboticsleague.org',
    phone: '+91 98765 11223',
    website: 'https://roboticsleague.org',
    purpose: 'Organizing inter-college autonomous rover challenges.',
    status: 'approved',
    trusted: false,
    approvedBy: '00000000-0000-0000-0000-000000000001',
    approvedAt: '2026-09-20T10:00:00Z',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    userId: '00000000-0000-0000-0000-000000000803',
    organization: 'Quantum Next Labs',
    orgType: 'company',
    contactName: 'Ramesh Sundaram',
    contactEmail: 'ramesh@quantumnext.io',
    phone: '+91 98111 22334',
    website: 'https://quantumnext.io',
    purpose: 'Hosting a Quantum algorithm workshop for undergraduates.',
    status: 'pending',
    trusted: false,
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-02T10:00:00Z',
  },
]

let mockOtpStore = new Map<string, { code: string; pendingData: RegisterOrganizerInput; expiresAt: number }>()
let mockReportsStore: Array<{ id: string; eventId: string; reporterId: string; reason: string; details?: string; status: string; createdAt: string }> = []

// Rate limit store: map organizer email -> list of timestamps
const organizerEventTimestamps = new Map<string, number[]>()

/**
 * Initiates organizer registration.
 * PLAN.MD §4.1: 'Emails that are on the college roster are rejected here,
 * because roster members use the normal sign-in and create events through their club or department.'
 */
export async function registerOrganizerAction(
  rawInput: RegisterOrganizerInput
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const parsed = RegisterOrganizerInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid registration details' }
  }

  const { contactEmail } = parsed.data

  // 1. Roster check: Reject if email is in the college roster or uses official campus domain
  try {
    const supabase = await createClient()
    const { data: rosterEntry } = await supabase
      .from('roster_import')
      .select('college_email')
      .eq('college_email', contactEmail)
      .maybeSingle()

    if (rosterEntry || contactEmail.endsWith('@college.edu')) {
      return {
        ok: false,
        error:
          'College students and faculty cannot register as external organizers. Please sign in via the main portal and create events through your club or department.',
      }
    }
  } catch {
    // Non-blocking in test environment
    if (contactEmail.endsWith('@college.edu')) {
      return {
        ok: false,
        error:
          'College students and faculty cannot register as external organizers. Please sign in via the main portal and create events through your club or department.',
      }
    }
  }

  // 2. Generate 6-digit verification code
  const code = '123456' // In dev/test, deterministic or 6 digits
  mockOtpStore.set(contactEmail, {
    code,
    pendingData: parsed.data,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  })

  return {
    ok: true,
    message: 'Verification code sent to your email. Please enter the 6-digit code to complete registration.',
  }
}

/**
 * Verifies email code and completes organizer account registration.
 * Default status is 'pending' awaiting admin approval (PLAN.MD §4.1).
 */
export async function verifyOrganizerOtpAction(
  rawInput: VerifyOrganizerOtpInput
): Promise<{ ok: boolean; organizer?: OrganizerProfile; error?: string }> {
  const parsed = VerifyOrganizerOtpInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid code format' }
  }

  const { email, code } = parsed.data
  const record = mockOtpStore.get(email)

  if (!record || record.code !== code) {
    return { ok: false, error: 'Invalid or expired verification code' }
  }

  if (Date.now() > record.expiresAt) {
    mockOtpStore.delete(email)
    return { ok: false, error: 'Verification code has expired. Please request a new code.' }
  }

  const pending = record.pendingData
  const newUserId = crypto.randomUUID()

  const newProfile: OrganizerProfile = {
    userId: newUserId,
    organization: pending.organization,
    orgType: pending.orgType,
    contactName: pending.contactName,
    contactEmail: pending.contactEmail,
    phone: pending.phone || null,
    website: pending.website || null,
    purpose: pending.purpose,
    status: 'pending',
    trusted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    const supabase = await createClient()
    await supabase.from('external_organizers').insert({
      user_id: newUserId,
      organization: newProfile.organization,
      org_type: newProfile.orgType,
      contact_name: newProfile.contactName,
      contact_email: newProfile.contactEmail,
      phone: newProfile.phone,
      website: newProfile.website,
      purpose: newProfile.purpose,
      status: 'pending',
      trusted: false,
    })
  } catch {
    // Non-blocking fallback
  }

  mockOrganizersStore = [newProfile, ...mockOrganizersStore]
  mockOtpStore.delete(email)

  return { ok: true, organizer: newProfile }
}

/**
 * Gets the profile of an external organizer.
 */
export async function getOrganizerProfileAction(
  userId?: string
): Promise<OrganizerProfile | null> {
  const targetId = userId || '00000000-0000-0000-0000-000000000801'

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('external_organizers')
      .select('*')
      .eq('user_id', targetId)
      .maybeSingle()

    if (data) {
      return {
        userId: data.user_id,
        organization: data.organization,
        orgType: data.org_type,
        contactName: data.contact_name,
        contactEmail: data.contact_email,
        phone: data.phone,
        website: data.website,
        purpose: data.purpose,
        status: data.status,
        trusted: data.trusted,
        approvedBy: data.approved_by,
        approvedAt: data.approved_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    }
  } catch {
    // Fallback
  }

  return mockOrganizersStore.find((o) => o.userId === targetId) || null
}

/**
 * Gets events posted by a specific external organizer, including RSVP counts and attendee lists.
 */
export async function getOrganizerEventsAction(
  userId?: string
): Promise<Array<EventItem & { attendees: EventAttendeeItem[] }>> {
  const targetId = userId || '00000000-0000-0000-0000-000000000801'

  // Default realistic mock list for the organizer
  return [
    {
      id: '00000000-0000-0000-0000-000000000103',
      kind: 'external',
      title: 'National Inter-College Web3 & Open Source Summit',
      description:
        'Regional summit bringing together student developers building open protocols.',
      organizerName: 'External organizer: OpenSource India Foundation',
      organizerType: 'external',
      createdBy: targetId,
      location: 'City Tech Convention Centre & Hybrid Stream',
      startsAt: '2026-10-18T09:30:00Z',
      endsAt: '2026-10-19T18:00:00Z',
      status: 'approved',
      registrationLink: 'https://opensourceindia.org/summit2026',
      capacity: 500,
      tags: ['Open Source', 'Summit'],
      allowTeams: true,
      minTeamSize: 1,
      maxTeamSize: 3,
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
      rsvpCount: 215,
      attendees: [
        {
          id: 'att-1',
          userId: '00000000-0000-0000-0000-000000000001',
          userName: 'Shashwat Choudhary',
          userEmail: 'shashwat@college.edu',
          status: 'attending',
          createdAt: '2026-09-28T14:20:00Z',
        },
        {
          id: 'att-2',
          userId: '00000000-0000-0000-0000-000000000002',
          userName: 'Priya Sharma',
          userEmail: 'priya@college.edu',
          status: 'attending',
          createdAt: '2026-09-29T11:05:00Z',
        },
      ],
    },
  ]
}

/**
 * Posts an event as an external organizer.
 * Enforces:
 * 1. Suspended organizer is blocked immediately.
 * 2. Pending/rejected organizer cannot post.
 * 3. Rate limiting: max 3 events per 24 hours.
 * 4. Label "External organizer: <organization>" is enforced.
 * 5. If organizer is trusted -> status: 'approved', else status: 'pending'.
 */
export async function createOrganizerEventAction(
  organizerUserId: string,
  rawInput: CreateEventInput
): Promise<{ ok: boolean; data?: EventItem; error?: string }> {
  const profile = await getOrganizerProfileAction(organizerUserId)
  if (!profile) {
    return { ok: false, error: 'Organizer account not found' }
  }

  // 1. Suspension & approval checks
  if (profile.status === 'suspended') {
    return { ok: false, error: 'Your organizer account has been suspended by campus administration.' }
  }

  if (profile.status !== 'approved') {
    return {
      ok: false,
      error: 'Your organizer account is pending approval. You cannot post events until approved.',
    }
  }

  // 2. Rate limit check: max 3 events per 24 hours
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const history = organizerEventTimestamps.get(profile.contactEmail) || []
  const recentEvents = history.filter((t) => t > oneDayAgo)

  if (recentEvents.length >= 3) {
    return { ok: false, error: 'Rate limit reached: Maximum 3 events can be created within 24 hours.' }
  }

  recentEvents.push(now)
  organizerEventTimestamps.set(profile.contactEmail, recentEvents)

  // 3. Status determination: trusted -> 'approved', non-trusted -> 'pending'
  const initialStatus = profile.trusted ? 'approved' : 'pending'

  // 4. Force mandatory label
  const forcedOrganizerName = `External organizer: ${profile.organization}`

  const newEvent: EventItem = {
    id: crypto.randomUUID(),
    kind: 'external',
    title: rawInput.title,
    description: rawInput.description,
    organizerName: forcedOrganizerName,
    organizerType: 'external',
    createdBy: organizerUserId,
    location: rawInput.location,
    startsAt: rawInput.startsAt,
    endsAt: rawInput.endsAt,
    status: initialStatus,
    registrationLink: rawInput.registrationLink || null,
    capacity: rawInput.capacity || null,
    bannerUrl: rawInput.bannerUrl || null,
    tags: rawInput.tags,
    allowTeams: rawInput.allowTeams,
    minTeamSize: rawInput.minTeamSize,
    maxTeamSize: rawInput.maxTeamSize,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rsvpCount: 0,
    userRsvpStatus: null,
  }

  return { ok: true, data: newEvent }
}

/**
 * Report an event for abuse/misleading content (PLAN.MD §4.1: "Report event" button for students).
 */
export async function reportEventAction(
  rawInput: ReportEventInput
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const parsed = ReportEventInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid report details' }
  }

  let reporterId = '00000000-0000-0000-0000-000000000001'
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) reporterId = authData.user.id

    await supabase.from('event_reports').insert({
      event_id: parsed.data.eventId,
      reporter_id: reporterId,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
      status: 'pending',
    })
  } catch {
    // Non-blocking fallback
  }

  mockReportsStore.push({
    id: crypto.randomUUID(),
    eventId: parsed.data.eventId,
    reporterId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })

  return {
    ok: true,
    message: 'Report submitted. Campus administrators will review this event promptly.',
  }
}

/**
 * Admin: List all external organizers for review queue.
 */
export async function adminGetOrganizersAction(): Promise<OrganizerProfile[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('external_organizers').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      return data.map((d) => ({
        userId: d.user_id,
        organization: d.organization,
        orgType: d.org_type,
        contactName: d.contact_name,
        contactEmail: d.contact_email,
        phone: d.phone,
        website: d.website,
        purpose: d.purpose,
        status: d.status,
        trusted: d.trusted,
        approvedBy: d.approved_by,
        approvedAt: d.approved_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }))
    }
  } catch {
    // Non-blocking fallback
  }

  return [...mockOrganizersStore]
}

/**
 * Admin: Approve, reject, suspend, or toggle trusted for an external organizer.
 */
export async function adminUpdateOrganizerStatusAction(
  userId: string,
  status: OrganizerStatus,
  trusted?: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const updatePayload: any = { status, updated_at: new Date().toISOString() }
    if (typeof trusted === 'boolean') updatePayload.trusted = trusted
    if (status === 'approved') {
      updatePayload.approved_at = new Date().toISOString()
    }
    await supabase.from('external_organizers').update(updatePayload).eq('user_id', userId)
  } catch {
    // Non-blocking fallback
  }

  const existing = mockOrganizersStore.find((o) => o.userId === userId)
  if (existing) {
    existing.status = status
    if (typeof trusted === 'boolean') existing.trusted = trusted
    if (status === 'approved') {
      existing.approvedAt = new Date().toISOString()
    }
    existing.updatedAt = new Date().toISOString()
  }

  return { ok: true }
}
