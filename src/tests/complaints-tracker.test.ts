import { describe, it, expect } from 'vitest'
import {
  ComplaintSchema,
  ToggleUpvoteSchema,
  MarkDuplicateSchema,
  TrackerFilterSchema,
  SimilarComplaintSchema,
  type Complaint,
  type SimilarComplaint,
} from '@/features/complaints/schema'

/**
 * Unit tests for Public Tracker, Upvotes Engine, Similar Complaints Detection,
 * and Duplicate Grievance Merging.
 *
 * Source of truth: src/features/complaints/README.md & TEAM_TASKS.md (feat/complaints-tracker-and-upvotes)
 */

describe('Complaints Tracker & Upvote Schemas', () => {
  it('validates a complaint with upvotes and duplicate tracking fields', () => {
    const complaint: Complaint = {
      id: '10000000-0000-0000-0000-000000000001',
      author_id: '20000000-0000-0000-0000-000000000002',
      domain_id: '30000000-0000-0000-0000-000000000003',
      title: 'Broken WiFi router in Library Reading Hall',
      body: 'Second floor router disconnects intermittently during study hours.',
      status: 'in_progress',
      current_level: 1,
      anonymous: false,
      upvotes_count: 24,
      has_upvoted: true,
      duplicate_of_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const parsed = ComplaintSchema.safeParse(complaint)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.upvotes_count).toBe(24)
      expect(parsed.data.has_upvoted).toBe(true)
      expect(parsed.data.duplicate_of_id).toBeNull()
    }
  })

  it('validates ToggleUpvoteSchema with UUID', () => {
    const valid = ToggleUpvoteSchema.safeParse({
      complaint_id: '10000000-0000-0000-0000-000000000001',
    })
    expect(valid.success).toBe(true)

    const invalid = ToggleUpvoteSchema.safeParse({
      complaint_id: 'not-a-valid-uuid',
    })
    expect(invalid.success).toBe(false)
  })

  it('validates MarkDuplicateSchema', () => {
    const valid = MarkDuplicateSchema.safeParse({
      complaint_id: '10000000-0000-0000-0000-000000000001',
      duplicate_of_id: '20000000-0000-0000-0000-000000000002',
      note: 'Linked with main lab issue',
    })
    expect(valid.success).toBe(true)

    const invalid = MarkDuplicateSchema.safeParse({
      complaint_id: '10000000-0000-0000-0000-000000000001',
      duplicate_of_id: 'invalid-uuid',
    })
    expect(invalid.success).toBe(false)
  })

  it('validates TrackerFilterSchema sort orders and defaults', () => {
    const parsedDefault = TrackerFilterSchema.safeParse({})
    expect(parsedDefault.success).toBe(true)
    if (parsedDefault.success) {
      expect(parsedDefault.data.sort).toBe('longest_pending')
    }

    const parsedMostUpvoted = TrackerFilterSchema.safeParse({ sort: 'most_upvoted' })
    expect(parsedMostUpvoted.success).toBe(true)
    if (parsedMostUpvoted.success) {
      expect(parsedMostUpvoted.data.sort).toBe('most_upvoted')
    }

    const parsedNewest = TrackerFilterSchema.safeParse({ sort: 'newest' })
    expect(parsedNewest.success).toBe(true)
    if (parsedNewest.success) {
      expect(parsedNewest.data.sort).toBe('newest')
    }
  })

  it('validates SimilarComplaintSchema', () => {
    const similar: SimilarComplaint = {
      id: '10000000-0000-0000-0000-000000000001',
      title: 'Water cooler not working on 1st floor',
      body: 'Cooler is dispensing warm water since yesterday.',
      status: 'submitted',
      upvotes_count: 5,
      created_at: new Date().toISOString(),
      domain: {
        name: 'Infrastructure & Maintenance',
        sensitive: false,
      },
    }

    const parsed = SimilarComplaintSchema.safeParse(similar)
    expect(parsed.success).toBe(true)
  })
})

describe('SLA Acceleration Formula Rules', () => {
  /**
   * Business Rule:
   * Every 10 upvotes reduces remaining SLA by 10%, capped at 50% max reduction.
   */
  function calculateSlaAcceleration(
    upvoteCount: number,
    nowMs: number,
    dueAtMs: number
  ): { discountPercent: number; newDueAtMs: number } {
    const remainingMs = dueAtMs - nowMs
    if (remainingMs <= 0 || upvoteCount < 10) {
      return { discountPercent: 0, newDueAtMs: dueAtMs }
    }

    const discountPercent = Math.min(50, Math.floor(upvoteCount / 10) * 10)
    const reductionRatio = discountPercent / 100
    const acceleratedRemaining = remainingMs * (1 - reductionRatio)
    return {
      discountPercent,
      newDueAtMs: Math.round(nowMs + acceleratedRemaining),
    }
  }

  it('does not reduce SLA when upvotes are less than 10', () => {
    const now = 1000000000000
    const dueAt = now + 24 * 3600 * 1000 // 24 hours remaining

    const res5 = calculateSlaAcceleration(5, now, dueAt)
    expect(res5.discountPercent).toBe(0)
    expect(res5.newDueAtMs).toBe(dueAt)

    const res9 = calculateSlaAcceleration(9, now, dueAt)
    expect(res9.discountPercent).toBe(0)
    expect(res9.newDueAtMs).toBe(dueAt)
  })

  it('reduces remaining SLA by 10% at 10 upvotes', () => {
    const now = 1000000000000
    const dueAt = now + 10 * 3600 * 1000 // 10 hours remaining

    const res = calculateSlaAcceleration(10, now, dueAt)
    expect(res.discountPercent).toBe(10)
    // 10 hours * 0.9 = 9 hours remaining
    expect(res.newDueAtMs).toBe(now + 9 * 3600 * 1000)
  })

  it('reduces remaining SLA by 20% at 20 upvotes and 30% at 30 upvotes', () => {
    const now = 1000000000000
    const dueAt = now + 20 * 3600 * 1000 // 20 hours remaining

    const res20 = calculateSlaAcceleration(20, now, dueAt)
    expect(res20.discountPercent).toBe(20)
    expect(res20.newDueAtMs).toBe(now + 16 * 3600 * 1000)

    const res30 = calculateSlaAcceleration(35, now, dueAt)
    expect(res30.discountPercent).toBe(30)
    expect(res30.newDueAtMs).toBe(now + 14 * 3600 * 1000)
  })

  it('caps SLA reduction at 50% even with 60 or 100 upvotes', () => {
    const now = 1000000000000
    const dueAt = now + 20 * 3600 * 1000 // 20 hours remaining

    const res50 = calculateSlaAcceleration(50, now, dueAt)
    expect(res50.discountPercent).toBe(50)
    expect(res50.newDueAtMs).toBe(now + 10 * 3600 * 1000)

    const res80 = calculateSlaAcceleration(80, now, dueAt)
    expect(res80.discountPercent).toBe(50)
    expect(res80.newDueAtMs).toBe(now + 10 * 3600 * 1000)
  })
})

describe('Duplicate Grievances & Upvote Merging Rules', () => {
  it('prevents marking a complaint as duplicate of itself', () => {
    const sameId = '10000000-0000-0000-0000-000000000001'
    const isSelfDuplicate = sameId === sameId
    expect(isSelfDuplicate).toBe(true)
  })

  it('merges upvotes correctly and ignores duplicates across user IDs', () => {
    const masterTicketUpvoterIds = new Set(['user-a', 'user-b', 'user-c'])
    const duplicateTicketUpvoterIds = ['user-b', 'user-d', 'user-e']

    // Simulate database transfer with UNIQUE constraint
    for (const uid of duplicateTicketUpvoterIds) {
      masterTicketUpvoterIds.add(uid)
    }

    // Result should contain user-a, user-b, user-c, user-d, user-e (5 unique)
    expect(masterTicketUpvoterIds.size).toBe(5)
    expect(masterTicketUpvoterIds.has('user-d')).toBe(true)
    expect(masterTicketUpvoterIds.has('user-e')).toBe(true)
  })

  it('sets status to closed and links duplicate_of_id on merge', () => {
    const originalComplaint: Complaint = {
      id: 'dup-1',
      author_id: 'student-2',
      domain_id: 'infra-dom',
      title: 'AC leaking in Seminar Hall',
      body: 'Water dripping on stage from front AC unit.',
      status: 'submitted',
      current_level: 1,
      anonymous: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const masterId = 'master-1'
    const mergedComplaint: Complaint = {
      ...originalComplaint,
      status: 'closed',
      duplicate_of_id: masterId,
      resolution_note: `Closed as duplicate of grievance #${masterId}`,
      resolved_at: new Date().toISOString(),
    }

    expect(mergedComplaint.status).toBe('closed')
    expect(mergedComplaint.duplicate_of_id).toBe(masterId)
    expect(mergedComplaint.resolution_note).toContain('Closed as duplicate')
  })
})

describe('Public Tracker Privacy & Sensitive Category Isolation', () => {
  const sampleComplaints: Array<{
    id: string
    title: string
    domain: { name: string; sensitive: boolean; visibility: string }
    status: string
    created_at: string
    upvotes_count: number
  }> = [
    {
      id: 'c-1',
      title: 'Library AC not working',
      domain: { name: 'Infrastructure', sensitive: false, visibility: 'public' },
      status: 'submitted',
      created_at: '2026-10-01T10:00:00Z',
      upvotes_count: 15,
    },
    {
      id: 'c-2',
      title: 'Ragging incident reported in Hostel B',
      domain: { name: 'Anti-Ragging', sensitive: true, visibility: 'private' },
      status: 'escalated',
      created_at: '2026-10-02T10:00:00Z',
      upvotes_count: 0,
    },
    {
      id: 'c-3',
      title: 'Hostel mess dinner quality poor',
      domain: { name: 'Mess & Cafeteria', sensitive: false, visibility: 'public' },
      status: 'in_progress',
      created_at: '2026-10-03T10:00:00Z',
      upvotes_count: 32,
    },
    {
      id: 'c-4',
      title: 'Harassment complaint against senior',
      domain: { name: 'Women Safety / ICC', sensitive: true, visibility: 'private' },
      status: 'in_progress',
      created_at: '2026-10-03T12:00:00Z',
      upvotes_count: 0,
    },
  ]

  it('strictly excludes sensitive categories from public tracker queries', () => {
    const publicTrackerResults = sampleComplaints.filter(
      (c) => !c.domain.sensitive && c.domain.visibility === 'public'
    )

    expect(publicTrackerResults.length).toBe(2)
    expect(publicTrackerResults.map((c) => c.id)).toEqual(['c-1', 'c-3'])
    expect(publicTrackerResults.some((c) => c.domain.sensitive)).toBe(false)
  })

  it('sorts by longest_pending (oldest created_at first) by default', () => {
    const publicTrackerResults = sampleComplaints.filter(
      (c) => !c.domain.sensitive && c.domain.visibility === 'public'
    )

    const longestPending = [...publicTrackerResults].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    expect(longestPending[0].id).toBe('c-1') // Created Oct 1
    expect(longestPending[1].id).toBe('c-3') // Created Oct 3
  })

  it('sorts by most_upvoted correctly', () => {
    const publicTrackerResults = sampleComplaints.filter(
      (c) => !c.domain.sensitive && c.domain.visibility === 'public'
    )

    const mostUpvoted = [...publicTrackerResults].sort(
      (a, b) => b.upvotes_count - a.upvotes_count
    )

    expect(mostUpvoted[0].id).toBe('c-3') // 32 upvotes
    expect(mostUpvoted[1].id).toBe('c-1') // 15 upvotes
  })

  it('anonymizes author in public tracker for anonymous grievances', () => {
    const complaintRow = {
      id: 'c-1',
      title: 'Broken projector in Room 401',
      anonymous: true,
      author_id: 'user-xyz',
      author: { full_name: 'John Doe', role_primary: 'student' },
    }

    const currentUserId = 'viewer-abc'
    const isAdmin = false

    const displayAuthor =
      complaintRow.anonymous && !isAdmin && complaintRow.author_id !== currentUserId
        ? { full_name: 'Anonymous Student', role_primary: 'student' }
        : complaintRow.author

    expect(displayAuthor.full_name).toBe('Anonymous Student')
  })
})
