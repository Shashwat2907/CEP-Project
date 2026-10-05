/**
 * Mock Complaints Data & In-Memory Store
 * Used for zero-dependency local development when Supabase is offline.
 * Source of truth: src/features/complaints/README.md & documents/CONTRACT.md §5.4
 */

import type { Complaint, ComplaintDomain, DomainAssignee } from './schema'

export const MOCK_COMPLAINT_DOMAINS: ComplaintDomain[] = [
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    name: 'Campus Infrastructure & Maintenance',
    description: 'Classrooms, air conditioning, electrical fixtures, and plumbing',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    subcategories: [
      {
        id: 'd1000000-0000-0000-0000-000000000011',
        name: 'AC & Ventilation',
        parent_id: 'd1000000-0000-0000-0000-000000000001',
        sensitive: false,
        visibility: 'public',
      },
      {
        id: 'd1000000-0000-0000-0000-000000000012',
        name: 'Projectors & Smart Boards',
        parent_id: 'd1000000-0000-0000-0000-000000000001',
        sensitive: false,
        visibility: 'public',
      },
    ],
  },
  {
    id: 'd2000000-0000-0000-0000-000000000002',
    name: 'Hostel & Residential Life',
    description: 'Mess dining, room maintenance, and drinking water facilities',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    subcategories: [
      {
        id: 'd2000000-0000-0000-0000-000000000021',
        name: 'Mess Quality & Hygiene',
        parent_id: 'd2000000-0000-0000-0000-000000000002',
        sensitive: false,
        visibility: 'public',
      },
      {
        id: 'd2000000-0000-0000-0000-000000000022',
        name: 'Water Heating & Supply',
        parent_id: 'd2000000-0000-0000-0000-000000000002',
        sensitive: false,
        visibility: 'public',
      },
    ],
  },
  {
    id: 'd3000000-0000-0000-0000-000000000003',
    name: 'Academic Affairs & Examinations',
    description: 'Grade discrepancies, attendance records, and lab equipment access',
    parent_id: null,
    sensitive: false,
    routing_mode: 'chain',
    visibility: 'public',
    subcategories: [
      {
        id: 'd3000000-0000-0000-0000-000000000031',
        name: 'Attendance Portal Glitches',
        parent_id: 'd3000000-0000-0000-0000-000000000003',
        sensitive: false,
        visibility: 'public',
      },
    ],
  },
  {
    id: 'd4000000-0000-0000-0000-000000000004',
    name: 'Harassment & Ragging Prevention (ICC)',
    description: 'Confidential reporting directly handled by the Internal Complaints Committee',
    parent_id: null,
    sensitive: true,
    routing_mode: 'direct',
    visibility: 'private',
    subcategories: [],
  },
]

export const MOCK_DOMAIN_ASSIGNEES: DomainAssignee[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    domain_id: 'd1000000-0000-0000-0000-000000000001',
    level: 1,
    role_name: 'Campus Facility Supervisor',
    assignee_id: '00000000-0000-0000-0000-000000000002',
    sla_hours: 24,
    escalation_condition: 'on_sla_breach',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    domain_id: 'd1000000-0000-0000-0000-000000000001',
    level: 2,
    role_name: 'Estate Officer & Chief Engineer',
    assignee_id: '00000000-0000-0000-0000-000000000001',
    sla_hours: 48,
    escalation_condition: 'on_sla_breach',
  },
]

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    author_id: '00000000-0000-0000-0000-000000000010', // student Aarav Mehta
    domain_id: 'd1000000-0000-0000-0000-000000000001',
    subcategory_id: 'd1000000-0000-0000-0000-000000000011',
    title: 'Central Library 3rd Floor Quiet Zone AC Malfunctioning',
    body: 'The air conditioning in the reading hall is blowing warm air since yesterday afternoon, making study conditions very uncomfortable.',
    status: 'in_progress',
    current_level: 1,
    assigned_to: '00000000-0000-0000-0000-000000000002',
    anonymous: false,
    needs_admin_attention: false,
    upvotes_count: 14,
    has_upvoted: true,
    due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    domain: {
      id: 'd1000000-0000-0000-0000-000000000001',
      name: 'Campus Infrastructure & Maintenance',
      sensitive: false,
      visibility: 'public',
    },
    author: { full_name: 'Aarav Mehta', role_primary: 'student' },
    assignee: { full_name: 'Prof. Rajesh Sharma', role_primary: 'teacher' },
    events: [
      {
        id: 'e1000000-0000-0000-0000-000000000001',
        complaint_id: 'c1000000-0000-0000-0000-000000000001',
        type: 'submitted',
        actor_id: '00000000-0000-0000-0000-000000000010',
        actor: { full_name: 'Aarav Mehta', role_primary: 'student' },
        note: 'Grievance submitted with photo attachment.',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'e1000000-0000-0000-0000-000000000002',
        complaint_id: 'c1000000-0000-0000-0000-000000000001',
        type: 'status_changed',
        from_status: 'submitted',
        to_status: 'in_progress',
        actor_id: '00000000-0000-0000-0000-000000000002',
        actor: { full_name: 'Prof. Rajesh Sharma', role_primary: 'teacher' },
        note: 'HVAC technicians dispatched to inspect cooling tower coil.',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'c2000000-0000-0000-0000-000000000002',
    author_id: '00000000-0000-0000-0000-000000000011',
    domain_id: 'd2000000-0000-0000-0000-000000000002',
    subcategory_id: 'd2000000-0000-0000-0000-000000000022',
    title: 'Hostel Block B Hot Water Heater Circuit Breaker Tripping',
    body: 'Solar geyser water heater on the 2nd floor trips the main breaker every morning around 6:30 AM.',
    status: 'escalated',
    current_level: 2,
    assigned_to: '00000000-0000-0000-0000-000000000001',
    anonymous: true,
    needs_admin_attention: true,
    upvotes_count: 8,
    has_upvoted: false,
    due_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    domain: {
      id: 'd2000000-0000-0000-0000-000000000002',
      name: 'Hostel & Residential Life',
      sensitive: false,
      visibility: 'public',
    },
    author: { full_name: 'Anonymous Student', role_primary: 'student' },
    assignee: { full_name: 'Campus Administrator', role_primary: 'admin' },
    events: [
      {
        id: 'e2000000-0000-0000-0000-000000000001',
        complaint_id: 'c2000000-0000-0000-0000-000000000002',
        type: 'submitted',
        actor: { full_name: 'Anonymous Student', role_primary: 'student' },
        note: 'Reported anonymously.',
        created_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'e2000000-0000-0000-0000-000000000002',
        complaint_id: 'c2000000-0000-0000-0000-000000000002',
        type: 'escalated',
        from_level: 1,
        to_level: 2,
        actor: { full_name: 'System SLA Escalation Engine', role_primary: 'admin' },
        note: 'SLA threshold 24 hours breached without resolution. Escalated to Level 2 authority.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'c3000000-0000-0000-0000-000000000003',
    author_id: '00000000-0000-0000-0000-000000000010',
    domain_id: 'd1000000-0000-0000-0000-000000000001',
    subcategory_id: 'd1000000-0000-0000-0000-000000000012',
    title: 'Computer Science Lab 4 Projector HDMI Cable Damaged',
    body: 'The HDMI connection cable in CS Lab 4 flickers constantly during coding demonstrations.',
    status: 'resolved',
    current_level: 1,
    assigned_to: '00000000-0000-0000-0000-000000000002',
    anonymous: false,
    needs_admin_attention: false,
    upvotes_count: 5,
    has_upvoted: false,
    resolved_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    resolution_note: 'Brand new 4K HDMI cable and adapter installed by Lab Support.',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    domain: {
      id: 'd1000000-0000-0000-0000-000000000001',
      name: 'Campus Infrastructure & Maintenance',
      sensitive: false,
      visibility: 'public',
    },
    author: { full_name: 'Aarav Mehta', role_primary: 'student' },
    assignee: { full_name: 'Prof. Rajesh Sharma', role_primary: 'teacher' },
  },
]

// Mutable mock memory store for live interactions in development
export const mockComplaintsStore: Complaint[] = [...MOCK_COMPLAINTS]
export const mockUpvotesStore = new Set<string>(['c1000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000010'])
