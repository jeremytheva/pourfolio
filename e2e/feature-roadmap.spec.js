import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('feature status distinguishes active routes from planned placeholders', async ({ page }) => {
  await page.goto('/features')

  await expect(page.getByRole('heading', { name: 'Available now and what comes next' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Beer Style Explorer/ })).toHaveAttribute('href', '/styles')
  await expect(page.getByRole('link', { name: /Beer Passport/ })).toHaveAttribute('href', '/taste-map')
  await expect(page.getByRole('link', { name: /Historical Feed/ })).toHaveAttribute('href', '/history')

  for (const title of [
    'Quick Rate',
    'Advanced beer rankings',
    'Lists & Want to Try',
    'Personal Taste Profile',
    'Venues & Venue Scores',
    'Find This Beer, follows & updates',
    'Activity, achievements & expertise',
    'Verified brewery & venue tools',
    'Brew Done It'
  ]) {
    const card = page.getByRole('article').filter({ hasText: title })
    await expect(card).toHaveAttribute('aria-disabled', 'true')
    await expect(card.getByRole('link')).toHaveCount(0)
  }

  await expect(page.getByText('Certification required', { exact: true })).toBeVisible()
})
