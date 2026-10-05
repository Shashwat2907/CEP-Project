import { test, expect } from 'vitest'
import { generateFallbackCards } from '@/features/acad/lib/flashcard-gen'
import type { ResourceChunk } from '@/features/acad/schema'

test('generateFallbackCards produces clean questions without meta template', () => {
  const chunks: ResourceChunk[] = [
    {
      id: 'chunk-1',
      resource_id: 'res-1',
      chunk_index: 0,
      page_number: 1,
      content: `Water Technology and Chemical Analysis of Water.
Water is hard mainly due to presence of soluble bicarbonates, carbonates, chlorides, sulphates, nitrates mainly of Ca and Mg.
Hard water does not form sufficient amount of foam or lather with soap. Instead of forming foam it consumes soap and forms white to yellow ppt.
Reaction of hard water with soap: 2 C17H35COONa + Ca(HCO3)2 -> (C17H35COO)2Ca (ppt) + 2 NaHCO3.
Total Hardness is defined as the sum of Temporary Hardness and Permanent Hardness.
Temporary Hardness refers to hardness due to carbonate and bicarbonate of calcium and magnesium.
Permanent Hardness refers to hardness due to chlorides and sulphates of calcium and magnesium.`,
      token_count: 100
    }
  ]

  const cards = generateFallbackCards('Module 4 CST.pdf', chunks)
  expect(cards.length).toBeGreaterThan(0)
  for (const card of cards) {
    console.log('Q:', card.front)
    console.log('A:', card.back)
    // Must NOT contain the repetitive pattern
    expect(card.front).not.toContain('how is it used in')
    expect(card.front).not.toContain('Module 4 CST.pdf')
    expect(card.front).not.toContain('Key concept from')
    // Must not contain gibberish
    expect(card.front).not.toMatch(/[A-Z0-9]{4,}\s+[A-Z0-9]{4,}/)
  }
})
