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
    id: '00000000-0000-0000-0010-000000000005',
    title: 'Student Notes: Normalization & Transaction Isolation Levels',
    subject_id: '00000000-0000-0000-0002-000000000002',
    year: 2,
    branch: 'Computer Science',
    type: 'notes',
    uploader_id: '00000000-0000-0000-0000-000000000010',
    storage_path: 'resources/2/Computer Science/CS202/student-normalization-notes.pdf',
    file_ext: 'pdf',
    status: 'pending',
    processing_status: 'ready',
    created_at: '2026-10-04T09:30:00Z',
    subject: MOCK_SUBJECTS[5],
    uploader: {
      full_name: 'Aarav Mehta',
      role_primary: 'student',
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
    page_number: 1,
    content:
      'DBMS End-Semester Examination Overview (2024). Section A: Relational Algebra and SQL. Fundamental operators: Selection (sigma), Projection (pi), Cartesian Product (cross), Set Difference (-), and Union (cup). Complex queries involve INNER JOIN, LEFT OUTER JOIN, and correlated subqueries with GROUP BY and HAVING clauses.',
    token_count: 55,
  },
  {
    id: '00000000-0000-0000-0020-000000000005',
    resource_id: '00000000-0000-0000-0010-000000000002',
    chunk_index: 1,
    page_number: 2,
    content:
      'Relational database normalization eliminates data redundancy and update anomalies. First Normal Form (1NF) requires atomic attribute values. Second Normal Form (2NF) eliminates partial dependency on any candidate key. Third Normal Form (3NF) eliminates transitive functional dependencies (for X -> A, either X is a superkey or A is prime). Boyce-Codd Normal Form (BCNF) strictly requires every determinant X to be a superkey.',
    token_count: 68,
  },
  {
    id: '00000000-0000-0000-0020-000000000006',
    resource_id: '00000000-0000-0000-0010-000000000002',
    chunk_index: 2,
    page_number: 3,
    content:
      'Transactions and ACID Properties: Atomicity (all-or-nothing execution), Consistency (preserves database invariants), Isolation (concurrent transactions execute without interference), and Durability (committed changes persist). Serializability ensures concurrent schedule equivalence to a serial schedule. Conflict serializability is verified using Precedence Graphs (acyclic graph = conflict serializable).',
    token_count: 62,
  },
  {
    id: '00000000-0000-0000-0020-000000000007',
    resource_id: '00000000-0000-0000-0010-000000000002',
    chunk_index: 3,
    page_number: 4,
    content:
      'Concurrency Control Protocols: Two-Phase Locking (2PL) guarantees conflict serializability with Growing Phase (acquires locks) and Shrinking Phase (releases locks). Strict 2PL holds exclusive locks until commit/abort to avoid cascading aborts. Deadlock resolution uses Wait-For Graphs and cycle detection or Wait-Die and Wound-Wait timestamp schemes.',
    token_count: 59,
  },
  {
    id: '00000000-0000-0000-0020-000000000008',
    resource_id: '00000000-0000-0000-0010-000000000002',
    chunk_index: 4,
    page_number: 5,
    content:
      'Indexing and Storage Management: B+ Trees maintain balanced height with leaf nodes linked sequentially for efficient range scans. B+ Tree node capacity formula: p * sizeof(pointer) + (p - 1) * sizeof(key) <= block_size. Recovery uses Write-Ahead Logging (WAL) and checkpointing algorithms to reconstruct state following power failure.',
    token_count: 60,
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

// In-memory store for decks keyed by resource_id (persists within server runtime)
export const MOCK_DECKS_STORE = new Map<string, FlashcardDeck>([
  ['00000000-0000-0000-0010-000000000001', MOCK_FLASHCARD_DECK],
])

// In-memory store for cards keyed by deck_id
export const MOCK_CARDS_STORE = new Map<string, FlashcardWithReview[]>([
  ['00000000-0000-0000-0030-000000000001', MOCK_FLASHCARDS],
])

