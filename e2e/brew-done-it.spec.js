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

test('product page opens Brew Done It with the viewed beer preselected without leaking it into the URL', async ({ page }) => {
  await page.goto('/products/4')
  await expect(page.getByRole('heading', { name: 'Ace', level: 1 })).toBeVisible()

  const playLink = page.getByRole('link', { name: 'Play Brew-Done-It' })
  await expect(playLink).toBeVisible()
  await expect(playLink).toHaveAttribute('href', '/brew-done-it')
  await playLink.click()

  await expect(page).toHaveURL(/\/brew-done-it$/)
  await expect(page.getByRole('heading', { name: 'Brew Done It', level: 1 })).toBeVisible()
  await expect(page.getByText('The beer opened from its profile is preselected. Review or change it before creating the challenge.')).toBeVisible()

  const beerSelect = page.locator('#brew-done-it-create-beer-select')
  await expect(beerSelect).toHaveValue('4')
  await expect(beerSelect).toContainText('Ace — Rocky Ridge Brewing')

  expect(await page.evaluate(() => window.location.search)).toBe('')
  expect(await page.evaluate(() => window.history.state?.initialProductId)).toBe('4')
})
