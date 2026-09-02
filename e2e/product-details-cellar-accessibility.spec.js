import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => {
  await installMockApi(page)
})

test('product cellar disclosure moves focus into the revealed form', async ({ page }) => {
  await page.goto('/products/4')

  const toggle = page.getByRole('button', { name: 'Add to cellar' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await toggle.click()

  const quantity = page.getByRole('spinbutton', { name: 'Quantity' })
  await expect(page.getByRole('button', { name: 'Close cellar form' })).toHaveAttribute('aria-expanded', 'true')
  await expect(quantity).toBeFocused()
})

test('product cellar disclosure exposes relationships, busy state and focused save errors', async ({ page }) => {
  let releaseSave
  const saveGate = new Promise((resolve) => { releaseSave = resolve })

  await page.route('**/api/nocodebackend/cellar', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await saveGate
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Cellar save unavailable.' })
    })
  })

  await page.goto('/products/4')

  const toggle = page.getByRole('button', { name: 'Add to cellar' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toHaveAttribute('aria-controls', 'cellar-add-section')
  await toggle.click()

  const openToggle = page.getByRole('button', { name: 'Close cellar form' })
  await expect(openToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#cellar-add-section')).toBeVisible()

  const form = page.locator('#cellar-add-section form')
  await page.getByRole('button', { name: 'Save cellar item' }).click()

  const savingButton = page.getByRole('button', { name: 'Saving…' })
  await expect(form).toHaveAttribute('aria-busy', 'true')
  await expect(savingButton).toHaveAttribute('aria-busy', 'true')
  await expect(savingButton).toBeDisabled()
  await expect(openToggle).toBeDisabled()
  await expect(page.locator('#cellar-add-section')).toBeVisible()

  releaseSave()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Cellar save unavailable.')
  await expect(alert).toBeFocused()
  await expect(form).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('button', { name: 'Close cellar form' })).toBeEnabled()
})

test('successful cellar save is announced atomically', async ({ page }) => {
  await page.goto('/products/4')
  await page.getByRole('button', { name: 'Add to cellar' }).click()
  await page.getByRole('button', { name: 'Save cellar item' }).click()

  const status = page.getByRole('status', { name: '' }).filter({ hasText: 'Cellar item saved.' })
  await expect(status).toHaveAttribute('aria-atomic', 'true')
  await expect(status).toContainText('Cellar item saved.')
})
