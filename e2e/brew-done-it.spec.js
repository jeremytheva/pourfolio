import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => installMockApi(page))

test('game stays out of production navigation while the guarded route remains testable', async ({ page }) => {
  const gameRequests = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.startsWith('/api/nocodebackend/brew-done-it')) gameRequests.push(pathname)
  })

  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Brew Done It' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Explore navigation' }).getByRole('link', { name: 'Brew Done It' })).toHaveCount(0)

  await page.goto('/brew-done-it')
  await expect(page.getByRole('heading', { name: 'Brew Done It', level: 1 })).toBeVisible()
  await expect(page.getByText('Persistent two-player deduction game')).toBeVisible()

  await expect.poll(() => gameRequests.length).toBeGreaterThan(0)
  expect(gameRequests).toContain('/api/nocodebackend/brew-done-it/games')
  expect(gameRequests).toContain('/api/nocodebackend/brew-done-it/stats')
  expect(gameRequests).toContain('/api/nocodebackend/brew-done-it/options')
})

test('product page does not expose Brew Done It before certification', async ({ page }) => {
  await page.goto('/products/4')
  await expect(page.getByRole('heading', { name: 'Ace', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Play Brew-Done-It' })).toHaveCount(0)
})
