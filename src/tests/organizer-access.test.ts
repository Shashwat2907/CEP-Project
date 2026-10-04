import { describe, it, expect } from 'vitest'
import {
  RegisterOrganizerInputSchema,
  VerifyOrganizerOtpInputSchema,
  ReportEventInputSchema,
} from '@/features/organizer/schema'
import {
  registerOrganizerAction,
  verifyOrganizerOtpAction,
  getOrganizerProfileAction,
  getOrganizerEventsAction,
  createOrganizerEventAction,
  reportEventAction,
  adminGetOrganizersAction,
  adminUpdateOrganizerStatusAction,
} from '@/features/organizer/actions'

describe('Organizer Access — Schemas & Validation (PLAN.MD §4.1 & TEAM_TASKS)', () => {
  it('validates organizer registration schema', () => {
    const valid = RegisterOrganizerInputSchema.safeParse({
      organization: 'Hacks International',
      orgType: 'community',
      contactName: 'Alex Rivera',
      contactEmail: 'alex@hacksinternational.com',
      phone: '+1 555 123 4567',
      website: 'https://hacksinternational.com',
      purpose: 'Hosting international student competitive coding events.',
    })
    expect(valid.success).toBe(true)

    const invalidEmail = RegisterOrganizerInputSchema.safeParse({
      organization: 'Invalid Org',
      orgType: 'company',
      contactName: 'Someone',
      contactEmail: 'not-an-email',
      purpose: 'Short', // too short
    })
    expect(invalidEmail.success).toBe(false)
  })

  it('validates report event schema', () => {
    const valid = ReportEventInputSchema.safeParse({
      eventId: '11111111-2222-3333-4444-555555555555',
      reason: 'Misleading prize amount and venue change',
      details: 'Organizers changed venue without notifying registrants.',
    })
    expect(valid.success).toBe(true)
  })
})

describe('Organizer Access — Registration & College Roster Rejection Flow', () => {
  it('rejects registration if email belongs to college roster / campus domain', async () => {
    // PLAN.MD §4.1: "Emails that are on the college roster are rejected here,
    // because roster members use the normal sign-in and create events through their club or department."
    const res = await registerOrganizerAction({
      organization: 'Student Rogue Club',
      orgType: 'club',
      contactName: 'Campus Student',
      contactEmail: 'student@college.edu',
      purpose: 'Attempting to register external account with campus email.',
    })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('College students and faculty cannot register as external organizers')
  })

  it('allows external entity to register and verify OTP', async () => {
    const regRes = await registerOrganizerAction({
      organization: 'DevCon Tech Guild',
      orgType: 'company',
      contactName: 'Maya Sen',
      contactEmail: 'maya@devconguild.io',
      website: 'https://devconguild.io',
      purpose: 'Hosting cloud and devops bootcamps for university students.',
    })
    expect(regRes.ok).toBe(true)
    expect(regRes.message).toContain('Verification code sent')

    // Invalid code
    const badCodeRes = await verifyOrganizerOtpAction({
      email: 'maya@devconguild.io',
      code: '000000',
    })
    expect(badCodeRes.ok).toBe(false)

    // Valid code
    const goodCodeRes = await verifyOrganizerOtpAction({
      email: 'maya@devconguild.io',
      code: '123456',
    })
    expect(goodCodeRes.ok).toBe(true)
    expect(goodCodeRes.organizer?.status).toBe('pending') // Requires admin approval
    expect(goodCodeRes.organizer?.organization).toBe('DevCon Tech Guild')
  })
})

describe('Organizer Access — Permissions, Suspension & Trusted Status', () => {
  it('blocks unapproved/pending organizers from creating events', async () => {
    const pendingOrgId = '00000000-0000-0000-0000-000000000803' // Quantum Next Labs (pending)

    const res = await createOrganizerEventAction(pendingOrgId, {
      kind: 'external',
      title: 'Quantum Workshop 2026',
      description: 'Quantum computing fundamentals and Qiskit tutorial.',
      organizerName: 'Quantum Next Labs',
      organizerType: 'external',
      location: 'Seminar Hall 4',
      startsAt: '2026-11-01T10:00:00Z',
      endsAt: '2026-11-01T16:00:00Z',
      tags: ['Quantum', 'Physics'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
    })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('pending approval')
  })

  it('blocks suspended organizer immediately from creating events', async () => {
    const orgId = '00000000-0000-0000-0000-000000000802'

    // Suspend organizer
    await adminUpdateOrganizerStatusAction(orgId, 'suspended')

    const res = await createOrganizerEventAction(orgId, {
      kind: 'external',
      title: 'Suspended Challenge',
      description: 'Should never be allowed to publish while suspended.',
      organizerName: 'Robotics League',
      organizerType: 'external',
      location: 'Arena',
      startsAt: '2026-11-10T10:00:00Z',
      endsAt: '2026-11-10T18:00:00Z',
      tags: ['Robotics'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
    })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('suspended')

    // Restore to approved for subsequent tests
    await adminUpdateOrganizerStatusAction(orgId, 'approved')
  })

  it('enforces "External organizer: <organization>" label and sets approval state based on trusted flag', async () => {
    // 1. Trusted organizer (OpenSource India Foundation) -> auto approved
    const trustedOrgId = '00000000-0000-0000-0000-000000000801'
    const trustedRes = await createOrganizerEventAction(trustedOrgId, {
      kind: 'external',
      title: 'Rust Systems Summit 2026',
      description: 'Advanced systems programming in Rust.',
      organizerName: 'Custom Name Attempt',
      organizerType: 'external',
      location: 'City Tech Hall',
      startsAt: '2026-11-20T10:00:00Z',
      endsAt: '2026-11-20T17:00:00Z',
      tags: ['Rust'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
    })

    expect(trustedRes.ok).toBe(true)
    expect(trustedRes.data?.organizerName).toBe('External organizer: OpenSource India Foundation')
    expect(trustedRes.data?.status).toBe('approved')

    // 2. Non-trusted organizer -> goes to pending approval queue
    const nonTrustedOrgId = '00000000-0000-0000-0000-000000000802'
    const nonTrustedRes = await createOrganizerEventAction(nonTrustedOrgId, {
      kind: 'external',
      title: 'Drone Racing Cup',
      description: 'Autonomous indoor drone racing obstacles.',
      organizerName: 'Drone Cup',
      organizerType: 'external',
      location: 'Indoor Sports Complex',
      startsAt: '2026-12-05T09:00:00Z',
      endsAt: '2026-12-05T18:00:00Z',
      tags: ['Drones'],
      allowTeams: true,
      minTeamSize: 2,
      maxTeamSize: 3,
    })

    expect(nonTrustedRes.ok).toBe(true)
    expect(nonTrustedRes.data?.organizerName).toBe('External organizer: Robotics League International')
    expect(nonTrustedRes.data?.status).toBe('pending') // Goes to approval queue
  })

  it('enforces rate limit of maximum 3 events per 24 hours', async () => {
    const trustedOrgId = '00000000-0000-0000-0000-000000000801'

    const createPayload = (num: number) => ({
      kind: 'external' as const,
      title: `Rate Limit Test Event ${num}`,
      description: 'Testing event rate limits for external organizers.',
      organizerName: 'OpenSource India',
      organizerType: 'external' as const,
      location: 'City Hall',
      startsAt: '2026-11-25T10:00:00Z',
      endsAt: '2026-11-25T16:00:00Z',
      tags: ['Testing'],
      allowTeams: false,
      minTeamSize: 1,
      maxTeamSize: 1,
    })

    // 1st was already created above. Create 2nd and 3rd.
    const res2 = await createOrganizerEventAction(trustedOrgId, createPayload(2))
    expect(res2.ok).toBe(true)

    const res3 = await createOrganizerEventAction(trustedOrgId, createPayload(3))
    expect(res3.ok).toBe(true)

    // 4th event should fail due to rate limit
    const res4 = await createOrganizerEventAction(trustedOrgId, createPayload(4))
    expect(res4.ok).toBe(false)
    expect(res4.error).toContain('Rate limit reached')
  })
})

describe('Organizer Access — Student Reporting & Admin Queue', () => {
  it('allows students to submit abuse report for an event', async () => {
    const res = await reportEventAction({
      eventId: '00000000-0000-0000-0000-000000000103',
      reason: 'Spam or unauthorized commercial advertising',
      details: 'Organizers requested payment upfront via personal phone number.',
    })

    expect(res.ok).toBe(true)
    expect(res.message).toContain('Campus administrators will review')
  })

  it('allows admin to query organizer queue and toggle trusted status', async () => {
    const list = await adminGetOrganizersAction()
    expect(list.length).toBeGreaterThan(0)

    const targetOrg = list[0]
    expect(targetOrg).toBeDefined()

    // Toggle trusted
    const prevTrusted = targetOrg.trusted
    const res = await adminUpdateOrganizerStatusAction(targetOrg.userId, targetOrg.status, !prevTrusted)
    expect(res.ok).toBe(true)

    const updated = await getOrganizerProfileAction(targetOrg.userId)
    expect(updated?.trusted).toBe(!prevTrusted)
  })

  it('provides organizer dashboard with RSVP counts and attendee roster', async () => {
    const events = await getOrganizerEventsAction('00000000-0000-0000-0000-000000000801')
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].attendees.length).toBeGreaterThan(0)
    expect(events[0].attendees[0].userName).toBe('Shashwat Choudhary')
  })
})
