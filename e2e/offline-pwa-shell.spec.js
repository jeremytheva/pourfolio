import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'
import { completeRatingCards } from '../release-check/ratingJourney.js'

test('PWA preloads built scripts and opens a public route after an actual offline reload', async ({ page, context }) => {
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: 'Privacy policy', exact: true })).toBeVisible()

  await expect.poll(async () => page.evaluate(async () => {
    await navigator.serviceWorker.ready
    return Boolean(navigator.serviceWorker.controller)
  })).toBe(true)

  const cached = await page.evaluate(async () => {
    const cacheName = (await caches.keys()).find((key) => /^pourfolio-static-shell-[a-f0-9]{16}$/.test(key))
    if (!cacheName) return []
    const requests = await (await caches.open(cacheName)).keys()
    return requests.map((request) => new URL(request.url).pathname)
  })
  expect(cached).toContain('/index.html')
  expect(cached.some((url) => url.startsWith('/assets/') && url.endsWith('.js'))).toBe(true)
  expect(cached.some((url) => url.startsWith('/assets/') && url.endsWith('.css'))).toBe(true)
  expect(cached.some((url) => url.startsWith('/api/'))).toBe(false)

  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Privacy policy', exact: true })).toBeVisible()
    await expect(page.locator('#document-content')).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})

test('offline cache never contains sensitive API paths or arbitrary product paths', async ({ page }) => {
  await page.goto('/privacy')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await page.evaluate(async () => {
    try {
      await fetch('/api/nocodebackend/auth/get-session')
    } catch {
      // Preview has no live provider. Only interception/caching is under test.
    }
  })
  const cached = await page.evaluate(async () => {
    const names = await caches.keys()
    const keys = await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)))
    return keys.flat()
  })
  expect(cached.filter((url) => url.startsWith('/api/') || url.startsWith('/products/'))).toEqual([])
})

test('a complete rating saves locally during an actual network outage without uploading', async ({ page, context }) => {
  await installMockApi(page)
  let uploads = 0
  await page.route('**/api/nocodebackend/ratings/submit', async (route) => {
    uploads += 1
    return route.abort()
  })
  await page.goto('/products/4/rate')
  await completeRatingCards(page)
  await context.setOffline(true)
  try {
    await page.getByRole('button', { name: 'Submit rating' }).click()
    await expect(page.getByText('Draft saved on this device only.')).toBeVisible()
    const draft = await page.evaluate(() => new Promise((resolve, reject) => {
      const open = indexedDB.open('pourfolio-offline-ratings-v1')
      open.onerror = () => reject(new Error('Storage unavailable'))
      open.onsuccess = () => {
        const db = open.result
        const transaction = db.transaction('ratingDrafts', 'readonly')
        const get = transaction.objectStore('ratingDrafts').get(JSON.stringify(['user-1', '4']))
        get.onsuccess = () => resolve(get.result)
        get.onerror = () => reject(new Error('Draft unavailable'))
        transaction.oncomplete = () => db.close()
      }
    }))
    expect(Number.isSafeInteger(draft?.submissionId)).toBe(true)
    expect(Object.keys(draft?.scores || {}).length).toBeGreaterThanOrEqual(5)
    expect(uploads).toBe(0)
  } finally {
    await context.setOffline(false)
  }
})
