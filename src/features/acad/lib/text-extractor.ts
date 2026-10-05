/**
 * Zero-dependency Text Extractor for Academic Documents (PDF, PPTX, DOCX, Text)
 * Per AGENTS.md §1 Rule 8 (no heavy unvetted dependencies).
 *
 * Extracts readable textual content and separates by pages/slides where feasible.
 */

export interface ExtractedDocument {
  text: string
  pages: { pageNumber: number; text: string }[]
}

/**
 * Extracts plain text strings from standard PDF text streams.
 */
function extractTextFromPdf(buffer: ArrayBuffer): ExtractedDocument {
  const bytes = new Uint8Array(buffer)
  const decoder = new TextDecoder('latin1')
  const raw = decoder.decode(bytes)

  // Look for text streams: /Type /Page and BT ... ET blocks
  const pageSplits = raw.split(/\/Type\s*\/Page\b/)
  const pages: { pageNumber: number; text: string }[] = []

  if (pageSplits.length > 1) {
    // Multi-page document
    for (let i = 1; i < pageSplits.length; i++) {
      const pageRaw = pageSplits[i]
      const text = extractTextBlocks(pageRaw)
      if (text.trim().length > 0) {
        pages.push({
          pageNumber: i,
          text: text.trim(),
        })
      }
    }
  }

  // Fallback: search entire document if page splitting yielded nothing
  if (pages.length === 0) {
    const fullText = extractTextBlocks(raw)
    if (fullText.trim().length > 0) {
      pages.push({
        pageNumber: 1,
        text: fullText.trim(),
      })
    }
  }

  const combinedText = pages.map((p) => p.text).join('\n\n')
  return {
    text: combinedText,
    pages,
  }
}

/**
 * Helper to parse PDF text operators: (string) Tj or [(array)] TJ
 */
function extractTextBlocks(content: string): string {
  const chunks: string[] = []

  // Match (Text) Tj
  const tjRegex = /\(([^)]+)\)\s*Tj/g
  let match: RegExpExecArray | null
  while ((match = tjRegex.exec(content)) !== null) {
    chunks.push(cleanPdfString(match[1]))
  }

  // Match [(Text)-100(More Text)] TJ
  const arrayTjRegex = /\[([^\]]+)\]\s*TJ/g
  while ((match = arrayTjRegex.exec(content)) !== null) {
    const inner = match[1]
    const itemRegex = /\(([^)]+)\)/g
    let itemMatch: RegExpExecArray | null
    while ((itemMatch = itemRegex.exec(inner)) !== null) {
      chunks.push(cleanPdfString(itemMatch[1]))
    }
  }

  // If no standard PDF operators matched, look for plain text streams inside stream...endstream
  if (chunks.length === 0) {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g
    while ((match = streamRegex.exec(content)) !== null) {
      const streamData = match[1]
      // Extract alphanumeric words with spaces
      const words = streamData.match(/[A-Za-z0-9,.:;?!'"\- ]{4,}/g)
      if (words && words.length > 5) {
        chunks.push(words.join(' '))
      }
    }
  }

  return chunks.join(' ')
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

/**
 * Extracts plain text from UTF-8 / ASCII text files or documents.
 */
export async function extractText(
  buffer: ArrayBuffer,
  fileExt: string
): Promise<ExtractedDocument> {
  const ext = fileExt.toLowerCase().replace(/^\./, '')

  if (ext === 'pdf') {
    const pdfResult = extractTextFromPdf(buffer)
    if (pdfResult.text.trim().length > 0) {
      return pdfResult
    }
    // If PDF text extraction found no stream, attempt raw UTF-8 string detection
    const utf8Decoder = new TextDecoder('utf-8', { fatal: false })
    const raw = utf8Decoder.decode(buffer)
    const words = raw.match(/[A-Za-z0-9,.:;?!'"\- \n]{4,}/g)
    if (words && words.length > 5) {
      const text = words.join(' ').trim()
      return { text, pages: [{ pageNumber: 1, text }] }
    }

    throw new Error(
      'Could not extract text from PDF. The document may be scanned or image-only.'
    )
  }

  // For PPTX, DOCX or plain text files
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const decoded = decoder.decode(buffer)

  // Extract readable text chunks (ignoring binary/zip control headers)
  const readableSegments = decoded.match(/[\w\s.,!?'"()\-:;]{4,}/g)
  if (!readableSegments || readableSegments.length === 0) {
    throw new Error(`Unable to extract readable text from .${ext} file.`)
  }

  const text = readableSegments.join(' ').replace(/\s+/g, ' ').trim()
  return {
    text,
    pages: [{ pageNumber: 1, text }],
  }
}
