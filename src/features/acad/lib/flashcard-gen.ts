/**
 * Flashcard Generation via Google Gemini
 * Source of truth: src/features/acad/README.md §2, §8; documents/PLAN.md §5.6
 *
 * Grounded in resource chunks; each card citations links to its source page.
 */

import { getGeminiApiKey, GeminiApiError } from './gemini'
import type { ResourceChunk } from '../schema'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemma-4-26b-a4b-it']

export interface GeneratedCard {
  front: string
  back: string
  source_page: number | null
  chunk_id: string | null
}

import { isNaturalText } from './text-extractor'
export { isNaturalText }

/**
 * Generates flashcards from approved resource chunks using Gemini models.
 * Enforces JSON mode, high-yield academic prompts, and grounding citations.
 */
export async function generateFlashcardsWithGemini(
  resourceTitle: string,
  chunks: ResourceChunk[]
): Promise<GeneratedCard[]> {
  if (!chunks || chunks.length === 0) {
    throw new Error('Cannot generate flashcards: No text chunks available for this resource.')
  }

  // Filter out any chunks with non-natural text (e.g. binary glyphs)
  const validChunks = chunks.filter((c) => isNaturalText(c.content))
  const chunksToUse = validChunks.length > 0 ? validChunks : chunks

  // Build context from chunks with page and chunk metadata
  const chunkSnippets = chunksToUse.slice(0, 15).map((c, i) => {
    const pageStr = c.page_number ? `Page ${c.page_number}` : `Section ${i + 1}`
    return `[CHUNK_ID: ${c.id}] [${pageStr}]\n${c.content.trim()}`
  })

  const prompt = `You are an expert college professor creating rigorous, high-yield study flashcards for university students.
Create 6 to 10 high-yield study flashcards based SOLELY on the following course material from "${resourceTitle}".

PEDAGOGICAL & CONCEPTUAL REQUIREMENTS:
1. Every card must test real educational subject knowledge (e.g. fundamental definitions, principles, mechanisms, chemical reactions, formulas, differences, or algorithms).
2. Ask clear, direct, examination-level questions:
   - "Why does hard water consume soap instead of lathering?"
   - "What is the difference between temporary and permanent hardness in water?"
   - "Which chemical ions cause temporary hardness, and how can they be removed?"
   - "How is total hardness calculated from temporary and permanent hardness?"
3. STRICTLY FORBIDDEN:
   - NEVER ask meta or template questions like "How is X used in ${resourceTitle}", "What is covered in Module 4", "Key concept from Section X", or "According to the notes...".
   - NEVER produce gibberish, random alphanumeric strings, or code symbols.
4. JSON STRUCTURE:
   - "front": An engaging, professional academic question or definition prompt.
   - "back": A clear, accurate, complete technical explanation or answer.
   - "source_page": The integer page number indicated in the chunk header (e.g. if header is "[Page 3]", value is 3). If unknown, use null.
   - "chunk_id": The exact UUID from the [CHUNK_ID: ...] tag where the answer was found.
5. Return ONLY a valid JSON array of objects with keys: "front", "back", "source_page", "chunk_id".

COURSE CONTENT:
${chunkSnippets.join('\n\n---\n\n')}`

  let apiKey: string | null = null
  try {
    apiKey = getGeminiApiKey()
  } catch {
    return generateFallbackCards(resourceTitle, chunksToUse)
  }

  // Attempt generation with available models
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`
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
        console.warn(`[flashcard-gen] Model ${model} returned ${response.status}: ${errorText.slice(0, 120)}. Trying next candidate.`)
        continue
      }

      const json = await response.json()
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) continue

      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const parsed = JSON.parse(cleaned)
      if (!Array.isArray(parsed) || parsed.length === 0) continue

      return parsed.map((item: Record<string, unknown>, idx: number) => ({
        front: typeof item.front === 'string' && item.front.trim() ? item.front.trim() : `Key Concept ${idx + 1}`,
        back: typeof item.back === 'string' && item.back.trim() ? item.back.trim() : 'See source material for details.',
        source_page: typeof item.source_page === 'number' ? item.source_page : (chunksToUse[idx % chunksToUse.length]?.page_number ?? 1),
        chunk_id: typeof item.chunk_id === 'string' && item.chunk_id ? item.chunk_id : (chunksToUse[idx % chunksToUse.length]?.id ?? null),
      }))
    } catch (err) {
      console.warn(`[flashcard-gen] Model ${model} failed, trying next:`, err)
    }
  }

  return generateFallbackCards(resourceTitle, chunksToUse)
}

/**
 * Content-driven fallback generator when Gemini API is offline, unconfigured or in tests.
 * Extracts 5 to 10 high-yield concept definitions, questions, algorithms, and key points
 * directly from the document's actual text chunks without awkward meta templates.
 */
export function generateFallbackCards(
  resourceTitle: string,
  chunks: ResourceChunk[]
): GeneratedCard[] {
  const cards: GeneratedCard[] = []
  const seenFronts = new Set<string>()

  const addCard = (
    front: string,
    back: string,
    page: number | null,
    chunkId: string | null
  ) => {
    const cleanFront = front.trim().replace(/\s+/g, ' ')
    const cleanBack = back.trim().replace(/\s+/g, ' ')
    if (cleanFront.length < 8 || cleanBack.length < 10) return
    if (!isNaturalText(cleanFront) || !isNaturalText(cleanBack)) return

    const key = cleanFront.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seenFronts.has(key)) return
    seenFronts.add(key)
    cards.push({
      front: cleanFront,
      back: cleanBack,
      source_page: page,
      chunk_id: chunkId,
    })
  }

  // Pass 1: Explicit Question-Answer pairs in the text (e.g. "Q1: Explain...", "Question: What is...")
  for (const chunk of chunks) {
    const qMatches = chunk.content.matchAll(
      /(?:^|\n)(?:Q\d*[:.]|\bQuestion[:.]|\bProblem[:.])\s*([^\n?]+[?])\s*(?:(?:A\d*[:.]|\bAnswer[:.]|\bSolution[:.])\s*)?([^\n.!?]{15,350}[.!?])/gi
    )
    for (const m of qMatches) {
      addCard(m[1], m[2], chunk.page_number ?? 1, chunk.id)
      if (cards.length >= 10) return cards
    }
  }

  // Pass 2: Meaningful Term: Definition pairs (e.g. "Total Hardness: Sum of temporary and permanent...")
  for (const chunk of chunks) {
    const termMatches = chunk.content.matchAll(
      /(?:^|\n|•\s*|-\s*|\*\s*)([A-Z][A-Za-z0-9\s\-–/]{2,45}):\s+([A-Z0-9][^\n.!?]{15,280}[.!?])/g
    )
    for (const m of termMatches) {
      const rawTerm = m[1].trim()
      const def = m[2].trim()

      if (
        !rawTerm.toLowerCase().startsWith('note') &&
        !rawTerm.toLowerCase().startsWith('page') &&
        !rawTerm.toLowerCase().startsWith('section') &&
        isNaturalText(rawTerm)
      ) {
        let question = ''
        if (/^Reaction of\s+/i.test(rawTerm)) {
          question = `What is the chemical reaction for ${rawTerm.replace(/^Reaction of\s+/i, '')}?`
        } else if (/^(?:Types|Classification) of\s+/i.test(rawTerm)) {
          question = `What are the different ${rawTerm.replace(/^(?:Types|Classification) of\s+/i, '')}?`
        } else if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(rawTerm) || rawTerm.length < 25) {
          question = `What is ${rawTerm} and what does it entail?`
        } else {
          question = `Explain ${rawTerm}.`
        }

        addCard(question, def, chunk.page_number ?? 1, chunk.id)
      }
      if (cards.length >= 10) return cards
    }
  }

  // Pass 3: Definition sentences: "X is defined as...", "X refers to...", "X is a..."
  for (const chunk of chunks) {
    const defMatches = chunk.content.matchAll(
      /(?:^|[.!?]\s+)([A-Z][A-Za-z0-9\s\-]{2,35})\s+(is defined as|refers to|is a|is an|represents|consists of|guarantees|ensures|maintains)\s+([^.!?\n]{20,260}[.!?])/gi
    )
    for (const m of defMatches) {
      const term = m[1].trim()
      const verb = m[2]
      const rest = m[3].trim()
      if (
        !term.toLowerCase().includes('document') &&
        !term.toLowerCase().includes('chapter') &&
        isNaturalText(term)
      ) {
        let q = `Define ${term}.`
        if (verb === 'refers to') {
          q = `What is meant by ${term}?`
        } else if (verb === 'consists of') {
          q = `What does ${term} consist of?`
        }
        addCard(q, `${term} ${verb} ${rest}`, chunk.page_number ?? 1, chunk.id)
      }
      if (cards.length >= 10) return cards
    }
  }

  // Pass 4: Mechanism, causes, and functional sentences
  for (const chunk of chunks) {
    const sentences = chunk.content
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.length < 320 && isNaturalText(s))

    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i]

      // Check for causes: "Water is hard mainly due to..." / "X is caused by..."
      const causeMatch = s.match(/^([A-Z][A-Za-z0-9\s\-]{2,30}?)\s+(?:is|are)\s+(?:hard|caused|formed|produced|triggered|governed)\s+(?:mainly\s+)?(?:due to|by)\s+([^.!?]+)/i)
      if (causeMatch) {
        addCard(`What causes ${causeMatch[1].trim().toLowerCase()}?`, s, chunk.page_number ?? (i + 1), chunk.id)
        if (cards.length >= 10) return cards
        continue
      }

      // Check for contrast/comparison: "Temporary hardness ... while permanent hardness ..."
      if (s.toLowerCase().includes('temporary') && s.toLowerCase().includes('permanent')) {
        addCard(
          'What is the fundamental difference between temporary hardness and permanent hardness?',
          s,
          chunk.page_number ?? (i + 1),
          chunk.id
        )
        if (cards.length >= 10) return cards
        continue
      }

      // Check for soap/precipitation: "does not form ... lather"
      if (s.toLowerCase().includes('soap') && (s.toLowerCase().includes('lather') || s.toLowerCase().includes('foam') || s.toLowerCase().includes('ppt'))) {
        addCard(
          'Why does hard water consume soap and fail to form lather easily?',
          s,
          chunk.page_number ?? (i + 1),
          chunk.id
        )
        if (cards.length >= 10) return cards
        continue
      }

      // Check for active verbs
      const firstWords = s.match(
        /^([A-Z][A-Za-z0-9\s\-]{3,35}?)(?:\s+(?:provides|guarantees|ensures|implements|maintains|calculates|handles|uses|requires|allows|executes|prevents|runs|operates|degrades))/i
      )
      if (firstWords && isNaturalText(firstWords[1])) {
        addCard(`How does ${firstWords[1].trim()} function?`, s, chunk.page_number ?? (i + 1), chunk.id)
      }
      if (cards.length >= 10) return cards
    }
  }

  // Pass 5: If fewer than 5 cards, extract substantive sentences as topical queries
  if (cards.length < 5) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const sentences = chunk.content
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 35 && isNaturalText(s))

      for (const sent of sentences) {
        const words = sent.split(/\s+/).slice(0, 4).join(' ')
        if (isNaturalText(words)) {
          addCard(
            `Explain the principle regarding: "${words}..."`,
            sent,
            chunk.page_number ?? (i + 1),
            chunk.id
          )
        }
        if (cards.length >= 6) break
      }
      if (cards.length >= 6) break
    }
  }

  // Fallback for empty/scanned edge case
  if (cards.length === 0 && chunks.length > 0) {
    const validContent = chunks.find((c) => isNaturalText(c.content))?.content || chunks[0].content
    cards.push({
      front: `What core topics are covered in ${resourceTitle.replace(/\.[^/.]+$/, '')}?`,
      back: validContent.slice(0, 220),
      source_page: chunks[0].page_number ?? 1,
      chunk_id: chunks[0].id,
    })
  }

  return cards
}
