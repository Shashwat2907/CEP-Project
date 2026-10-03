/**
 * Google Gemini Embeddings API Client
 * Source of truth: src/features/acad/README.md §8
 *
 * Uses native fetch without heavy external SDKs (per AGENTS.md §1 Rule 8).
 * Model: text-embedding-004 (768 dimensions).
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const EMBEDDING_MODEL = 'text-embedding-004'
const BATCH_SIZE = 10

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rawResponse?: unknown
  ) {
    super(message)
    this.name = 'GeminiApiError'
  }
}

/**
 * Returns the Gemini API key from environment variables.
 */
export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.trim().length === 0) {
    throw new GeminiApiError(
      'GEMINI_API_KEY is not set in environment variables. Please check .env.local.'
    )
  }
  return key.trim()
}

/**
 * Generates a 768-dimensional embedding for a single text string using text-embedding-004.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getGeminiApiKey()
  const trimmed = text.trim()
  if (!trimmed) {
    throw new GeminiApiError('Cannot generate embedding for empty text.')
  }

  const url = `${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text: trimmed }],
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new GeminiApiError(
      `Gemini Embeddings API error (${response.status}): ${errorBody || response.statusText}`,
      response.status
    )
  }

  const json = await response.json()
  const values = json?.embedding?.values

  if (!Array.isArray(values) || values.length === 0) {
    throw new GeminiApiError('Malformed embedding response from Gemini API.')
  }

  return values
}

/**
 * Batches multiple texts to generate embeddings efficiently.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = getGeminiApiKey()
  if (!texts || texts.length === 0) return []

  const results: number[][] = []

  // Process in chunks of BATCH_SIZE to avoid payload limits
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const validBatch = batch.map((t) => t.trim() || ' ')

    const url = `${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: validBatch.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
        })),
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new GeminiApiError(
        `Gemini batchEmbedContents error (${response.status}): ${errorBody || response.statusText}`,
        response.status
      )
    }

    const json = await response.json()
    const embeddings = json?.embeddings

    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
      throw new GeminiApiError('Unexpected response shape from Gemini batch embedding API.')
    }

    for (const item of embeddings) {
      results.push(item.values)
    }
  }

  return results
}
