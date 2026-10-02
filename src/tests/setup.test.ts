import { describe, it, expect } from 'vitest'

/**
 * Sample unit test — verifies the test setup works.
 * Replace with real business logic tests as features are built.
 * Required by TEAM_TASKS.md §chore/project-setup.
 */
describe('project setup', () => {
  it('vitest runs successfully', () => {
    expect(1 + 1).toBe(2)
  })

  it('timezone display works correctly', () => {
    // All times stored in UTC, displayed in Asia/Kolkata (UTC+5:30)
    const utcDate = new Date('2026-10-02T00:00:00Z')
    const kolkataStr = utcDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    // 00:00 UTC = 05:30 IST
    expect(kolkataStr).toContain('5:30')
  })
})
