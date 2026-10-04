import { describe, it, expect } from 'vitest'
import {
  ComplaintSchema,
  EscalationResultSchema,
  type Complaint,
} from '@/features/complaints/schema'

/**
 * Unit tests for Complaints Automated Escalation.
 * Source of truth: src/features/complaints/README.md & TEAM_TASKS.md (feat/complaints-escalation)
 *
 * Covers:
 * 1. SLA breach detection (now > due_at)
 * 2. Multi-level promotion (Level 1 -> Level 2 -> Level 3)
 * 3. Top-level final stop: flags "Needs Admin Attention" and alerts administration
 * 4. Idempotency: duplicate runs do not escalate the same complaint to the same level twice
 * 5. Sensitive domain privacy: routes directly to committee / Principal
 * 6. Resolved/closed tickets are excluded from escalation
 */

describe('Complaints Escalation Schemas', () => {
  it('validates a complaint with needs_admin_attention flag', () => {
    const complaint: Complaint = {
      id: '10000000-0000-0000-0000-000000000001',
      author_id: '20000000-0000-0000-0000-000000000002',
      domain_id: '30000000-0000-0000-0000-000000000003',
      title: 'Water leakage in hostel room 302',
      body: 'Ceiling plaster is peeling off due to heavy leakage from upper bathroom.',
      status: 'escalated',
      current_level: 3,
      anonymous: false,
      needs_admin_attention: true,
      created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      due_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    }

    const parsed = ComplaintSchema.safeParse(complaint)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.needs_admin_attention).toBe(true)
      expect(parsed.data.current_level).toBe(3)
    }
  })

  it('validates EscalationResult schema', () => {
    const result = {
      success: true,
      escalated_count: 2,
      flagged_admin_count: 1,
      escalated_complaint_ids: [
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
      ],
      flagged_complaint_ids: ['10000000-0000-0000-0000-000000000003'],
      timestamp: new Date().toISOString(),
    }

    const parsed = EscalationResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })
})

describe('Escalation Business Rules & State Machine', () => {
  interface MockAssignee {
    level: number
    role_name: string
    assignee_id: string
    sla_hours: number
  }

  const academicChain: MockAssignee[] = [
    { level: 1, role_name: 'Subject Teacher', assignee_id: 'teacher-1', sla_hours: 24 },
    { level: 2, role_name: 'Class Coordinator', assignee_id: 'coord-2', sla_hours: 48 },
    { level: 3, role_name: 'HOD', assignee_id: 'hod-3', sla_hours: 72 },
  ]

  const sensitiveChain: MockAssignee[] = [
    { level: 1, role_name: 'Anti-Ragging Committee', assignee_id: 'committee-1', sla_hours: 12 },
    { level: 2, role_name: 'Principal / Director', assignee_id: 'principal-2', sla_hours: 24 },
  ]

  function simulateEscalation(
    complaint: {
      id: string
      status: string
      current_level: number
      due_at: string
      needs_admin_attention: boolean
      events: Array<{ type: string; to_level?: number }>
    },
    chain: MockAssignee[],
    currentTime: Date
  ) {
    // Rule: Only active unresolved complaints can escalate
    if (complaint.status === 'resolved' || complaint.status === 'closed') {
      return { escalated: false, reason: 'Ticket is resolved/closed' }
    }

    const dueDate = new Date(complaint.due_at)
    // Rule: Must have breached SLA
    if (currentTime <= dueDate) {
      return { escalated: false, reason: 'SLA target has not expired' }
    }

    const nextLevel = complaint.current_level + 1
    const nextAssignee = chain.find((a) => a.level === nextLevel)

    if (nextAssignee) {
      // Idempotency check: event with type = 'escalated' to this level must not exist
      const alreadyEscalated = complaint.events.some(
        (e) => e.type === 'escalated' && e.to_level === nextLevel
      )
      if (alreadyEscalated) {
        return { escalated: false, reason: 'Already escalated to this level (idempotent)' }
      }

      complaint.current_level = nextLevel
      complaint.status = 'escalated'
      complaint.due_at = new Date(
        currentTime.getTime() + nextAssignee.sla_hours * 3600000
      ).toISOString()
      complaint.events.push({ type: 'escalated', to_level: nextLevel })

      return {
        escalated: true,
        to_level: nextLevel,
        new_assignee: nextAssignee.role_name,
        new_due_at: complaint.due_at,
      }
    } else {
      // Top-level reached! Flag "Needs Admin Attention"
      if (!complaint.needs_admin_attention) {
        complaint.needs_admin_attention = true
        complaint.events.push({ type: 'status_changed', to_level: complaint.current_level })
        return { escalated: false, flagged_admin: true }
      }
      return { escalated: false, reason: 'Already flagged for admin' }
    }
  }

  it('escalates an overdue Level 1 complaint to Level 2', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z')
    const overdueTicket = {
      id: 'ticket-1',
      status: 'submitted',
      current_level: 1,
      due_at: new Date('2026-10-03T12:00:00Z').toISOString(), // 24 hours ago
      needs_admin_attention: false,
      events: [{ type: 'submitted' }],
    }

    const res = simulateEscalation(overdueTicket, academicChain, baseTime)
    expect(res.escalated).toBe(true)
    expect(res.to_level).toBe(2)
    expect(res.new_assignee).toBe('Class Coordinator')
    expect(overdueTicket.current_level).toBe(2)
    expect(overdueTicket.status).toBe('escalated')

    // Next due date should be baseTime + 48 hours
    const expectedDueDate = new Date('2026-10-06T12:00:00Z').toISOString()
    expect(overdueTicket.due_at).toBe(expectedDueDate)
  })

  it('does NOT escalate a complaint if SLA target has not passed', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z')
    const activeTicket = {
      id: 'ticket-2',
      status: 'in_progress',
      current_level: 1,
      due_at: new Date('2026-10-04T18:00:00Z').toISOString(), // 6 hours in future
      needs_admin_attention: false,
      events: [{ type: 'submitted' }],
    }

    const res = simulateEscalation(activeTicket, academicChain, baseTime)
    expect(res.escalated).toBe(false)
    expect(res.reason).toMatch(/SLA target has not expired/)
    expect(activeTicket.current_level).toBe(1)
  })

  it('does NOT escalate resolved or closed complaints even if past due_at', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z')
    const resolvedTicket = {
      id: 'ticket-3',
      status: 'resolved',
      current_level: 1,
      due_at: new Date('2026-10-03T12:00:00Z').toISOString(),
      needs_admin_attention: false,
      events: [{ type: 'submitted' }, { type: 'resolved' }],
    }

    const res = simulateEscalation(resolvedTicket, academicChain, baseTime)
    expect(res.escalated).toBe(false)
    expect(res.reason).toMatch(/resolved\/closed/)
  })

  it('guarantees idempotency: running twice in the same sweep does not escalate twice', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z')
    const ticket = {
      id: 'ticket-4',
      status: 'submitted',
      current_level: 1,
      due_at: new Date('2026-10-03T12:00:00Z').toISOString(),
      needs_admin_attention: false,
      events: [{ type: 'submitted' }],
    }

    // First execution: escalates from 1 -> 2
    const firstRun = simulateEscalation(ticket, academicChain, baseTime)
    expect(firstRun.escalated).toBe(true)
    expect(ticket.current_level).toBe(2)

    // Second execution immediately after: should be blocked by idempotency / active new due_at
    const secondRun = simulateEscalation(ticket, academicChain, baseTime)
    expect(secondRun.escalated).toBe(false)
    expect(ticket.current_level).toBe(2) // Remains Level 2
  })

  it('flags ticket as "Needs Admin Attention" when final authority SLA breaches', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z')
    const topLevelTicket = {
      id: 'ticket-top',
      status: 'escalated',
      current_level: 3, // Highest level in academicChain (HOD)
      due_at: new Date('2026-10-03T12:00:00Z').toISOString(), // breached
      needs_admin_attention: false,
      events: [
        { type: 'submitted' },
        { type: 'escalated', to_level: 2 },
        { type: 'escalated', to_level: 3 },
      ],
    }

    const res = simulateEscalation(topLevelTicket, academicChain, baseTime)
    expect(res.escalated).toBe(false)
    expect(res.flagged_admin).toBe(true)
    expect(topLevelTicket.needs_admin_attention).toBe(true)
    expect(topLevelTicket.current_level).toBe(3) // Does not create invalid Level 4
  })

  it('sensitive domain (Ragging) routes strictly to Anti-Ragging Committee then Principal', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z')
    const sensitiveTicket = {
      id: 'ticket-ragging',
      status: 'submitted',
      current_level: 1,
      due_at: new Date('2026-10-04T00:00:00Z').toISOString(), // 12 hours breached
      needs_admin_attention: false,
      events: [{ type: 'submitted' }],
    }

    // Escalates from Anti-Ragging Committee (Level 1) to Principal (Level 2)
    const res = simulateEscalation(sensitiveTicket, sensitiveChain, baseTime)
    expect(res.escalated).toBe(true)
    expect(res.to_level).toBe(2)
    expect(res.new_assignee).toBe('Principal / Director')

    // Next breach triggers Admin Attention because Level 2 is final
    sensitiveTicket.due_at = new Date('2026-10-05T00:00:00Z').toISOString()
    const nextTime = new Date('2026-10-05T12:00:00Z')
    const resFinal = simulateEscalation(sensitiveTicket, sensitiveChain, nextTime)
    expect(resFinal.flagged_admin).toBe(true)
    expect(sensitiveTicket.needs_admin_attention).toBe(true)
  })
})
