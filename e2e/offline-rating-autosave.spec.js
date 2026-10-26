import { expect, test } from '@playwright/test'
import { installMockApi, submissionReceipt } from './mockApi.js'
import { completeRatingCards } from '../release-check/ratingJourney.js'

const savedMessage = 'Draft saved on this device only.'
const readDraft = (page) => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('pourfolio-offline-ratings-v1')
  open.onerror = () => reject(open.error)
  open.onsuccess = () => {
    const db = open.result
    const tx = db.transaction('ratingDrafts', 'readonly')
    const request = tx.objectStore('ratingDrafts').get(JSON.stringify(['user-1', '4']))
    let result
    request.onsuccess = () => { result = request.result || null }
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  }
}))

const reachAppearance = async (page) => {
  await page.goto('/products/4/rate')
  await expect(page.getByRole('heading', { name: 'Design', exact: true, level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Skip this attribute', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Appearance', exact: true, level: 2 })).toBeVisible()
}

test.beforeEach(async ({ page }) => { await installMockApi(page) })

test('an incomplete rating autosaves offline and resumes the previous answers and next card', async ({ page, context }) => {
  let uploads = 0
  await page.route('**/api/nocodebackend/ratings/submit', (route) => { uploads += 1; return route.abort() })
  await reachAppearance(page)
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Appearance: 4 out of 7', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Aroma', exact: true, level: 2 })).toBeVisible()
  await expect(page.getByText(savedMessage)).toBeVisible()
  const original = await readDraft(page)
  expect(original.scores).toEqual({ 2: 4 })
  expect(original.step).toBe(2)
  expect(original.submissionId).toBeGreaterThan(0)
  await context.setOffline(false)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Aroma', exact: true, level: 2 })).toBeVisible()
  expect((await readDraft(page)).submissionId).toBe(original.submissionId)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Appearance: 4 out of 7', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(uploads).toBe(0)
})

test('rapid edits flush on navigation without losing the newest value or submission identity', async ({ page }) => {
  await reachAppearance(page)
  const score = page.getByRole('slider', { name: 'Appearance score', exact: true })
  await score.press('End')
  await score.press('Home')
  await score.press('End')
  await page.getByRole('link', { name: 'Back to product', exact: true }).click()
  await expect(page).toHaveURL(/\/products\/4$/)
  await expect.poll(async () => (await readDraft(page))?.scores?.['2']).toBe(7)
  const saved = await readDraft(page)
  await page.getByRole('link', { name: 'Rate this beer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Appearance', exact: true, level: 2 })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Appearance score', exact: true })).toHaveValue('7')
  expect((await readDraft(page)).submissionId).toBe(saved.submissionId)
})

test('hiding the page flushes pending local changes', async ({ page }) => {
  await reachAppearance(page)
  await page.getByRole('slider', { name: 'Appearance score', exact: true }).press('End')
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  await expect.poll(async () => (await readDraft(page))?.scores?.['2']).toBe(7)
  await expect(page.getByText(savedMessage)).toBeVisible()
})

test('switching beers flushes the old editor without carrying answers into the new one', async ({ page }) => {
  await reachAppearance(page)
  await page.getByRole('slider', { name: 'Appearance score', exact: true }).press('End')
  await expect(page.getByText(savedMessage)).toBeVisible()
  const oldDraft = await readDraft(page)
  await page.route('**/api/nocodebackend/rating-form?product_id=5', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({
      ...oldDraft.form, product: { ...oldDraft.form.product, id: 5, product_name: 'Other beer' }
    })
  }))
  await page.getByRole('slider', { name: 'Appearance score', exact: true }).press('Home')
  await page.evaluate(() => {
    window.history.pushState(null, '', '/products/5/rate')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('heading', { name: /Other beer/, level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Design', exact: true, level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Design: 7 out of 7', exact: true }).click()
  await expect(page.getByText(savedMessage)).toBeVisible()
  const newDraft = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('pourfolio-offline-ratings-v1')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('ratingDrafts', 'readonly')
      const get = tx.objectStore('ratingDrafts').get(JSON.stringify(['user-1', '5']))
      let result
      get.onsuccess = () => { result = get.result }
      tx.oncomplete = () => { db.close(); resolve(result) }
    }
  }))
  expect(newDraft.scores).toEqual({ 8: 7 })
  expect(newDraft.submissionId).not.toBe(oldDraft.submissionId)
  expect((await readDraft(page)).scores['2']).toBe(1)
})

test('autosave failure is visible and a partial draft can be retried without completing the form', async ({ page }) => {
  await reachAppearance(page)
  await expect(page.getByText(savedMessage)).toBeVisible()
  await page.evaluate(() => {
    window.originalIndexedDB = window.indexedDB
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined })
  })
  await page.getByRole('slider', { name: 'Appearance score', exact: true }).press('End')
  await expect(page.getByRole('alert')).toContainText('Automatic saving failed')
  await expect(page.getByText(savedMessage)).toHaveCount(0)
  await page.evaluate(() => { Object.defineProperty(window, 'indexedDB', { configurable: true, value: window.originalIndexedDB }) })
  await page.getByRole('button', { name: /^Save draft (on this device|again)$/ }).click()
  await expect(page.getByText(savedMessage)).toBeVisible()
  expect((await readDraft(page)).scores['2']).toBe(7)
})

test('another tab cannot automatically overwrite a newer draft and can explicitly reload it', async ({ page, context }) => {
  await reachAppearance(page)
  await page.getByRole('slider', { name: 'Appearance score', exact: true }).press('End')
  await expect(page.getByText(savedMessage)).toBeVisible()
  const other = await context.newPage()
  await installMockApi(other)
  await other.goto('/products/4/rate')
  await other.getByRole('slider', { name: 'Appearance score', exact: true }).press('Home')
  await expect(other.getByText(savedMessage)).toBeVisible()
  await page.getByRole('slider', { name: 'Appearance score', exact: true }).press('Home')
  await page.getByRole('slider', { name: 'Appearance score', exact: true }).press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Load saved draft', exact: true })).toBeVisible()
  expect((await readDraft(page)).scores['2']).toBe(1)
  await page.getByRole('button', { name: 'Load saved draft', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Appearance score', exact: true })).toHaveValue('1')
})

test('confirmed submission clears its autosaved revision and no delayed timer revives it', async ({ page }) => {
  let uploads = 0
  await page.route('**/api/nocodebackend/ratings/submit', (route) => {
    uploads += 1
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(submissionReceipt(route.request().postDataJSON())) })
  })
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await page.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await expect(page).toHaveURL(/\/products\/4$/)
  expect(await readDraft(page)).toBeNull()
  await page.getByRole('link', { name: 'Rate this beer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Design', exact: true, level: 2 })).toBeVisible()
  expect(await readDraft(page)).toBeNull()
  expect(uploads).toBe(1)
})
