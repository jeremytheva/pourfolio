import assert from 'node:assert/strict'
import { expect, test } from '@playwright/test'
import { installMockApi, submissionReceipt } from './mockApi.js'
import { completeRatingCards } from '../release-check/ratingJourney.js'

test.beforeEach(async ({ page }) => { await installMockApi(page) })

test('local save remains local across offline and online transitions', async ({ page, context }) => {
  let uploads = 0
  await page.route('**/api/nocodebackend/ratings/submit', (route) => { uploads += 1; return route.abort() })
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await context.setOffline(true)
  await expect(page.getByRole('button', { name: 'Submit rating', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Save draft on this device', exact: true }).click()
  await expect(page.getByText('Draft saved on this device only.')).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByRole('button', { name: 'Submit rating', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save draft again', exact: true }).click()
  expect(uploads).toBe(0)
})

test('custom bonus survives recovery with an unavailable rating-form API', async ({ page }) => {
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).last().click()
  for (const checkbox of await page.getByRole('checkbox').all()) {
    if (await checkbox.isChecked()) await checkbox.uncheck()
  }
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Recover this bonus')
  await page.getByRole('spinbutton', { name: 'Point value' }).fill('0.7')
  await page.getByRole('button', { name: 'Add attribute', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /Recover this bonus/ })).toBeChecked()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Save draft on this device', exact: true }).click()
  await expect(page.getByText('Draft saved on this device only.')).toBeVisible()
  await page.route('**/api/nocodebackend/rating-form?**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Unavailable"}' }))
  await page.reload()
  await expect(page.getByText(/1 attribute · 0\.70 points/)).toBeVisible()
})

test('empty HTTP success retains a recoverable draft and does not claim submission', async ({ page }) => {
  await page.route('**/api/nocodebackend/ratings/submit', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await page.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('could not be confirmed')
  await expect(page).toHaveURL(/\/products\/4\/rate$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Review your rating', exact: true })).toBeVisible()
})

const readLocal = (page, name = 'ratingDrafts') => page.evaluate((storeName) => new Promise((resolve, reject) => {
  const request = indexedDB.open('pourfolio-offline-ratings-v1')
  request.onerror = () => reject(request.error)
  request.onsuccess = () => {
    const db = request.result
    const tx = db.transaction(storeName, 'readonly')
    const get = tx.objectStore(storeName).get(JSON.stringify(['user-1', '4']))
    let result
    get.onsuccess = () => { result = get.result }
    tx.oncomplete = () => { db.close(); resolve(result ?? null) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  }
}), name)

test('submission acknowledgement preserves a newer draft saved in another tab', async ({ page, context }) => {
  let acknowledge
  let requestArrived
  const responseGate = new Promise((resolve) => { acknowledge = resolve })
  const arrived = new Promise((resolve) => { requestArrived = resolve })
  await page.route('**/api/nocodebackend/ratings/submit', async (route) => {
    requestArrived()
    await responseGate
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(submissionReceipt(route.request().postDataJSON())) })
  })
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await page.getByRole('button', { name: 'Save draft on this device', exact: true }).click()
  await expect(page.getByText('Draft saved on this device only.')).toBeVisible()
  const original = await readLocal(page)
  const other = await context.newPage()
  await installMockApi(other)
  await other.goto('/products/4/rate')
  await expect(other.getByRole('heading', { name: 'Review your rating', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await arrived
  await other.reload()
  await expect(other.getByRole('heading', { name: 'Review your rating', exact: true })).toBeVisible()
  await other.getByRole('button', { name: 'Edit', exact: true }).nth(1).click()
  await other.getByRole('button', { name: 'Appearance: 7 out of 7', exact: true }).click()
  await expect(other.getByRole('heading', { name: 'Aroma', level: 2, exact: true })).toBeVisible()
  for (let i = 0; i < 6; i += 1) await other.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(other.getByRole('heading', { name: 'Review your rating', exact: true })).toBeVisible()
  await other.getByRole('button', { name: 'Save draft on this device', exact: true }).click()
  await expect(other.getByText('Draft saved on this device only.')).toBeVisible()
  const newer = await readLocal(other)
  assert.equal(newer.submissionId, original.submissionId)
  assert.equal(newer.scores['2'], 7)
  acknowledge()
  await expect(page).toHaveURL(/\/products\/4$/)
  const after = await readLocal(other)
  assert.equal(after.scores['2'], 7)
  return { oldScore: original.scores['2'], newerSavedScore: newer.scores['2'], sameSubmissionId: true, newerDraftAfterOldAcknowledgement: after }
})
