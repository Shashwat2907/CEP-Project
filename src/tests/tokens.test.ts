import { describe, it, expect, vi } from 'vitest'
import { motionMicro, motionPanel, motionFeedback, reduceMotion } from '../lib/motion'
import fs from 'fs'
import path from 'path'

describe('Design Tokens — Motion (DESIGN.MD §10)', () => {
  it('defines motionMicro as 150ms easeOut', () => {
    expect(motionMicro.duration).toBe(0.15)
    expect(motionMicro.ease).toBe('easeOut')
  })

  it('defines motionPanel as 240ms easeInOut', () => {
    expect(motionPanel.duration).toBe(0.24)
    expect(motionPanel.ease).toBe('easeInOut')
  })

  it('defines motionFeedback as spring(stiffness 400, damping 30)', () => {
    expect(motionFeedback.type).toBe('spring')
    expect(motionFeedback.stiffness).toBe(400)
    expect(motionFeedback.damping).toBe(30)
  })

  it('returns original token when prefers-reduced-motion is false', () => {
    expect(reduceMotion(motionPanel)).toEqual(motionPanel)
  })

  it('returns 0.01s duration when prefers-reduced-motion is true', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      })),
    })

    expect(reduceMotion(motionPanel)).toEqual({ duration: 0.01 })
    vi.unstubAllGlobals()
  })
})

describe('Design Tokens — CSS custom properties (DESIGN.MD §3-§6)', () => {
  const tokensCssPath = path.resolve(__dirname, '../styles/tokens.css')
  const css = fs.readFileSync(tokensCssPath, 'utf-8')

  const requiredTokens = [
    '--bg',
    '--surface',
    '--surface-sunken',
    '--border',
    '--ink',
    '--ink-muted',
    '--highlight',
    '--on-ink',
    '--in-campus',
    '--out-campus',
    '--danger',
    '--warning',
    '--success',
    '--space-1',
    '--space-4',
    '--r-sm',
    '--r-md',
    '--r-lg',
    '--r-full',
    '--text-display',
    '--text-h1',
    '--text-body',
    '--text-small',
    '--motion-micro',
    '--motion-panel',
  ]

  for (const token of requiredTokens) {
    it(`declares required token ${token}`, () => {
      expect(css).toContain(token)
    })
  }

  it('declares .dark theme overrides', () => {
    expect(css).toContain('.dark {')
  })
})
