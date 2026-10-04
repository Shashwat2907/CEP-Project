import { NextRequest, NextResponse } from 'next/server'
import { MOCK_CHUNKS, MOCK_RESOURCES } from '@/features/acad/mock-acad-data'

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('id')

    // Read the incoming file binary to ensure complete stream receipt
    const buffer = await request.arrayBuffer()

    if (resourceId) {
      const res = MOCK_RESOURCES.find((r) => r.id === resourceId)
      if (res) {
        // Automatically create initial chunks for the newly uploaded document
        // so Doubt AI and Flashcard generator have context immediately
        const exists = MOCK_CHUNKS.some((c) => c.resource_id === resourceId)
        if (!exists) {
          MOCK_CHUNKS.push({
            id: crypto.randomUUID(),
            resource_id: resourceId,
            chunk_index: 0,
            page_number: 1,
            content: `${res.title}. This academic document covers core concepts, theorems, equations, and practice questions for ${res.branch} Year ${res.year}. Key topics include foundational theory, step-by-step algorithms, implementations, and past examination problems.`,
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
