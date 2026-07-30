import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

test.beforeEach(async ({ page }) => installMockApi(page))

test('invitation, selection, questions, guesses, retry, scoring and statistics complete deterministically', async ({ page }) => {
  await page.goto('/brew-done-it')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create invitation' }).click()
  await expect(page.getByRole('heading', { name: 'Invitation ready' })).toBeVisible()

  await page.getByLabel('Game number').fill('71')
  await page.getByLabel('Invitation code').fill('mock_invitation_code_12345678901234567890')
  await page.getByRole('button', { name: 'Join game' }).click()
  await page.getByLabel('Beer').selectOption('4')
  await page.getByRole('button', { name: 'Lock in secret beer' }).click()
  await expect(page.getByText('Waiting for your opponent')).toBeVisible()
  await expect(page.getByText('Ace')).toHaveCount(0)

  await page.getByRole('button', { name: 'Refresh round' }).click()
  await page.getByLabel('Question').selectOption('both_rated_product')
  await page.getByRole('button', { name: 'Ask question' }).click()
  await expect(page.getByText('Answer accepted: yes.')).toBeAttached()

  await page.getByLabel('Your style guess').selectOption('10')
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await expect(page.getByRole('alert')).toContainText('round changed')
  await page.getByRole('button', { name: 'Retry action' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.getByLabel('Guess type').selectOption('producer')
  await page.getByLabel('Your brewery guess').selectOption('20')
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.getByLabel('Guess type').selectOption('product')
  await page.getByLabel('Your beer guess').selectOption('4')
  await page.getByRole('button', { name: 'Submit guess' }).click()

  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible()
  await expect(page.getByText('Secret beer: Ace by Rocky Ridge Brewing')).toBeVisible()
  await expect(page.getByText('12 points')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your statistics' })).toContainText('12')
})
