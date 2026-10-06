import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => installMockApi(page))

test('primary navigation exposes planned features while Brew Done It remains contained', async ({ page }) => {
  const gameRequests = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.startsWith('/api/nocodebackend/brew-done-it')) gameRequests.push(pathname)
  })

  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Discover beer worth remembering' })).toBeVisible()

  const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' })
  await expect(primaryNavigation.getByRole('link', { name: 'Brew Done It' })).toHaveCount(0)

  const plannedNavigation = primaryNavigation.getByRole('link', { name: "What's next" })
  await expect(plannedNavigation).toBeVisible()
  await expect(plannedNavigation).toHaveAttribute('href', '/features')
  await plannedNavigation.click()

  await expect(page).toHaveURL(/\/features$/)
  await expect(page.getByRole('heading', { name: 'What is live and what is planned', level: 1 })).toBeVisible()
  await expect(page.getByText('Approved planned capabilities')).toBeVisible()
  expect(gameRequests).toEqual([])

  await page.goto('/brew-done-it')
  await expect(page.getByRole('heading', { name: 'Brew Done It is not active yet', level: 1 })).toBeVisible()
  await expect(page.getByText('No challenge action is available from this placeholder.')).toBeVisible()
  expect(gameRequests).toEqual([])
})

test('product page presents Brew Done It as planned and opens only the status placeholder', async ({ page }) => {
  const gameRequests = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.startsWith('/api/nocodebackend/brew-done-it')) gameRequests.push(pathname)
  })

  await page.goto('/products/4')
  await expect(page.getByRole('heading', { name: 'Ace', level: 1 })).toBeVisible()

  const plannedLink = page.getByRole('link', { name: 'Brew Done It · Planned' })
  await expect(plannedLink).toBeVisible()
  await expect(plannedLink).toHaveAttribute('href', '/brew-done-it')
  await plannedLink.click()

  await expect(page).toHaveURL(/\/brew-done-it$/)
  await expect(page.getByRole('heading', { name: 'Brew Done It is not active yet', level: 1 })).toBeVisible()
  await expect(page.getByText('No challenge action is available from this placeholder.')).toBeVisible()

  expect(gameRequests).toEqual([])
  expect(await page.evaluate(() => window.location.search)).toBe('')
  expect(await page.evaluate(() => window.history.state?.initialProductId)).toBeUndefined()
})
