import { describe, it, expect } from 'vitest'
import {
  AskDoubtSchema,
  ClearDoubtThreadSchema,
  DoubtCitationSchema,
  DoubtMessageSchema,
  DoubtThreadSchema,
} from '@/features/acad/schema'
import {
  generateFallbackDoubtAnswer,
  generateDoubtAnswerWithGemini,
  WEAK_RETRIEVAL_MESSAGE,
} from '@/features/acad/lib/doubt-gen'
import type { MatchedChunk } from '@/features/acad/lib/doubt-gen'

describe('Doubt AI Chat Schemas (schema.ts)', () => {
  it('validates a valid AskDoubt input with resource_id', () => {
    const valid = AskDoubtSchema.safeParse({
      question: 'What is the time complexity of quicksort in the worst case?',
      resource_id: '00000000-0000-0000-0001-000000000001',
    })
    expect(valid.success).toBe(true)
  })

  it('validates a valid AskDoubt input with subject_id', () => {
    const valid = AskDoubtSchema.safeParse({
      question: 'Can you explain the master theorem for divide and conquer?',
      subject_id: '00000000-0000-0000-0001-000000000002',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects an empty or too short question (< 2 chars)', () => {
    const tooShort = AskDoubtSchema.safeParse({
      question: '?',
      resource_id: '00000000-0000-0000-0001-000000000001',
    })
    expect(tooShort.success).toBe(false)
  })

  it('rejects a question exceeding 1000 characters', () => {
    const tooLong = AskDoubtSchema.safeParse({
      question: 'a'.repeat(1001),
      resource_id: '00000000-0000-0000-0001-000000000001',
    })
    expect(tooLong.success).toBe(false)
  })

  it('validates ClearDoubtThread input', () => {
    const valid = ClearDoubtThreadSchema.safeParse({
      thread_id: '00000000-0000-0000-0001-000000000001',
    })
    expect(valid.success).toBe(true)

    const invalid = ClearDoubtThreadSchema.safeParse({
      thread_id: 'not-a-uuid',
    })
    expect(invalid.success).toBe(false)
  })

  it('validates a DoubtCitation object', () => {
    const citation = {
      chunk_id: '00000000-0000-0000-0001-000000000001',
      resource_id: '00000000-0000-0000-0001-000000000002',
      resource_title: 'Algorithms Lecture Notes',
      page_number: 14,
      similarity: 0.88,
      excerpt: 'Quicksort exhibits O(n^2) worst case when the partition element is repeatedly the minimum.',
    }

    const res = DoubtCitationSchema.safeParse(citation)
    expect(res.success).toBe(true)
  })

  it('validates a full DoubtMessage and DoubtThread', () => {
    const message = {
      id: '00000000-0000-0000-0001-000000000010',
      thread_id: '00000000-0000-0000-0001-000000000020',
      sender_role: 'assistant',
      content: 'Binary search operates in O(log n) time by halving the search interval.',
      citations: [
        {
          chunk_id: '00000000-0000-0000-0001-000000000030',
          resource_id: '00000000-0000-0000-0001-000000000002',
          page_number: 4,
          excerpt: 'The recurrence relation T(n) = T(n/2) + O(1) solves to O(log n).',
        },
      ],
      confidence_status: 'grounded',
    }

    const msgRes = DoubtMessageSchema.safeParse(message)
    expect(msgRes.success).toBe(true)

    const thread = {
      id: '00000000-0000-0000-0001-000000000020',
      user_id: '00000000-0000-0000-0001-000000000099',
      resource_id: '00000000-0000-0000-0001-000000000002',
      title: 'Doubts: Algorithms Notes',
      messages: [message],
    }

    const threadRes = DoubtThreadSchema.safeParse(thread)
    expect(threadRes.success).toBe(true)
  })
})

describe('Doubt Generation & RAG Grounding (lib/doubt-gen.ts)', () => {
  const sampleChunks: MatchedChunk[] = [
    {
      id: '00000000-0000-0000-0001-000000000011',
      resource_id: '00000000-0000-0000-0001-000000000001',
      page_number: 3,
      content:
        'Dijkstra algorithm calculates the shortest path from a single source vertex to all other vertices in a weighted graph with non-negative edge weights. It uses a priority queue with time complexity O((V + E) log V).',
      similarity: 0.89,
    },
    {
      id: '00000000-0000-0000-0001-000000000012',
      resource_id: '00000000-0000-0000-0001-000000000001',
      page_number: 5,
      content:
        'Bellman-Ford algorithm handles graphs with negative edge weights and detects negative weight cycles in O(V * E) time.',
      similarity: 0.75,
    },
  ]

  it('answers question grounded in relevant chunks with page citations', () => {
    const question = 'What is the time complexity of Dijkstra algorithm and when can it be used?'
    const result = generateFallbackDoubtAnswer(question, sampleChunks, 'Graph Algorithms')

    expect(result.confidence_status).toBe('grounded')
    expect(result.answer).toContain('Page 3')
    expect(result.answer).toContain('Dijkstra')
    expect(result.citations.length).toBeGreaterThan(0)
    expect(result.citations[0].page_number).toBe(3)
    expect(result.citations[0].chunk_id).toBe(sampleChunks[0].id)
  })

  it('cites Bellman-Ford on Page 5 when asked about negative weights', () => {
    const question = 'How do we handle negative edge weights in graphs?'
    const result = generateFallbackDoubtAnswer(question, sampleChunks, 'Graph Algorithms')

    expect(result.confidence_status).toBe('grounded')
    expect(result.citations.some((c) => c.page_number === 5)).toBe(true)
    expect(result.answer).toContain('Page 5')
    expect(result.answer).toContain('Bellman-Ford')
  })

  it('returns weak_retrieval message when query is completely unrelated to provided material', () => {
    const question = 'What is photosynthesis in plant biology?'
    const result = generateFallbackDoubtAnswer(question, sampleChunks, 'Graph Algorithms')

    expect(result.confidence_status).toBe('weak_retrieval')
    expect(result.answer).toBe(WEAK_RETRIEVAL_MESSAGE)
    expect(result.citations.length).toBe(0)
  })

  it('handles empty chunks list by reporting weak retrieval without hallucinating', async () => {
    const question = 'Explain binary tree traversal.'
    const result = await generateDoubtAnswerWithGemini(question, [])

    expect(result.confidence_status).toBe('weak_retrieval')
    expect(result.answer).toBe(WEAK_RETRIEVAL_MESSAGE)
    expect(result.citations).toEqual([])
  })

  it('reports weak retrieval when best chunk similarity is below threshold', async () => {
    const lowSimilarityChunks: MatchedChunk[] = [
      {
        id: '00000000-0000-0000-0001-000000000099',
        resource_id: '00000000-0000-0000-0001-000000000001',
        page_number: 1,
        content: 'Random unrelated course index page content...',
        similarity: 0.15, // Below 0.28 threshold
      },
    ]

    const result = await generateDoubtAnswerWithGemini('Explain quantum mechanics', lowSimilarityChunks)
    expect(result.confidence_status).toBe('weak_retrieval')
    expect(result.answer).toBe(WEAK_RETRIEVAL_MESSAGE)
    expect(result.citations).toEqual([])
  })
})
