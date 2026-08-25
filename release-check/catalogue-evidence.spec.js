import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { buildCatalogueCertificationEvidence, digestSearchQuery } from './catalogueEvidence.js'
import { requiredEnvironment, responseJson, signIn, signOut } from './support.js'

const credentials = requiredEnvironment(['RELEASE_OWNER_EMAIL', 'RELEASE_OWNER_PASSWORD', 'RELEASE_SHA'])
const PAGE_LIMIT = 50
const MAX_PAGES = 100

const pageObservation = (payload) => {
  const items = Array.isArray(payload?.items) ? payload.items : null
  if (!items) throw new Error('Connected catalogue evidence requires an items array.')
  return {
    page: payload.page,
    totalPages: payload.totalPages,
    totalItems: payload.totalItems,
    itemIds: items.map(({ id }) => String(id))
  }
}

test('retain redacted exact-SHA catalogue browse, search and direct-detail evidence', async ({ page }) => {
  await signIn(page, credentials.RELEASE_OWNER_EMAIL, credentials.RELEASE_OWNER_PASSWORD)

  const browsePages = []
  let expectedPages = 1
  for (let current = 1; current <= expectedPages; current += 1) {
    if (current > MAX_PAGES) throw new Error('Connected catalogue evidence exceeded the bounded page count.')
    const response = await page.request.get(`/api/nocodebackend/catalog/products?page=${current}&limit=${PAGE_LIMIT}`)
    expect(response.ok()).toBeTruthy()
    const payload = await responseJson(response)
    const observation = pageObservation(payload)
    browsePages.push(observation)
    expectedPages = observation.totalPages
  }

  const firstProductId = browsePages.flatMap(({ itemIds }) => itemIds)[0]
  expect(firstProductId).toMatch(/^[1-9]\d*$/)
  await page.goto(`/products/${firstProductId}`)
  await expect(page.getByRole('link', { name: 'Rate this beer' })).toBeVisible()

  const searchTerm = process.env.RELEASE_SEARCH_TERM || 'beer'
  const searchResponse = await page.request.get(`/api/nocodebackend/catalog/products?page=1&limit=${PAGE_LIMIT}&search=${encodeURIComponent(searchTerm)}`)
  expect(searchResponse.ok()).toBeTruthy()
  const searchPayload = await responseJson(searchResponse)
  const searchPage = pageObservation(searchPayload)

  const evidence = buildCatalogueCertificationEvidence({
    releaseSha: credentials.RELEASE_SHA,
    observedAt: new Date().toISOString(),
    browsePages,
    search: { querySha256: digestSearchQuery(searchTerm), ...searchPage },
    detail: { productId: firstProductId }
  })

  const output = path.resolve('test-results/release-check/catalogue-evidence.json')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')

  const retained = fs.readFileSync(output, 'utf8').toLowerCase()
  for (const forbidden of ['product_name', 'producer_name', 'category_name', 'user_id', 'email', 'password', 'cookie', 'authorization', 'rating_scores', 'cellar']) {
    expect(retained).not.toContain(forbidden)
  }
  expect(retained).not.toContain(searchTerm.toLowerCase())

  await signOut(page)
})
