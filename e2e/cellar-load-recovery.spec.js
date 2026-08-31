import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('cellar load failure is focused and retry recovers the owner-scoped list', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    attempts += 1
    if (attempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cellar load unavailable.' })
      })
    }
    return route.fallback()
  })

  await page.goto('/cellar')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Cellar load unavailable.')
  await expect(alert).toBeFocused()

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(page.getByRole('list', { name: 'Cellar items' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ace' })).toBeVisible()
  await expect(alert).toHaveCount(0)
})
