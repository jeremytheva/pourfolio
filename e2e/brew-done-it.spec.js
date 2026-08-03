import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => installMockApi(page))

test('game is absent from navigation and its direct route is contained without API access', async ({ page }) => {
  const gameRequests = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/nocodebackend/brew-done-it')) {
      gameRequests.push(request.url())
    }
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
  await expect(page.getByRole('button', { name: /create|start|invite|join|select|guess|question|forfeit|rematch/i })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: /game|invite|guess|question/i })).toHaveCount(0)
  expect(gameRequests).toEqual([])
})
