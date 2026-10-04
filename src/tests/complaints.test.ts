import { describe, it, expect } from 'vitest'
import {
  CreateComplaintSchema,
  ResolveComplaintSchema,
  ReopenComplaintSchema,
  ComplaintStatusSchema,
} from '@/features/complaints/schema'
import { NotifyInputSchema } from '@/shared/notifications/notify'

/**
 * Unit tests for the Complaints feature.
 * Source of truth: src/features/complaints/README.md
 * Validates business rules, inputs, anonymity toggles, and notification payloads.
 */

describe('CreateComplaintSchema', () => {
  const validComplaint = {
    domain_id: '10000000-0000-0000-0000-000000000001',
    title: 'Broken electrical switch in Room 204',
    body: 'The switch sparked when turning on the main tube light. Dangerous condition.',
    anonymous: false,
  }

  it('accepts valid complaint input', () => {
    const result = CreateComplaintSchema.safeParse(validComplaint)
    expect(result.success).toBe(true)
  })

  it('rejects title shorter than 5 characters', () => {
    const result = CreateComplaintSchema.safeParse({
      ...validComplaint,
      title: 'Bad',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toMatch(/at least 5 characters/)
  })

  it('rejects description shorter than 10 characters', () => {
    const result = CreateComplaintSchema.safeParse({
      ...validComplaint,
      body: 'Too short',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toMatch(/at least 10 characters/)
  })

  it('rejects invalid domain UUID', () => {
    const result = CreateComplaintSchema.safeParse({
      ...validComplaint,
      domain_id: 'invalid-uuid-string',
    })
    expect(result.success).toBe(false)
  })

  it('permits anonymous flag set to true', () => {
    const result = CreateComplaintSchema.safeParse({
      ...validComplaint,
      anonymous: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.anonymous).toBe(true)
    }
  })
})

describe('ResolveComplaintSchema', () => {
  it('accepts valid resolution note', () => {
    const result = ResolveComplaintSchema.safeParse({
      complaint_id: '10000000-0000-0000-0000-000000000001',
      resolution_note: 'Electrician visited and replaced the damaged switch. Verified safe.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty or too short resolution note', () => {
    const result = ResolveComplaintSchema.safeParse({
      complaint_id: '10000000-0000-0000-0000-000000000001',
      resolution_note: 'Done',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toMatch(/explain how the grievance was resolved/)
  })
})

describe('ReopenComplaintSchema', () => {
  it('accepts valid reopen reason', () => {
    const result = ReopenComplaintSchema.safeParse({
      complaint_id: '10000000-0000-0000-0000-000000000001',
      reopen_note: 'The switch is still loose and sparking intermittently.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing or trivial reopen note', () => {
    const result = ReopenComplaintSchema.safeParse({
      complaint_id: '10000000-0000-0000-0000-000000000001',
      reopen_note: 'No',
    })
    expect(result.success).toBe(false)
  })
})

describe('Complaint Status Transitions', () => {
  const allowedStatuses = [
    'submitted',
    'in_progress',
    'escalated',
    'resolved',
    'reopened',
    'closed',
  ]

  it('validates all lifecycle statuses from spec', () => {
    for (const status of allowedStatuses) {
      const res = ComplaintStatusSchema.safeParse(status)
      expect(res.success).toBe(true)
    }
  })

  it('rejects unknown status', () => {
    const res = ComplaintStatusSchema.safeParse('archived')
    expect(res.success).toBe(false)
  })
})

describe('Complaints Notification Contracts', () => {
  it('validates complaint.created notification payload', () => {
    const payload = {
      userId: '00000000-0000-0000-0000-000000000001',
      type: 'complaint.created',
      title: 'New Complaint Assigned',
      body: 'A new ticket has been assigned to you: "Broken switch in 204"',
      link: '/complaints/10000000-0000-0000-0000-000000000001',
      payload: { complaintId: '10000000-0000-0000-0000-000000000001', domainId: 'domain-1' },
    }
    const result = NotifyInputSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('validates complaint.resolved notification payload', () => {
    const payload = {
      userId: '00000000-0000-0000-0000-000000000001',
      type: 'complaint.resolved',
      title: 'Complaint Resolved',
      body: 'Replaced electrical switch.',
      link: '/complaints/10000000-0000-0000-0000-000000000001',
      payload: { complaintId: '10000000-0000-0000-0000-000000000001', resolutionNote: 'Replaced switch' },
    }
    const result = NotifyInputSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
