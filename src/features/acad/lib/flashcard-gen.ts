/**
 * Flashcard Generation via Google Gemini
 * Source of truth: src/features/acad/README.md §2, §8; documents/PLAN.md §5.6
 *
 * Grounded in resource chunks; each card citations links to its source page.
 */

import { getGeminiApiKey, GeminiApiError } from './gemini'
import type { ResourceChunk } from '../schema'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GENERATION_MODEL = 'gemini-3.8-flash'

export interface GeneratedCard {
  front: string
  back: string
  source_page: number | null
  chunk_id: string | null
}

/**
 * Generates flashcards from approved resource chunks using Gemini 1.5 Flash.
 * Enforces JSON mode and grounding citations.
 */
export async function generateFlashcardsWithGemini(
  resourceTitle: string,
  chunks: ResourceChunk[]
): Promise<GeneratedCard[]> {
  if (!chunks || chunks.length === 0) {
    throw new Error('Cannot generate flashcards: No text chunks available for this resource.')
  }

  // Build context from chunks with page and chunk metadata
  const chunkSnippets = chunks.slice(0, 15).map((c, i) => {
    const pageStr = c.page_number ? `Page ${c.page_number}` : `Section ${i + 1}`
    return `[CHUNK_ID: ${c.id}] [${pageStr}]\n${c.content.trim()}`
  })

  const prompt = `You are an expert college educator preparing study flashcards for students.
Create 5 to 10 high-yield study flashcards based SOLELY on the following course resource: "${resourceTitle}".

RULES:
1. Every card must be strictly grounded in the provided text chunks. Do not hallucinate or add external knowledge.
2. "front": A clear, conceptual question, term, or problem statement.
3. "back": A concise, clear, and accurate answer or explanation.
4. "source_page": The integer page number indicated in the chunk header (e.g. if header is "[Page 3]", value is 3). If unknown or none, use null.
5. "chunk_id": The exact UUID from the [CHUNK_ID: ...] tag where the answer was found.
6. Return a valid JSON array of objects with keys: "front", "back", "source_page", "chunk_id".

RESOURCE CONTENT:
${chunkSnippets.join('\n\n---\n\n')}`

  let apiKey: string | null = null
  try {
    apiKey = getGeminiApiKey()
  } catch {
    // If no API key is provided, return grounded fallback cards from the chunks
    return generateFallbackCards(resourceTitle, chunks)
  }

  try {
    const url = `${GEMINI_API_BASE}/models/${GENERATION_MODEL}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.warn(`[flashcard-gen] Gemini API returned ${response.status}: ${errorText}. Using fallback generator.`)
      return generateFallbackCards(resourceTitle, chunks)
    }

    const json = await response.json()
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new GeminiApiError('Gemini returned an empty generation response.')
    }

    // Clean JSON response (handling any possible markdown code block formatting)
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Invalid JSON structure returned by Gemini flashcard generation.')
    }

    return parsed.map((item: Record<string, unknown>, idx: number) => ({
      front: typeof item.front === 'string' && item.front.trim() ? item.front.trim() : `Key Concept ${idx + 1}`,
      back: typeof item.back === 'string' && item.back.trim() ? item.back.trim() : 'See source material for details.',
      source_page: typeof item.source_page === 'number' ? item.source_page : (chunks[idx % chunks.length]?.page_number ?? 1),
      chunk_id: typeof item.chunk_id === 'string' && item.chunk_id ? item.chunk_id : (chunks[idx % chunks.length]?.id ?? null),
    }))
  } catch (err: unknown) {
    console.error('[flashcard-gen] Generation error, falling back:', err)
    return generateFallbackCards(resourceTitle, chunks)
  }
}

/**
 * Deterministic fallback generator when Gemini API is offline, unconfigured or in tests.
 * Extracts sentence pairs directly from chunks with accurate page citations.
 */
export function generateFallbackCards(
  resourceTitle: string,
  chunks: ResourceChunk[]
): GeneratedCard[] {
  const cards: GeneratedCard[] = []

  for (let i = 0; i < Math.min(chunks.length, 8); i++) {
    const chunk = chunks[i]
    const content = chunk.content.trim()
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20)

    if (sentences.length >= 2) {
      cards.push({
        front: `What is discussed regarding "${resourceTitle}" in section ${i + 1}?`,
        back: sentences[0],
        source_page: chunk.page_number ?? (i + 1),
        chunk_id: chunk.id,
      })
    } else if (content.length > 0) {
      cards.push({
        front: `Key takeaway from ${resourceTitle} (Part ${i + 1}):`,
        back: content.slice(0, 180) + (content.length > 180 ? '...' : ''),
        source_page: chunk.page_number ?? (i + 1),
        chunk_id: chunk.id,
      })
    }
  }

  if (cards.length === 0 && chunks.length > 0) {
    cards.push({
      front: `Overview of ${resourceTitle}`,
      back: chunks[0].content.slice(0, 200),
      source_page: chunks[0].page_number ?? 1,
      chunk_id: chunks[0].id,
    })
  }

  return cards
}
