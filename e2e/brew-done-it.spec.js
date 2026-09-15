import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => installMockApi(page))

test('game is available from primary navigation and its protected route loads the Brew API', async ({ page }) => {
  const gameRequests = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.startsWith('/api/nocodebackend/brew-done-it')) gameRequests.push(pathname)
  })

  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()

  const brewNavigation = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Brew Done It' })
  await expect(brewNavigation).toBeVisible()
  await expect(brewNavigation).toHaveAttribute('href', '/brew-done-it')

  await brewNavigation.click()
  await expect(page).toHaveURL(/\/brew-done-it$/)
  await expect(page.getByRole('heading', { name: 'Brew Done It', level: 1 })).toBeVisible()
  await expect(page.getByText('Persistent two-player deduction game')).toBeVisible()

  await expect.poll(() => gameRequests.length).toBeGreaterThan(0)
  expect(gameRequests).toContain('/api/nocodebackend/brew-done-it/games')
  expect(gameRequests).toContain('/api/nocodebackend/brew-done-it/stats')
  expect(gameRequests).toContain('/api/nocodebackend/brew-done-it/options')
})
