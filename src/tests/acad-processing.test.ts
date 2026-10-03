import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  chunkText,
  chunkPages,
  estimateTokens,
} from '@/features/acad/lib/chunker'
import { extractText } from '@/features/acad/lib/text-extractor'
import {
  ResourceChunkSchema,
  RetryProcessingSchema,
  AiQuotaCheckSchema,
  AiUsageSchema,
} from '@/features/acad/schema'
import {
  getGeminiApiKey,
  generateEmbedding,
  generateBatchEmbeddings,
  GeminiApiError,
} from '@/features/acad/lib/gemini'

describe('Academic Processing Chunker (lib/chunker.ts)', () => {
  it('estimates tokens using character heuristic', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('a'.repeat(2000))).toBe(500)
  })

  it('produces a single chunk when text fits within target limit', () => {
    const text = 'Simple short note on data structures.'
    const chunks = chunkText(text, 1)

    expect(chunks).toHaveLength(1)
    expect(chunks[0].chunkIndex).toBe(0)
    expect(chunks[0].pageNumber).toBe(1)
    expect(chunks[0].content).toBe(text)
    expect(chunks[0].tokenCount).toBeGreaterThan(0)
  })

  it('chunks long text with overlapping segments', () => {
    // 5000 chars should produce multiple chunks with targetTokens = 250 (~1000 chars)
    const longText = Array.from({ length: 25 }, (_, i) => `Paragraph ${i + 1}: ${'lorem ipsum '.repeat(20)}.`).join('\n\n')
    const chunks = chunkText(longText, 1, { targetTokens: 250, overlapTokens: 25 })

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].chunkIndex).toBe(0)
    expect(chunks[1].chunkIndex).toBe(1)

    // Ensure chunks have valid contents and token counts
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0)
      expect(chunk.tokenCount).toBeGreaterThan(0)
    }
  })

  it('preserves page numbers when chunking multi-page documents', () => {
    const pages = [
      { pageNumber: 1, text: 'Page one content covering Binary Search Trees.' },
      { pageNumber: 2, text: 'Page two content covering AVL Trees and Rotations.' },
    ]

    const chunks = chunkPages(pages)
    expect(chunks).toHaveLength(2)
    expect(chunks[0].pageNumber).toBe(1)
    expect(chunks[0].chunkIndex).toBe(0)
    expect(chunks[1].pageNumber).toBe(2)
    expect(chunks[1].chunkIndex).toBe(1)
  })
})

describe('Text Extractor (lib/text-extractor.ts)', () => {
  it('extracts plain text and preserves content', async () => {
    const encoder = new TextEncoder()
    const content = 'Operating Systems Lecture 1: Processes and Threads'
    const buffer = encoder.encode(content).buffer

    const result = await extractText(buffer, 'txt')
    expect(result.text).toContain('Operating Systems')
    expect(result.pages).toHaveLength(1)
  })

  it('throws error when extracting from empty/unreadable file', async () => {
    const buffer = new ArrayBuffer(0)
    await expect(extractText(buffer, 'docx')).rejects.toThrow()
  })
})

describe('Processing Zod Schemas (schema.ts)', () => {
  it('validates a correct ResourceChunk', () => {
    const chunk = {
      id: '00000000-0000-0000-0002-000000000001',
      resource_id: '00000000-0000-0000-0002-000000000002',
      chunk_index: 0,
      page_number: 1,
      content: 'Binary Search Tree definition and lookup complexity.',
      token_count: 12,
    }

    const res = ResourceChunkSchema.safeParse(chunk)
    expect(res.success).toBe(true)
  })

  it('rejects a ResourceChunk with negative chunk_index', () => {
    const chunk = {
      id: '00000000-0000-0000-0002-000000000001',
      resource_id: '00000000-0000-0000-0002-000000000002',
      chunk_index: -1,
      content: 'Invalid chunk',
    }

    const res = ResourceChunkSchema.safeParse(chunk)
    expect(res.success).toBe(false)
  })

  it('validates RetryProcessingSchema', () => {
    expect(RetryProcessingSchema.safeParse({ resource_id: '00000000-0000-0000-0002-000000000001' }).success).toBe(true)
    expect(RetryProcessingSchema.safeParse({ resource_id: 'invalid-id' }).success).toBe(false)
    expect(RetryProcessingSchema.safeParse({}).success).toBe(false)
  })

  it('validates AiQuotaCheckSchema', () => {
    expect(AiQuotaCheckSchema.safeParse({ user_id: '00000000-0000-0000-0001-000000000001' }).success).toBe(true)
    expect(AiQuotaCheckSchema.safeParse({ user_id: 'not-a-uuid' }).success).toBe(false)
  })

  it('validates AiUsageSchema', () => {
    const usage = {
      user_id: '00000000-0000-0000-0001-000000000001',
      usage_date: '2026-10-03',
      call_count: 5,
    }
    expect(AiUsageSchema.safeParse(usage).success).toBe(true)
  })
})

describe('Gemini Embeddings Client (lib/gemini.ts)', () => {
  const originalKey = process.env.GEMINI_API_KEY

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key'
  })

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey
    vi.restoreAllMocks()
  })

  it('throws GeminiApiError when GEMINI_API_KEY is missing', () => {
    delete process.env.GEMINI_API_KEY
    expect(() => getGeminiApiKey()).toThrow(GeminiApiError)
  })

  it('throws error when embedding empty text', async () => {
    await expect(generateEmbedding('')).rejects.toThrow('Cannot generate embedding for empty text')
  })

  it('successfully parses single embedding from Gemini API response', async () => {
    const mockValues = Array(768).fill(0.0123)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: mockValues },
        }),
      })
    )

    const embedding = await generateEmbedding('Sample text to embed')
    expect(embedding).toHaveLength(768)
    expect(embedding[0]).toBe(0.0123)
  })

  it('batches multiple texts and returns aligned embeddings array', async () => {
    const mockValues = Array(768).fill(0.05)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embeddings: [{ values: mockValues }, { values: mockValues }],
        }),
      })
    )

    const embeddings = await generateBatchEmbeddings(['Chunk 1', 'Chunk 2'])
    expect(embeddings).toHaveLength(2)
    expect(embeddings[0]).toHaveLength(768)
    expect(embeddings[1]).toHaveLength(768)
  })

  it('throws GeminiApiError when API returns non-200 status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'API key invalid',
      })
    )

    await expect(generateEmbedding('Test text')).rejects.toThrow(GeminiApiError)
  })
})
