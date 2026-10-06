import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('feature status distinguishes active routes from planned placeholders', async ({ page }) => {
  await page.goto('/features')

  await expect(page.getByRole('heading', { name: 'Available now and what comes next' })).toBeVisible()
  const available = page.locator('section[aria-labelledby="available-features-heading"]')
  await expect(available.getByRole('link', { name: /Beer Style Explorer/ })).toHaveAttribute('href', '/styles')
  await expect(available.getByRole('link', { name: /Beer Passport/ })).toHaveAttribute('href', '/taste-map')
  await expect(available.getByRole('link', { name: /Historical Feed/ })).toHaveAttribute('href', '/history')

  for (const title of [
    'Quick Rate',
    'Advanced beer rankings',
    'Lists & Want to Try',
    'Personal Taste Profile',
    'Beer Passport geography',
    'Style reference & personal context',
    'Venues & Venue Scores',
    'Find This Beer, follows & updates',
    'Pourfolio Match & similar beers',
    'Guest browse',
    'Drinking Buddies & shared activity',
    'Achievements & expertise indicators',
    'Year in Pourfolio',
    'Account export & deletion',
    'Events',
    'Verified brewery & venue tools',
    'Brew Done It'
  ]) {
    const card = page.getByRole('article').filter({ hasText: title })
    await expect(card).toHaveCount(1)
    await expect(card.getByRole('link')).toHaveCount(0)
  }

  await expect(page.getByText('Certification required', { exact: true })).toBeVisible()
})
