import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { injectOfflineAssets } from '../scripts/pwa-assets.mjs'
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
    await expect(page.getByRole('button', { name: 'Submit rating' })).toBeDisabled()
    await page.getByRole('button', { name: 'Save draft on this device', exact: true }).click()
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

test('worker upgrade waits while old clients retain offline lazy routes', async ({ context }) => {
  let version = 1
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  const server = createServer((request, response) => {
    response.setHeader('cache-control', 'no-store')
    if (request.url === '/sw.js') {
      response.setHeader('content-type', 'application/javascript')
      response.end(injectOfflineAssets(source, [`/assets/lazy-v${version}.js`]))
    } else if (request.url === '/' || request.url === '/index.html') {
      response.setHeader('content-type', 'text/html')
      response.end(`<!doctype html><title>Upgrade fixture</title><script>window.runtimeVersion = ${version}</script>`)
    } else if (request.url === `/assets/lazy-v${version}.js`) {
      response.setHeader('content-type', 'application/javascript')
      response.end(`export default ${version}`)
    } else if (request.url === '/manifest.webmanifest') {
      response.setHeader('content-type', 'application/manifest+json')
      response.end('{}')
    } else if (request.url === '/favicon.svg') {
      response.setHeader('content-type', 'image/svg+xml')
      response.end('<svg xmlns="http://www.w3.org/2000/svg"/>')
    } else {
      response.statusCode = 404
      response.end('Not found')
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    const oldPage = await context.newPage()
    await oldPage.goto(origin)
    await oldPage.evaluate(() => navigator.serviceWorker.register('/sw.js'))
    await expect.poll(() => oldPage.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    const oldCacheNames = await oldPage.evaluate(() => caches.keys())
    version = 2
    await oldPage.evaluate(async () => (await navigator.serviceWorker.ready).update())
    await expect.poll(() => oldPage.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting))).toBe(true)
    assert.equal(await oldPage.evaluate(() => window.runtimeVersion), 1)
    const cacheNames = await oldPage.evaluate(() => caches.keys())
    assert.equal(cacheNames.includes(oldCacheNames[0]), true)
    await context.setOffline(true)
    const result = await oldPage.evaluate(() => import('/assets/lazy-v1.js').then(() => ({ loaded: true })).catch((error) => ({ loaded: false, message: error.message })))
    assert.equal(result.loaded, true)
    return { oldClientStillVersion: 1, oldCacheRemoved: true, oldLazyAsset: result }
  } finally {
    await context.setOffline(false)
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
