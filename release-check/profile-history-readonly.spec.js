import { expect, test } from '@playwright/test'
import { requiredEnvironment, responseJson, signIn } from './support.js'

// Existing private ratings and account credentials must not enter artefacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test.describe.configure({ mode: 'serial', retries: 0 })

const owner = requiredEnvironment(['RELEASE_OWNER_EMAIL', 'RELEASE_OWNER_PASSWORD'])
const historyPath = '/api/nocodebackend/ratings/history?page=1&limit=20'
const prohibitRatingWrites = (page) => page.route('**/api/nocodebackend/ratings/**', (route) =>
  route.request().method() === 'GET' ? route.fallback() : route.abort('blockedbyclient'))
const verifiedBeerRating = (items) => items.find((item) =>
  /^[1-9]\d*$/.test(String(item.id)) &&
  String(item.product?.id) === String(item.product_id) && item.product?.product_name)

test('connected private history links, controlled retry and repeated reloads preserve the exact owner tasting', async ({ page }) => {
  test.setTimeout(120_000)
  await prohibitRatingWrites(page)
  await signIn(page, owner.RELEASE_OWNER_EMAIL, owner.RELEASE_OWNER_PASSWORD)
  const firstResponse = await page.request.get(historyPath)
  expect(firstResponse.status()).toBe(200)
  const first = await responseJson(firstResponse)
  expect(first.page).toBe(1)
  expect(first.pageSize).toBe(20)
  expect(first.items.length).toBeLessThanOrEqual(20)
  expect(first.summary.count === first.total).toBe(true)
  let source = first
  if (first.totalPages > 1) {
    const olderResponse = await page.request.get('/api/nocodebackend/ratings/history?page=2&limit=20')
    expect(olderResponse.status()).toBe(200)
    source = await responseJson(olderResponse)
  }
  const rating = verifiedBeerRating(source.items)
  test.skip(!rating, 'No completed owner tasting with a verified beer fixture is available; exact-entry evidence is pending.')

  // A bounded client-side failure tests recovery against the actual provider on retry.
  let failOnce = true
  await page.route('**/api/nocodebackend/ratings/history?**', (route) => {
    if (!failOnce) return route.fallback()
    failOnce = false
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Rating history temporarily unavailable.' }) })
  })
  await page.goto(`/products/${encodeURIComponent(rating.product_id)}`)
  const link = page.getByRole('region', { name: 'Your tasting history' }).locator(`a[href="/profile?rating=${rating.id}"]`)
  await expect(link).toBeVisible({ timeout: 20_000 })
  await link.click()
  const history = page.getByRole('region', { name: 'My ratings' })
  await expect(history.getByRole('alert')).toBeFocused()
  await history.getByRole('button', { name: 'Retry rating history' }).click()
  const selected = page.locator(`#rating-${rating.id}`)
  await expect(selected).toBeFocused({ timeout: 20_000 })
  await expect(page.getByRole('navigation', { name: 'Rating history pages' })).toContainText(`Page ${source.page} of ${source.totalPages}`)
  expect((await selected.textContent()).includes(`${rating.total_weighted} / 5`)).toBe(true)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.reload()
    await expect(selected).toBeFocused({ timeout: 20_000 })
    await expect(history.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('list', { name: 'Rating history' }).getByRole('listitem')).toHaveCount(source.items.length)
  }
})

test('connected other-account history cannot resolve an owner rating link', async ({ browser, page }) => {
  test.setTimeout(90_000)
  test.skip(!process.env.RELEASE_OTHER_EMAIL || !process.env.RELEASE_OTHER_PASSWORD,
    'A second supported release-account session is unavailable; cross-account provider evidence is pending.')
  const other = requiredEnvironment(['RELEASE_OTHER_EMAIL', 'RELEASE_OTHER_PASSWORD'])
  if (other.RELEASE_OTHER_EMAIL.toLowerCase() === owner.RELEASE_OWNER_EMAIL.toLowerCase()) {
    throw new Error('Two distinct release accounts are required for cross-account history certification.')
  }
  await signIn(page, owner.RELEASE_OWNER_EMAIL, owner.RELEASE_OWNER_PASSWORD)
  const ownerResponse = await page.request.get(historyPath)
  expect(ownerResponse.status()).toBe(200)
  const rating = (await responseJson(ownerResponse)).items[0]
  test.skip(!rating, 'The owner has no completed tasting fixture; cross-account rating-link evidence is pending.')

  const otherContext = await browser.newContext({ baseURL: process.env.RELEASE_BASE_URL })
  try {
    const otherPage = await otherContext.newPage()
    await prohibitRatingWrites(otherPage)
    await signIn(otherPage, other.RELEASE_OTHER_EMAIL, other.RELEASE_OTHER_PASSWORD)
    const selector = `${historyPath}&rating_id=${encodeURIComponent(rating.id)}`
    const denied = await otherPage.request.get(selector)
    expect(denied.status()).toBe(404)
    const error = await responseJson(denied)
    expect(error.code).toBe('rating_not_found')
    expect(error.error).toBe('That rating is not available in your history.')
    expect(Object.hasOwn(error, 'items')).toBe(false)
    await otherPage.goto(`/profile?rating=${encodeURIComponent(rating.id)}`)
    await expect(otherPage.getByRole('region', { name: 'My ratings' }).getByRole('alert')).toContainText(error.error)
    await expect(otherPage.getByRole('list', { name: 'Rating history' })).toHaveCount(0)
    await expect(otherPage.locator(`#rating-${rating.id}`)).toHaveCount(0)
  } finally {
    await otherContext.close()
  }
})
