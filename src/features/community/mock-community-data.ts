/**
 * Mock Community Data and Local Dev Store
 * Source of truth: src/features/community/README.md, documents/PLAN.md §5.7
 */

import type {
  Community,
  CommunityMember,
  CommunityMessage,
  CommunityTag,
} from './schema'

export const MOCK_COMMUNITIES: Community[] = [
  {
    id: '00000000-0000-0000-0050-000000000001',
    kind: 'year_branch',
    name: 'SE Computer Science — Class of 2027',
    description: 'Official class community for Year 2 Computer Science students. Class updates and general discussions.',
    official: true,
    year: 2,
    branch: 'Computer Science',
    batch: null,
    subject_id: null,
    private: false,
    member_count: 64,
    created_at: '2026-08-01T09:00:00Z',
  },
  {
    id: '00000000-0000-0000-0050-000000000002',
    kind: 'subject',
    name: 'CS201: Data Structures & Algorithms',
    description: 'Official discussion room for CS201 course materials, doubt resolution, and lab assignments.',
    official: true,
    year: 2,
    branch: 'Computer Science',
    batch: null,
    subject_id: '00000000-0000-0000-0002-000000000001',
    private: false,
    member_count: 58,
    created_at: '2026-08-01T09:00:00Z',
  },
  {
    id: '00000000-0000-0000-0050-000000000003',
    kind: 'subject',
    name: 'CS202: Database Management Systems',
    description: 'Official forum for relational database theory, SQL exercises, transactions, and project reviews.',
    official: true,
    year: 2,
    branch: 'Computer Science',
    batch: null,
    subject_id: '00000000-0000-0000-0002-000000000002',
    private: false,
    member_count: 54,
    created_at: '2026-08-01T09:00:00Z',
  },
  {
    id: '00000000-0000-0000-0050-000000000004',
    kind: 'batch',
    name: 'SE CS — Practical Batch A1',
    description: 'Official laboratory and project coordination channel for Batch A1.',
    official: true,
    year: 2,
    branch: 'Computer Science',
    batch: 'A1',
    subject_id: null,
    private: false,
    member_count: 22,
    created_at: '2026-08-01T09:00:00Z',
  },
  {
    id: '00000000-0000-0000-0050-000000000005',
    kind: 'unofficial',
    name: 'Web Development & Open Source',
    description: 'Student-run group for building fullstack web apps, React, Next.js, APIs, and contributing to open source.',
    official: false,
    year: null,
    branch: null,
    batch: null,
    subject_id: null,
    private: false,
    member_count: 42,
    created_by: '00000000-0000-0000-0000-000000000010',
    created_at: '2026-08-15T14:30:00Z',
  },
  {
    id: '00000000-0000-0000-0050-000000000006',
    kind: 'unofficial',
    name: 'Competitive Programming & Problem Solving',
    description: 'Weekly contest post-mortems, Codeforces, LeetCode daily problems, and technical interview questions.',
    official: false,
    year: null,
    branch: null,
    batch: null,
    subject_id: null,
    private: false,
    member_count: 36,
    created_at: '2026-08-20T16:00:00Z',
  },
  {
    id: '00000000-0000-0000-0050-000000000007',
    kind: 'unofficial',
    name: 'AI, Machine Learning & Robotics',
    description: 'Deep learning paper discussions, computer vision projects, generative AI hackathons, and hardware.',
    official: false,
    year: null,
    branch: null,
    batch: null,
    subject_id: null,
    private: false,
    member_count: 29,
    created_at: '2026-09-01T11:00:00Z',
  },
]

export const MOCK_COMMUNITY_MEMBERS: CommunityMember[] = [
  // Current user (Aarav Mehta) memberships
  {
    community_id: '00000000-0000-0000-0050-000000000001',
    user_id: '00000000-0000-0000-0000-000000000010',
    role: 'member',
    joined_at: '2026-08-01T09:00:00Z',
  },
  {
    community_id: '00000000-0000-0000-0050-000000000002',
    user_id: '00000000-0000-0000-0000-000000000010',
    role: 'member',
    joined_at: '2026-08-01T09:00:00Z',
  },
  {
    community_id: '00000000-0000-0000-0050-000000000003',
    user_id: '00000000-0000-0000-0000-000000000010',
    role: 'member',
    joined_at: '2026-08-01T09:00:00Z',
  },
  {
    community_id: '00000000-0000-0000-0050-000000000004',
    user_id: '00000000-0000-0000-0000-000000000010',
    role: 'member',
    joined_at: '2026-08-01T09:00:00Z',
  },
  {
    community_id: '00000000-0000-0000-0050-000000000005',
    user_id: '00000000-0000-0000-0000-000000000010',
    role: 'moderator',
    joined_at: '2026-08-15T14:30:00Z',
  },
  // Teacher membership (Prof. Rajesh Sharma)
  {
    community_id: '00000000-0000-0000-0050-000000000002',
    user_id: '00000000-0000-0000-0000-000000000002',
    role: 'moderator',
    joined_at: '2026-08-01T09:00:00Z',
  },
  {
    community_id: '00000000-0000-0000-0050-000000000003',
    user_id: '00000000-0000-0000-0000-000000000002',
    role: 'moderator',
    joined_at: '2026-08-01T09:00:00Z',
  },
  // Active peer (Diya Sen)
  {
    community_id: '00000000-0000-0000-0050-000000000002',
    user_id: '00000000-0000-0000-0000-000000000011',
    role: 'member',
    joined_at: '2026-08-01T09:00:00Z',
  },
]

export const MOCK_COMMUNITY_TAGS: CommunityTag[] = [
  {
    community_id: '00000000-0000-0000-0050-000000000002',
    user_id: '00000000-0000-0000-0000-000000000011',
    tag: 'helper',
    awarded_at: '2026-09-12T10:00:00Z',
  },
  {
    community_id: '00000000-0000-0000-0050-000000000002',
    user_id: '00000000-0000-0000-0000-000000000011',
    tag: 'doubt_solver',
    awarded_at: '2026-09-28T16:00:00Z',
  },
]

export const MOCK_COMMUNITY_MESSAGES: CommunityMessage[] = [
  // CS201 Data Structures messages
  {
    id: '00000000-0000-0000-0051-000000000001',
    community_id: '00000000-0000-0000-0050-000000000002',
    author_id: '00000000-0000-0000-0000-000000000002',
    parent_id: null,
    body: 'Welcome everyone to the CS201 official discussion room. Unit 3 trees and graph problems will be covered in tomorrow\'s lab. Please review the binary tree balance factors before attending.',
    upvote_count: 5,
    created_at: '2026-10-02T08:30:00Z',
    author: {
      full_name: 'Prof. Rajesh Sharma',
      college_id: 'TCH101',
      role_primary: 'teacher',
      tags: [],
    },
    reactions: { '👍': ['00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011'] },
  },
  {
    id: '00000000-0000-0000-0051-000000000002',
    community_id: '00000000-0000-0000-0050-000000000002',
    author_id: '00000000-0000-0000-0000-000000000010',
    parent_id: null,
    body: 'Can someone explain when we need to do double rotations (LR or RL) in an AVL tree compared to a single rotation?',
    upvote_count: 2,
    created_at: '2026-10-03T11:15:00Z',
    author: {
      full_name: 'Aarav Mehta',
      college_id: '23BCE1001',
      role_primary: 'student',
      tags: [],
    },
    reactions: {},
  },
  {
    id: '00000000-0000-0000-0051-000000000003',
    community_id: '00000000-0000-0000-0050-000000000002',
    author_id: '00000000-0000-0000-0000-000000000011',
    parent_id: '00000000-0000-0000-0051-000000000002',
    body: 'A single rotation (LL or RR) fixes imbalances where the inserted node is on the outside path. A double rotation (LR or RL) is needed when the inserted node is on the inside subtree (e.g. left child\'s right subtree). The first rotation transforms it into an LL/RR case, and the second rotation restores the balance!',
    upvote_count: 12,
    created_at: '2026-10-03T11:24:00Z',
    author: {
      full_name: 'Diya Sen',
      college_id: '23BCE1002',
      role_primary: 'student',
      tags: ['helper', 'doubt_solver'],
    },
    reactions: { '🔥': ['00000000-0000-0000-0000-000000000010'] },
  },
  // Web Dev community message
  {
    id: '00000000-0000-0000-0051-000000000004',
    community_id: '00000000-0000-0000-0050-000000000005',
    author_id: '00000000-0000-0000-0000-000000000010',
    parent_id: null,
    body: 'We are organizing an open-source sprint this weekend for building fullstack Next.js campus utilities! Anyone interested in collaborating, share your GitHub handles below.',
    upvote_count: 8,
    created_at: '2026-10-04T10:00:00Z',
    author: {
      full_name: 'Aarav Mehta',
      college_id: '23BCE1001',
      role_primary: 'student',
      tags: [],
    },
    reactions: { '🚀': ['00000000-0000-0000-0000-000000000011'] },
  },
]

export const MOCK_MESSAGE_VOTES = new Set<string>([
  '00000000-0000-0000-0051-000000000003:00000000-0000-0000-0000-000000000010',
])
