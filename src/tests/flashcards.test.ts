import { describe, it, expect } from 'vitest'
import { calculateSm2 } from '@/features/acad/lib/sm2'
import {
  FlashcardSchema,
  FlashcardDeckSchema,
  RateFlashcardSchema,
  EditFlashcardSchema,
  DeleteFlashcardSchema,
  GenerateFlashcardsSchema,
} from '@/features/acad/schema'
import { generateFallbackCards } from '@/features/acad/lib/flashcard-gen'
import type { ResourceChunk } from '@/features/acad/schema'

describe('SuperMemo-2 (SM-2) Spaced Repetition (lib/sm2.ts)', () => {
  const baseDate = new Date('2026-10-03T12:00:00Z')

  it('handles first review with a passing rating (quality 3: Good)', () => {
    const result = calculateSm2({
      quality: 3,
      currentInterval: 1,
      currentEase: 2.5,
      currentRepetitions: 0,
      now: baseDate,
    })

    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(1)
    // Quality 3 slightly lowers ease (2.5 + (0.1 - 2*0.12) = 2.5 - 0.14 = 2.36)
    expect(result.ease).toBeLessThan(2.5)
    expect(result.ease).toBeGreaterThanOrEqual(1.3)
    expect(result.dueAt.getTime()).toBe(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000)
  })

  it('sets interval to 6 days on the second consecutive correct review', () => {
    const result = calculateSm2({
      quality: 4,
      currentInterval: 1,
      currentEase: 2.5,
      currentRepetitions: 1,
      now: baseDate,
    })

    expect(result.repetitions).toBe(2)
    expect(result.interval).toBe(6)
    expect(result.dueAt.getTime()).toBe(baseDate.getTime() + 6 * 24 * 60 * 60 * 1000)
  })

  it('multiplies interval by ease factor on third and subsequent correct reviews', () => {
    const result = calculateSm2({
      quality: 5,
      currentInterval: 6,
      currentEase: 2.5,
      currentRepetitions: 2,
      now: baseDate,
    })

    expect(result.repetitions).toBe(3)
    // 6 * 2.5 = 15
    expect(result.interval).toBe(15)
    // Perfect score (5) increases ease factor
    expect(result.ease).toBeGreaterThan(2.5)
  })

  it('resets repetitions to 0 and interval to 1 on failed review (quality < 3)', () => {
    const result = calculateSm2({
      quality: 1, // Again
      currentInterval: 15,
      currentEase: 2.4,
      currentRepetitions: 4,
      now: baseDate,
    })

    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
    expect(result.dueAt.getTime()).toBe(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000)
  })

  it('enforces ease floor of 1.3 even after multiple consecutive failures', () => {
    let ease = 1.4
    for (let i = 0; i < 5; i++) {
      const res = calculateSm2({
        quality: 0,
        currentInterval: 1,
        currentEase: ease,
        currentRepetitions: 0,
        now: baseDate,
      })
      ease = res.ease
    }

    expect(ease).toBe(1.3)
  })
})

describe('Flashcard Schemas (schema.ts)', () => {
  it('validates a correct Flashcard item', () => {
    const validCard = {
      id: '00000000-0000-0000-0001-000000000001',
      deck_id: '00000000-0000-0000-0001-000000000002',
      position: 0,
      front: 'What is the time complexity of binary search?',
      back: 'O(log n) in a sorted array.',
      source_page: 4,
      chunk_id: '00000000-0000-0000-0001-000000000003',
    }

    const res = FlashcardSchema.safeParse(validCard)
    expect(res.success).toBe(true)
  })

  it('rejects cards with empty front or back', () => {
    const invalidCard = {
      id: '00000000-0000-0000-0001-000000000001',
      deck_id: '00000000-0000-0000-0001-000000000002',
      position: 0,
      front: '',
      back: '',
    }

    const res = FlashcardSchema.safeParse(invalidCard)
    expect(res.success).toBe(false)
  })

  it('validates a RateFlashcard input', () => {
    const valid = RateFlashcardSchema.safeParse({
      card_id: '00000000-0000-0000-0001-000000000001',
      quality: 4,
    })
    expect(valid.success).toBe(true)

    const invalidQuality = RateFlashcardSchema.safeParse({
      card_id: '00000000-0000-0000-0001-000000000001',
      quality: 6, // Quality max is 5
    })
    expect(invalidQuality.success).toBe(false)
  })

  it('validates EditFlashcard and DeleteFlashcard inputs', () => {
    const edit = EditFlashcardSchema.safeParse({
      card_id: '00000000-0000-0000-0001-000000000001',
      front: 'Updated Question?',
      back: 'Updated Answer.',
    })
    expect(edit.success).toBe(true)

    const del = DeleteFlashcardSchema.safeParse({
      card_id: '00000000-0000-0000-0001-000000000001',
    })
    expect(del.success).toBe(true)

    const gen = GenerateFlashcardsSchema.safeParse({
      resource_id: '00000000-0000-0000-0001-000000000001',
    })
    expect(gen.success).toBe(true)

    const deck = FlashcardDeckSchema.safeParse({
      id: '00000000-0000-0000-0001-000000000001',
      resource_id: '00000000-0000-0000-0001-000000000002',
      owner_id: '00000000-0000-0000-0001-000000000003',
      title: 'Operating Systems Flashcards',
      card_count: 5,
    })
    expect(deck.success).toBe(true)
  })
})

describe('Flashcard Generation & Grounding (lib/flashcard-gen.ts)', () => {
  const mockChunks: ResourceChunk[] = [
    {
      id: '00000000-0000-0000-0001-000000000010',
      resource_id: '00000000-0000-0000-0001-000000000001',
      chunk_index: 0,
      page_number: 1,
      content: 'A stack is a linear data structure following LIFO principle. Elements are pushed and popped from the top.',
      token_count: 24,
    },
    {
      id: '00000000-0000-0000-0001-000000000011',
      resource_id: '00000000-0000-0000-0001-000000000001',
      chunk_index: 1,
      page_number: 2,
      content: 'A queue is a FIFO data structure. Insertion happens at the rear and deletion occurs at the front.',
      token_count: 22,
    },
  ]

  it('generates grounded cards linking to chunk_id and source_page', () => {
    const cards = generateFallbackCards('Data Structures Notes', mockChunks)

    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.front.length).toBeGreaterThan(0)
      expect(card.back.length).toBeGreaterThan(0)
      expect(card.source_page).toBeDefined()
      expect(card.chunk_id).toBeDefined()
    }

    // Verify first card cited page 1
    expect(cards[0].source_page).toBe(1)
    expect(cards[0].chunk_id).toBe(mockChunks[0].id)
  })
})
