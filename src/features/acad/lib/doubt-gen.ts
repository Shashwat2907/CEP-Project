/**
 * Retrieval-Augmented Doubt Clearing Generator via Google Gemini
 * Source of truth: documents/PLAN.md §5.6, TEAM_TASKS.md, CONTRACT.md
 *
 * Grounded in resource chunks; answers cite resource and page number.
 * If retrieval is weak or irrelevant, the bot explicitly reports that it
 * could not find the information rather than hallucinating.
 */

import { getGeminiApiKey, GeminiApiError } from './gemini'
import type { DoubtCitation, ConfidenceStatus } from '../schema'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GENERATION_MODEL = 'gemini-3.8-flash'
const WEAK_RETRIEVAL_THRESHOLD = 0.28

export interface MatchedChunk {
  id: string
  resource_id: string
  resource_title?: string
  chunk_index?: number
  page_number: number | null
  content: string
  similarity: number
}

export interface DoubtAnswerResult {
  answer: string
  citations: DoubtCitation[]
  confidence_status: ConfidenceStatus
}

/**
 * Standard weak retrieval fallback message per PLAN.md §5.6
 */
export const WEAK_RETRIEVAL_MESSAGE =
  "I couldn't find information regarding that in this resource. To ensure academic accuracy, I only answer questions grounded in the uploaded materials. Please try rephrasing or consult your course teacher."

/**
 * Generates an answer to a student doubt using RAG over matched chunks.
 */
export async function generateDoubtAnswerWithGemini(
  question: string,
  matchedChunks: MatchedChunk[],
  scopeTitle?: string
): Promise<DoubtAnswerResult> {
  const trimmed = question.trim()
  if (!trimmed) {
    throw new Error('Question cannot be empty.')
  }

  // 1. Guard: If no chunks or max similarity is below threshold, report weak retrieval
  if (!matchedChunks || matchedChunks.length === 0) {
    return {
      answer: WEAK_RETRIEVAL_MESSAGE,
      citations: [],
      confidence_status: 'weak_retrieval',
    }
  }

  const bestSimilarity = Math.max(...matchedChunks.map((c) => c.similarity ?? 0))
  if (bestSimilarity < WEAK_RETRIEVAL_THRESHOLD) {
    return {
      answer: WEAK_RETRIEVAL_MESSAGE,
      citations: [],
      confidence_status: 'weak_retrieval',
    }
  }

  // 2. Prepare context snippets
  const topChunks = matchedChunks.slice(0, 5)
  const contextText = topChunks
    .map((c, i) => {
      const pageInfo = c.page_number ? `Page ${c.page_number}` : `Section ${i + 1}`
      const title = c.resource_title || scopeTitle || 'Document'
      return `[CHUNK ${i + 1}] [ID: ${c.id}] [Resource: ${title}] [${pageInfo}]\n${c.content.trim()}`
    })
    .join('\n\n---\n\n')

  let apiKey: string | null = null
  try {
    apiKey = getGeminiApiKey()
  } catch {
    // In mock or development environments without an API key, use the deterministic fallback generator
    return generateFallbackDoubtAnswer(trimmed, topChunks, scopeTitle)
  }

  const prompt = `You are a helpful and rigorous college academic tutor assistant.
A student has asked the following doubt regarding their course study material ("${scopeTitle || 'Course Resource'}"):

STUDENT QUESTION:
"${trimmed}"

CONTEXT PASSAGES FROM VERIFIED COURSE DOCUMENTS:
${contextText}

CRITICAL RULES:
1. Ground your answer EXCLUSIVELY on the provided context passages. Do NOT extrapolate or introduce external facts.
2. If the student asks to summarize, extract key formulas/algorithms, or generate potential exam questions, synthesize and explain the provided passages directly. Only if the student question is completely irrelevant or the passages lack any topical overlap should you state: "${WEAK_RETRIEVAL_MESSAGE}" and set confidence_status to "weak_retrieval".
3. In your explanation, cite the relevant page numbers whenever making a factual statement (e.g., "As detailed on Page 4...").
4. Provide structured citations for every passage you utilized. Each citation must have:
   - "chunk_id": the exact UUID from the [ID: ...] tag
   - "resource_id": UUID of the resource
   - "resource_title": Title of the resource
   - "page_number": integer page number or null
   - "excerpt": a brief, relevant sentence from that chunk
5. Format your output as a single valid JSON object with the following schema:
{
  "answer": "Your comprehensive, clear response...",
  "citations": [
    {
      "chunk_id": "uuid",
      "resource_id": "uuid",
      "resource_title": "title",
      "page_number": 1,
      "similarity": 0.85,
      "excerpt": "quoted text"
    }
  ],
  "confidence_status": "grounded"
}`

  try {
    const url = `${GEMINI_API_BASE}/models/${GENERATION_MODEL}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    })

    if (!response.ok) {
      console.warn(`[doubt-gen] Gemini API returned ${response.status}. Using fallback generator.`)
      return generateFallbackDoubtAnswer(trimmed, topChunks, scopeTitle)
    }

    const json = await response.json()
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new GeminiApiError('Gemini returned an empty response.')
    }

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!parsed || typeof parsed.answer !== 'string') {
      return generateFallbackDoubtAnswer(trimmed, topChunks, scopeTitle)
    }

    return {
      answer: parsed.answer,
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      confidence_status:
        parsed.confidence_status === 'weak_retrieval'
          ? 'weak_retrieval'
          : parsed.confidence_status === 'general_guidance'
            ? 'general_guidance'
            : 'grounded',
    }
  } catch (err) {
    console.warn('[doubt-gen] Error calling Gemini API. Falling back to deterministic RAG:', err)
    return generateFallbackDoubtAnswer(trimmed, topChunks, scopeTitle)
  }
}

/**
 * Deterministic fallback generator for offline development and automated test suites.
 */
export function generateFallbackDoubtAnswer(
  question: string,
  chunks: MatchedChunk[],
  scopeTitle?: string
): DoubtAnswerResult {
  if (!chunks || chunks.length === 0) {
    return {
      answer: WEAK_RETRIEVAL_MESSAGE,
      citations: [],
      confidence_status: 'weak_retrieval',
    }
  }

  // Tokenize question into keywords (excluding stop words)
  const stopWords = new Set([
    'what', 'is', 'the', 'a', 'an', 'in', 'on', 'of', 'for', 'to', 'how', 'does', 'do', 'can',
    'explain', 'describe', 'why', 'and', 'or', 'are', 'with', 'about', 'between', 'difference'
  ])

  const keywords = question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))

  // Find chunks that match keywords
  const matchedList = chunks
    .map((chunk) => {
      const lower = chunk.content.toLowerCase()
      const matchCount = keywords.filter((k) => lower.includes(k)).length
      return { chunk, matchCount }
    })
    .filter((item) => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)

  if (matchedList.length === 0 && keywords.length > 0) {
    return {
      answer: WEAK_RETRIEVAL_MESSAGE,
      citations: [],
      confidence_status: 'weak_retrieval',
    }
  }

  const selected = matchedList.length > 0 ? matchedList.slice(0, 3) : chunks.slice(0, 2).map((c) => ({ chunk: c, matchCount: 1 }))

  const citations: DoubtCitation[] = selected.map(({ chunk }) => {
    // Extract first two sentences as excerpt
    const sentences = chunk.content.split(/(?<=[.?!])\s+/).filter(Boolean)
    const excerpt = sentences.slice(0, 2).join(' ') || chunk.content.slice(0, 140)

    return {
      chunk_id: chunk.id,
      resource_id: chunk.resource_id,
      resource_title: chunk.resource_title || scopeTitle,
      page_number: chunk.page_number,
      similarity: chunk.similarity || 0.85,
      excerpt: excerpt.length > 200 ? `${excerpt.slice(0, 197)}...` : excerpt,
    }
  })

  // Format synthesized answer citing the pages
  const answerParagraphs = selected.map(({ chunk }) => {
    const pageCite = chunk.page_number ? `(Page ${chunk.page_number})` : ''
    const sentences = chunk.content.split(/(?<=[.?!])\s+/).filter(Boolean).slice(0, 3).join(' ')
    return `${sentences} ${pageCite}`.trim()
  })

  const primaryPage = citations[0]?.page_number
  const citationHeader = primaryPage
    ? `Based on **${scopeTitle || 'the course material'}** (Page ${primaryPage}):`
    : `Based on **${scopeTitle || 'the course material'}**:`

  const answer = `${citationHeader}\n\n${answerParagraphs.join('\n\n')}`

  return {
    answer,
    citations,
    confidence_status: 'grounded',
  }
}
