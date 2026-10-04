import type { Subject, Resource, ResourceChunk, FlashcardDeck, FlashcardWithReview } from './schema'

/**
 * Mock data for the Academic feature when Supabase database is offline.
 * Mirrors seed.sql so local development works smoothly without timeouts.
 */

export const MOCK_SUBJECTS: Subject[] = [
  // Year 1 — Computer Science
  {
    id: '00000000-0000-0000-0001-000000000001',
    name: 'Engineering Mathematics I',
    code: 'MATH101',
    year: 1,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0001-000000000002',
    name: 'Engineering Physics',
    code: 'PHY101',
    year: 1,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0001-000000000003',
    name: 'Programming Fundamentals (C)',
    code: 'CS101',
    year: 1,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0001-000000000004',
    name: 'Engineering Drawing',
    code: 'ME101',
    year: 1,
    branch: 'Computer Science',
  },

  // Year 2 — Computer Science
  {
    id: '00000000-0000-0000-0002-000000000001',
    name: 'Data Structures and Algorithms',
    code: 'CS201',
    year: 2,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0002-000000000002',
    name: 'Database Management Systems',
    code: 'CS202',
    year: 2,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0002-000000000003',
    name: 'Object Oriented Programming (Java)',
    code: 'CS203',
    year: 2,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0002-000000000004',
    name: 'Engineering Mathematics II',
    code: 'MATH201',
    year: 2,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0002-000000000005',
    name: 'Digital Electronics',
    code: 'EC201',
    year: 2,
    branch: 'Computer Science',
  },

  // Year 3 — Computer Science
  {
    id: '00000000-0000-0000-0003-000000000001',
    name: 'Operating Systems',
    code: 'CS301',
    year: 3,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0003-000000000002',
    name: 'Computer Networks',
    code: 'CS302',
    year: 3,
    branch: 'Computer Science',
  },
  {
    id: '00000000-0000-0000-0003-000000000003',
    name: 'Software Engineering',
    code: 'CS303',
    year: 3,
    branch: 'Computer Science',
  },
]

export const MOCK_RESOURCES: Resource[] = [
  {
    id: '00000000-0000-0000-0010-000000000001',
    title: 'Data Structures & Algorithms Comprehensive Notes',
    subject_id: '00000000-0000-0000-0002-000000000001',
    year: 2,
    branch: 'Computer Science',
    type: 'notes',
    uploader_id: '00000000-0000-0000-0000-000000000002',
    storage_path: 'resources/2/Computer Science/CS201/dsa-notes.pdf',
    file_ext: 'pdf',
    status: 'approved',
    processing_status: 'ready',
    created_at: '2026-10-02T10:00:00Z',
    subject: MOCK_SUBJECTS[4],
    uploader: {
      full_name: 'Prof. Rajesh Sharma',
      role_primary: 'teacher',
    },
    is_saved: false,
  },
  {
    id: '00000000-0000-0000-0010-000000000002',
    title: 'DBMS End-Semester Exam Past Year Questions (2024)',
    subject_id: '00000000-0000-0000-0002-000000000002',
    year: 2,
    branch: 'Computer Science',
    type: 'pyq',
    uploader_id: '00000000-0000-0000-0000-000000000002',
    storage_path: 'resources/2/Computer Science/CS202/dbms-pyq-2024.pdf',
    file_ext: 'pdf',
    status: 'approved',
    processing_status: 'ready',
    created_at: '2026-10-03T11:00:00Z',
    subject: MOCK_SUBJECTS[5],
    uploader: {
      full_name: 'Prof. Rajesh Sharma',
      role_primary: 'teacher',
    },
    is_saved: false,
  },
  {
    id: '00000000-0000-0000-0010-000000000003',
    title: 'Operating Systems — Process Scheduling & Synchronization Slides',
    subject_id: '00000000-0000-0000-0003-000000000001',
    year: 3,
    branch: 'Computer Science',
    type: 'slides',
    uploader_id: '00000000-0000-0000-0000-000000000002',
    storage_path: 'resources/3/Computer Science/CS301/os-slides.pdf',
    file_ext: 'pdf',
    status: 'approved',
    processing_status: 'ready',
    created_at: '2026-10-01T09:00:00Z',
    subject: MOCK_SUBJECTS[9],
    uploader: {
      full_name: 'Prof. Rajesh Sharma',
      role_primary: 'teacher',
    },
    is_saved: false,
  },
  {
    id: '00000000-0000-0000-0010-000000000004',
    title: 'OOP Java — Design Patterns & Collections Framework',
    subject_id: '00000000-0000-0000-0002-000000000003',
    year: 2,
    branch: 'Computer Science',
    type: 'notes',
    uploader_id: '00000000-0000-0000-0000-000000000010',
    storage_path: 'resources/2/Computer Science/CS203/java-patterns.pdf',
    file_ext: 'pdf',
    status: 'approved',
    processing_status: 'ready',
    created_at: '2026-10-03T15:30:00Z',
    subject: MOCK_SUBJECTS[6],
    uploader: {
      full_name: 'Aarav Mehta',
      role_primary: 'student',
    },
    is_saved: false,
  },
]

export const MOCK_CHUNKS: ResourceChunk[] = [
  {
    id: '00000000-0000-0000-0020-000000000001',
    resource_id: '00000000-0000-0000-0010-000000000001',
    chunk_index: 0,
    page_number: 1,
    content:
      'Data structures are specialized formats for organizing and storing data. Common linear data structures include arrays, linked lists, stacks, and queues. Stacks follow Last-In First-Out (LIFO), whereas queues follow First-In First-Out (FIFO).',
    token_count: 42,
  },
  {
    id: '00000000-0000-0000-0020-000000000002',
    resource_id: '00000000-0000-0000-0010-000000000001',
    chunk_index: 1,
    page_number: 3,
    content:
      'Binary Search Trees (BST) maintain keys in sorted order. For every node, all keys in the left subtree are smaller, and all keys in the right subtree are larger. Average search, insertion, and deletion time complexity is O(log n), but degrades to O(n) in degenerate trees.',
    token_count: 51,
  },
  {
    id: '00000000-0000-0000-0020-000000000003',
    resource_id: '00000000-0000-0000-0010-000000000001',
    chunk_index: 2,
    page_number: 5,
    content:
      'Graph algorithms: Dijkstra algorithm finds the single-source shortest path in weighted graphs with non-negative edge weights using a priority queue in O((V + E) log V) time. Bellman-Ford algorithm accommodates negative weight edges and detects negative cycles in O(V * E) time.',
    token_count: 48,
  },
  {
    id: '00000000-0000-0000-0020-000000000004',
    resource_id: '00000000-0000-0000-0010-000000000002',
    chunk_index: 0,
    page_number: 2,
    content:
      'Relational database normalization eliminates data redundancy. First Normal Form (1NF) requires atomic values. Second Normal Form (2NF) eliminates partial dependency on a composite primary key. Third Normal Form (3NF) eliminates transitive functional dependencies.',
    token_count: 40,
  },
]

export const DEV_MOCK_SAVED_IDS = new Set<string>()

export const MOCK_FLASHCARD_DECK: FlashcardDeck = {
  id: '00000000-0000-0000-0030-000000000001',
  resource_id: '00000000-0000-0000-0010-000000000001',
  owner_id: '00000000-0000-0000-0000-000000000001',
  title: 'DSA Key Concepts Flashcards',
  card_count: 2,
  created_at: '2026-10-03T10:00:00Z',
  updated_at: '2026-10-03T10:00:00Z',
}

export const MOCK_FLASHCARDS: FlashcardWithReview[] = [
  {
    id: '00000000-0000-0000-0031-000000000001',
    deck_id: '00000000-0000-0000-0030-000000000001',
    front: 'What is the time complexity of searching in a Balanced Binary Search Tree (AVL / Red-Black)?',
    back: 'O(log n) in both average and worst cases because the tree height is guaranteed to be O(log n).',
    position: 0,
    chunk_id: '00000000-0000-0000-0020-000000000002',
    source_page: 3,
    created_at: '2026-10-03T10:00:00Z',
    review: {
      id: '00000000-0000-0000-0032-000000000001',
      card_id: '00000000-0000-0000-0031-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      repetitions: 1,
      ease: 2.5,
      interval: 1,
      due_at: '2026-10-04T00:00:00Z',
      reviewed_at: '2026-10-03T10:00:00Z',
    },
  },
  {
    id: '00000000-0000-0000-0031-000000000002',
    deck_id: '00000000-0000-0000-0030-000000000001',
    front: 'Which algorithm finds single-source shortest paths in weighted graphs with non-negative edges?',
    back: 'Dijkstra algorithm using a min-priority queue with time complexity O((V + E) log V).',
    position: 1,
    chunk_id: '00000000-0000-0000-0020-000000000003',
    source_page: 5,
    created_at: '2026-10-03T10:00:00Z',
    review: null,
  },
]
