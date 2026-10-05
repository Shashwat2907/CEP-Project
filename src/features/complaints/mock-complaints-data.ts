import type { Complaint, ComplaintDomain, DomainAssignee } from './schema'

export const MOCK_COMPLAINT_DOMAINS: ComplaintDomain[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Academic – Subject',
    description: 'Syllabus doubt, teaching-related issue, course grading',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    created_at: new Date().toISOString(),
    subcategories: [
      {
        id: '10000000-0000-0000-0000-000000000021',
        name: 'Grading Discrepancy',
        description: 'Exam evaluation or marks tally issue',
        parent_id: '10000000-0000-0000-0000-000000000001',
        sensitive: false,
        routing_mode: 'chain',
        visibility: 'public',
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'Academic – Class',
    description: 'Timetable clash, class-level scheduling',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    created_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Lab / Practical',
    description: 'Equipment issue, computer or instrument not working',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    created_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: 'Hostel – Cleanliness & Maintenance',
    description: 'Room cleanliness, broken furniture, water or electrical issue',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    created_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    name: 'Mess / Food',
    description: 'Food quality, hygiene, service or catering issue',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    created_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    name: 'Infrastructure',
    description: 'Classroom furniture, AC, projector, campus facility',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    created_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000012',
    name: 'Harassment & Ragging',
    description: 'Anti-Ragging and campus safety (Strictly private and anonymous)',
    parent_id: null,
    sensitive: true,
    routing_mode: 'direct',
    visibility: 'private',
    created_at: new Date().toISOString(),
  },
]

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    author_id: '00000000-0000-0000-0000-000000000001',
    domain_id: '10000000-0000-0000-0000-000000000004',
    title: 'Lab 3 Projector & HDMI Cable Malfunctioning',
    body: 'The overhead projector in Computer Lab 3 (Systems Lab) flickers constantly and the HDMI cable connection drops intermittently during project presentations.',
    status: 'submitted',
    assigned_to: '00000000-0000-0000-0000-000000000002',
    escalation_level: 1,
    sla_breach_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    needs_admin_attention: false,
    anonymous: false,
    upvotes_count: 5,
    has_upvoted: false,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      full_name: 'Aarav Mehta',
      role_primary: 'student',
    },
    assignee: {
      full_name: 'Prof. Rajesh Sharma',
      role_primary: 'teacher',
    },
    domain: {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'Lab / Practical',
      sensitive: false,
      visibility: 'public',
    },
    events: [
      {
        id: 'e1000000-0000-0000-0000-000000000001',
        complaint_id: 'c1000000-0000-0000-0000-000000000001',
        event_type: 'submitted',
        actor_id: '00000000-0000-0000-0000-000000000001',
        note: 'Grievance ticket created.',
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        actor: { full_name: 'Aarav Mehta', role_primary: 'student' },
      },
    ],
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    author_id: '00000000-0000-0000-0000-000000000001',
    domain_id: '10000000-0000-0000-0000-000000000008',
    title: 'Classroom 204 Air Conditioning & Ceiling Fans Off',
    body: 'The central AC in CR-204 is blowing warm air and two ceiling fans are disconnected. Room temperature is unsuitable during afternoon lectures.',
    status: 'in_progress',
    assigned_to: '00000000-0000-0000-0000-000000000002',
    escalation_level: 1,
    sla_breach_at: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    needs_admin_attention: false,
    anonymous: false,
    upvotes_count: 12,
    has_upvoted: true,
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      full_name: 'Aarav Mehta',
      role_primary: 'student',
    },
    assignee: {
      full_name: 'Prof. Rajesh Sharma',
      role_primary: 'teacher',
    },
    domain: {
      id: '10000000-0000-0000-0000-000000000008',
      name: 'Infrastructure',
      sensitive: false,
      visibility: 'public',
    },
    events: [
      {
        id: 'e1000000-0000-0000-0000-000000000002',
        complaint_id: 'c1000000-0000-0000-0000-000000000002',
        event_type: 'submitted',
        actor_id: '00000000-0000-0000-0000-000000000001',
        note: 'Grievance ticket created.',
        created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        actor: { full_name: 'Aarav Mehta', role_primary: 'student' },
      },
      {
        id: 'e1000000-0000-0000-0000-000000000003',
        complaint_id: 'c1000000-0000-0000-0000-000000000002',
        event_type: 'status_changed',
        actor_id: '00000000-0000-0000-0000-000000000002',
        note: 'Facility technician dispatched to inspect the condenser unit.',
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        actor: { full_name: 'Prof. Rajesh Sharma', role_primary: 'teacher' },
      },
    ],
  },
]

export function addMockComplaint(complaint: Complaint) {
  MOCK_COMPLAINTS.unshift(complaint)
}

export function updateMockComplaintStatus(
  id: string,
  status: Complaint['status'],
  note?: string,
  actorName: string = 'Authority'
) {
  const c = MOCK_COMPLAINTS.find((item) => item.id === id)
  if (c) {
    c.status = status
    c.updated_at = new Date().toISOString()
    if (note) {
      c.events = c.events || []
      c.events.push({
        id: `e-${Date.now()}`,
        complaint_id: id,
        event_type: 'status_changed',
        actor_id: '00000000-0000-0000-0000-000000000002',
        note,
        created_at: new Date().toISOString(),
        actor: { full_name: actorName, role_primary: 'teacher' },
      })
    }
  }
}

