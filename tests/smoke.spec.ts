import { test, expect } from '@playwright/test'

/**
 * Smoke test: the landing / home page loads without errors.
 * This is the baseline Playwright test required by TEAM_TASKS.md §chore/project-setup.
 */
test('home page loads and has correct title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Campus/)
})
