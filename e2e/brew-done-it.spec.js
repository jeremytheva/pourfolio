import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => installMockApi(page))

test('game is absent from navigation and its direct route is contained without API access', async ({ page }) => {
  const gameRequests = []
  page.on('request', (request) => {
    if (request.url().includes('/api/nocodebackend/brew-done-it/')) gameRequests.push(request.url())
  })

  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Brew Done It')).toHaveCount(0)
  const brewDoneItDestinations = await page.locator('a').evaluateAll((links) => links
    .map((link) => new URL(link.href, document.baseURI).pathname)
    .filter((pathname) => pathname === '/brew-done-it'))
  expect(brewDoneItDestinations).toEqual([])

  await page.goto('/brew-done-it')
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()
  await expect(page.getByRole('button', { name: /invitation|game|join/i })).toHaveCount(0)
  expect(gameRequests).toEqual([])
})
