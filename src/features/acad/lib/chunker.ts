/**
 * Academic Resource Chunker
 * Source of truth: src/features/acad/README.md §8
 *
 * Splits document text into overlapping chunks (~500 tokens with 50-token overlap).
 * Respects page boundaries where available and cuts at semantic boundaries (paragraphs, sentences).
 */

export interface PageContent {
  pageNumber: number
  text: string
}

export interface ChunkResult {
  chunkIndex: number
  pageNumber: number | null
  content: string
  tokenCount: number
}

export interface ChunkerOptions {
  targetTokens?: number
  overlapTokens?: number
  charsPerToken?: number
}

const DEFAULT_TARGET_TOKENS = 500
const DEFAULT_OVERLAP_TOKENS = 50
const CHARS_PER_TOKEN = 4

/**
 * Approximate token count from text using standard 4 chars/token heuristic.
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0
  return Math.ceil(text.trim().length / CHARS_PER_TOKEN)
}

/**
 * Chunks a single raw string of text into overlapping segments.
 */
export function chunkText(
  text: string,
  pageNumber: number | null = null,
  options: ChunkerOptions = {}
): ChunkResult[] {
  const targetTokens = options.targetTokens ?? DEFAULT_TARGET_TOKENS
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS
  const charsPerToken = options.charsPerToken ?? CHARS_PER_TOKEN

  const targetChars = targetTokens * charsPerToken
  const overlapChars = overlapTokens * charsPerToken

  const cleaned = text.replace(/\r\n/g, '\n').trim()
  if (!cleaned) return []

  // If text fits in a single chunk, return immediately
  if (cleaned.length <= targetChars) {
    return [
      {
        chunkIndex: 0,
        pageNumber,
        content: cleaned,
        tokenCount: estimateTokens(cleaned),
      },
    ]
  }

  const chunks: ChunkResult[] = []
  let startIndex = 0
  let chunkIndex = 0

  while (startIndex < cleaned.length) {
    const endIndex = startIndex + targetChars

    if (endIndex >= cleaned.length) {
      const slice = cleaned.slice(startIndex).trim()
      if (slice.length > 0) {
        chunks.push({
          chunkIndex,
          pageNumber,
          content: slice,
          tokenCount: estimateTokens(slice),
        })
      }
      break
    }

    // Try to find natural breakpoint (paragraph > sentence > space)
    const window = cleaned.slice(startIndex, endIndex)
    let breakPoint = -1

    const lastPara = window.lastIndexOf('\n\n')
    if (lastPara > targetChars * 0.5) {
      breakPoint = lastPara + 2
    } else {
      const lastSentence = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('! '),
        window.lastIndexOf('? ')
      )
      if (lastSentence > targetChars * 0.5) {
        breakPoint = lastSentence + 2
      } else {
        const lastSpace = window.lastIndexOf(' ')
        if (lastSpace > targetChars * 0.5) {
          breakPoint = lastSpace + 1
        }
      }
    }

    const actualEnd = breakPoint !== -1 ? startIndex + breakPoint : endIndex
    const slice = cleaned.slice(startIndex, actualEnd).trim()

    if (slice.length > 0) {
      chunks.push({
        chunkIndex,
        pageNumber,
        content: slice,
        tokenCount: estimateTokens(slice),
      })
      chunkIndex++
    }

    // Move next start index back by overlapChars
    startIndex = Math.max(actualEnd - overlapChars, startIndex + 1)
  }

  return chunks
}

/**
 * Chunks multi-page document contents preserving page number citations.
 */
export function chunkPages(
  pages: PageContent[],
  options: ChunkerOptions = {}
): ChunkResult[] {
  const allChunks: ChunkResult[] = []
  let globalChunkIndex = 0

  for (const page of pages) {
    const pageChunks = chunkText(page.text, page.pageNumber, options)
    for (const chunk of pageChunks) {
      allChunks.push({
        ...chunk,
        chunkIndex: globalChunkIndex++,
      })
    }
  }

  return allChunks
}
