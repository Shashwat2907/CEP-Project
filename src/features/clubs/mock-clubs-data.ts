/**
 * Mock Clubs Data and Local Dev Store
 * Source of truth: src/features/clubs/README.md, documents/PLAN.md §5.8
 * Owner: Kedar
 */

import type { Club, ClubMember, ClubNotice } from './schema'

// ── Mock Clubs ──────────────────────────────────────────────────────────────

export const MOCK_CLUBS: Club[] = [
  {
    id: '00000000-0000-0000-0060-000000000001',
    name: 'Coding Club',
    description: 'A vibrant community of developers who build real-world projects, participate in competitive programming contests, and host hackathons throughout the year. Open to all branches and years.',
    tagline: 'Build. Break. Ship. Repeat.',
    cover_image_path: null,
    fee: 0,
    currency: 'INR',
    lead_id: '00000000-0000-0000-0000-000000000002',
    community_id: '00000000-0000-0000-0050-000000000005',
    active: true,
    created_at: '2026-08-15T10:00:00Z',
    member_count: 42,
    user_status: null,
    lead: {
      full_name: 'Prof. Rajesh Sharma',
      college_id: 'TCH101',
      role_primary: 'teacher',
    },
  },
  {
    id: '00000000-0000-0000-0060-000000000002',
    name: 'Photography Club',
    description: 'Explore the art of visual storytelling. From campus shoots to inter-college exhibitions, we capture moments that matter. Includes access to DSLR equipment and darkroom sessions.',
    tagline: 'See the world differently.',
    cover_image_path: null,
    fee: 200,
    currency: 'INR',
    lead_id: '00000000-0000-0000-0000-000000000003',
    community_id: null,
    active: true,
    created_at: '2026-08-20T11:00:00Z',
    member_count: 28,
    user_status: null,
    lead: {
      full_name: 'Dr. Priya Patel',
      college_id: 'TCH102',
      role_primary: 'teacher',
    },
  },
  {
    id: '00000000-0000-0000-0060-000000000003',
    name: 'Robotics & AI Club',
    description: 'Hands-on projects with microcontrollers, ML models, and autonomous systems. We compete in regional robotics competitions and build IoT solutions for campus problems.',
    tagline: 'Engineer the future, today.',
    cover_image_path: null,
    fee: 500,
    currency: 'INR',
    lead_id: '00000000-0000-0000-0000-000000000002',
    community_id: null,
    active: true,
    created_at: '2026-09-01T09:00:00Z',
    member_count: 19,
    user_status: null,
    lead: {
      full_name: 'Prof. Rajesh Sharma',
      college_id: 'TCH101',
      role_primary: 'teacher',
    },
  },
  {
    id: '00000000-0000-0000-0060-000000000004',
    name: 'Literary Society',
    description: 'A sanctuary for writers, readers, and thinkers. We organize open-mic poetry nights, short-story competitions, editorial workshops, and publish the annual college magazine.',
    tagline: 'Words have power. Use them.',
    cover_image_path: null,
    fee: 0,
    currency: 'INR',
    lead_id: '00000000-0000-0000-0000-000000000003',
    community_id: null,
    active: true,
    created_at: '2026-08-18T14:00:00Z',
    member_count: 35,
    user_status: null,
    lead: {
      full_name: 'Dr. Priya Patel',
      college_id: 'TCH102',
      role_primary: 'teacher',
    },
  },
  {
    id: '00000000-0000-0000-0060-000000000005',
    name: 'Entrepreneurship Cell',
    description: 'E-Cell nurtures student entrepreneurs through mentorship sessions, startup weekends, pitch competitions, and connections with the local startup ecosystem and investors.',
    tagline: 'Dream it. Build it. Fund it.',
    cover_image_path: null,
    fee: 100,
    currency: 'INR',
    lead_id: '00000000-0000-0000-0000-000000000002',
    community_id: null,
    active: true,
    created_at: '2026-09-05T10:00:00Z',
    member_count: 56,
    user_status: null,
    lead: {
      full_name: 'Prof. Rajesh Sharma',
      college_id: 'TCH101',
      role_primary: 'teacher',
    },
  },
]

// ── Mock Club Members ───────────────────────────────────────────────────────
// Mutable array — joinClubAction pushes here during dev/offline mode

export const MOCK_CLUB_MEMBERS: ClubMember[] = [
  // Aarav Mehta is a member of Coding Club
  {
    id: '00000000-0000-0000-0061-000000000001',
    club_id: '00000000-0000-0000-0060-000000000001',
    user_id: '00000000-0000-0000-0000-000000000010',
    status: 'member',
    payment_ref: null,
    payment_verified_at: null,
    joined_at: '2026-09-01T10:00:00Z',
    created_at: '2026-09-01T10:00:00Z',
    user: {
      full_name: 'Aarav Mehta',
      college_id: '23BCE1001',
      role_primary: 'student',
    },
  },
  // Diya Sen has requested Photography Club
  {
    id: '00000000-0000-0000-0061-000000000002',
    club_id: '00000000-0000-0000-0060-000000000002',
    user_id: '00000000-0000-0000-0000-000000000011',
    status: 'requested',
    payment_ref: null,
    payment_verified_at: null,
    joined_at: null,
    created_at: '2026-10-01T12:00:00Z',
    user: {
      full_name: 'Diya Sen',
      college_id: '23BCE1002',
      role_primary: 'student',
    },
  },
]

// ── Mock Club Notices ───────────────────────────────────────────────────────
// Mutable — postClubNoticeAction pushes here during dev/offline mode

export const MOCK_CLUB_NOTICES: ClubNotice[] = [
  {
    id: '00000000-0000-0000-0062-000000000001',
    club_id: '00000000-0000-0000-0060-000000000001',
    author_id: '00000000-0000-0000-0000-000000000002',
    body: '🚀 **Hackathon 2026 — Registration Open!**\n\nWe are hosting a 24-hour hackathon on October 20–21, 2026. Theme: **"AI for Campus Life"**. Teams of 3–4. Register by Oct 15. Prizes worth ₹50,000!\n\nRegister at the link below or visit the Coding Club notice board.',
    pinned: true,
    created_at: '2026-10-02T09:00:00Z',
    author: {
      full_name: 'Prof. Rajesh Sharma',
      college_id: 'TCH101',
      role_primary: 'teacher',
    },
  },
  {
    id: '00000000-0000-0000-0062-000000000002',
    club_id: '00000000-0000-0000-0060-000000000001',
    author_id: '00000000-0000-0000-0000-000000000002',
    body: 'Weekly session every **Friday at 5 PM** in Lab 303. This week: **Docker & CI/CD pipelines**. Bring your laptops!',
    pinned: false,
    created_at: '2026-09-27T15:30:00Z',
    author: {
      full_name: 'Prof. Rajesh Sharma',
      college_id: 'TCH101',
      role_primary: 'teacher',
    },
  },
  {
    id: '00000000-0000-0000-0062-000000000003',
    club_id: '00000000-0000-0000-0060-000000000002',
    author_id: '00000000-0000-0000-0000-000000000003',
    body: '📷 **Campus Monsoon Photo Walk — This Saturday!**\n\nMeet at the main gate at 6:30 AM. DSLRs will be available for club members. Breakfast covered. Best 3 shots get featured in the Annual Magazine!',
    pinned: true,
    created_at: '2026-10-03T11:00:00Z',
    author: {
      full_name: 'Dr. Priya Patel',
      college_id: 'TCH102',
      role_primary: 'teacher',
    },
  },
]
