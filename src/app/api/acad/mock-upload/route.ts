import { NextRequest, NextResponse } from 'next/server'
import {
  MOCK_CHUNKS,
  MOCK_RESOURCES,
  MOCK_DECKS_STORE,
  MOCK_CARDS_STORE,
} from '@/features/acad/mock-acad-data'
import { saveUploadedFile } from '@/features/acad/upload-store'
import { extractText, isNaturalText } from '@/features/acad/lib/text-extractor'
import { chunkPages, chunkText } from '@/features/acad/lib/chunker'
import { generateFlashcardsWithGemini } from '@/features/acad/lib/flashcard-gen'
import type { FlashcardDeck, FlashcardWithReview } from '@/features/acad/schema'

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('id')

    // Read the incoming file binary to ensure complete stream receipt
    const arrayBuffer = await request.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (resourceId) {
      const res = MOCK_RESOURCES.find((r) => r.id === resourceId)
      const headerFileName = request.headers.get('x-file-name')
      const originalName = headerFileName ? decodeURIComponent(headerFileName) : null

      const ext =
        res?.file_ext ||
        (originalName ? originalName.split('.').pop()?.toLowerCase() : 'pdf') ||
        'pdf'

      const fileName =
        originalName ||
        `${(res?.title || 'Academic_Resource').replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.${ext}`

      const contentType =
        ext === 'pdf'
          ? 'application/pdf'
          : ext === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : ext === 'pptx'
              ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
              : 'application/octet-stream'

      // 1. Save uploaded file to shared in-memory map & disk cache
      saveUploadedFile(resourceId, {
        buffer,
        fileName,
        contentType,
      })

      // 2. Extract genuine text from the uploaded file buffer
      try {
        const extracted = await extractText(buffer, ext, res?.title || fileName)
        const producedChunks =
          extracted.pages && extracted.pages.length > 0
            ? chunkPages(extracted.pages)
            : chunkText(extracted.text)

        const validProduced = (producedChunks || []).filter((c) => isNaturalText(c.content))

        if (validProduced && validProduced.length > 0) {
          // Replace any temporary chunks for this resource
          const remaining = MOCK_CHUNKS.filter((c) => c.resource_id !== resourceId)
          MOCK_CHUNKS.length = 0
          MOCK_CHUNKS.push(...remaining)

          const newChunks = validProduced.map((c) => ({
            id: crypto.randomUUID(),
            resource_id: resourceId,
            chunk_index: c.chunkIndex,
            page_number: c.pageNumber,
            content: c.content,
            token_count: c.tokenCount,
          }))
          MOCK_CHUNKS.push(...newChunks)

          // 3. Immediately generate 5 to 10 rich flashcards grounded in actual document content
          const generatedCards = await generateFlashcardsWithGemini(
            res?.title || fileName,
            newChunks
          )
          if (generatedCards.length > 0) {
            const deckId = crypto.randomUUID()
            const newDeck: FlashcardDeck = {
              id: deckId,
              resource_id: resourceId,
              owner_id: res?.uploader_id || '00000000-0000-0000-0000-000000000001',
              title: `${res?.title || 'Course'} Flashcards`,
              card_count: generatedCards.length,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            const cardsForStore: FlashcardWithReview[] = generatedCards.map((c, i) => ({
              id: crypto.randomUUID(),
              deck_id: deckId,
              position: i,
              front: c.front,
              back: c.back,
              source_page: c.source_page,
              chunk_id: c.chunk_id,
              created_at: new Date().toISOString(),
              review: null,
            }))

            MOCK_DECKS_STORE.set(resourceId, newDeck)
            MOCK_CARDS_STORE.set(deckId, cardsForStore)
          }
        }
      } catch (extractionErr) {
        console.warn('[mock-upload] Text extraction notice:', extractionErr)

        // If file extraction failed (e.g. scanned image PDF without OCR), seed descriptive topic chunks
        const exists = MOCK_CHUNKS.some((c) => c.resource_id === resourceId)
        if (!exists && res) {
          MOCK_CHUNKS.push({
            id: crypto.randomUUID(),
            resource_id: resourceId,
            chunk_index: 0,
            page_number: 1,
            content: `${res.title}. This verified academic document covers core concepts, theorems, equations, and practice questions for ${res.branch} Year ${res.year}. Key topics include foundational theory, step-by-step algorithms, implementations, and past examination problems.`,
            token_count: 55,
          })
          MOCK_CHUNKS.push({
            id: crypto.randomUUID(),
            resource_id: resourceId,
            chunk_index: 1,
            page_number: 2,
            content: `Advanced analytical methods and practical applications. Summary of formulas, architectural diagrams, complexity analyses, and typical solutions to end-semester examination questions for ${res.title}.`,
            token_count: 48,
          })
        }
      }
    }

    return NextResponse.json({ ok: true, size: buffer.byteLength })
  } catch (error) {
    console.error('[mock-upload] Upload handler error:', error)
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 })
  }
}


