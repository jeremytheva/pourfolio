import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { requiredEnvironment, responseJson, signIn, signOut } from './support.js'

const ownerCredentials = requiredEnvironment([
  'RELEASE_OWNER_EMAIL',
  'RELEASE_OWNER_PASSWORD'
])

const DESTRUCTIVE_CONFIRMATION = 'RUN CLEANUP-GUARDED RELEASE WRITES'
const destructiveEnabled = process.env.RELEASE_DESTRUCTIVE_CONFIRMATION === DESTRUCTIVE_CONFIRMATION
const REDIRECT_STATUSES = [302, 303, 307, 308]
const SAFE_REJECTION_STATUSES = [400, 403, 404]
let authenticatedStorageState = null

const isCatalogueResponse = (response, { page, query = null }) => {
  if (!response.ok()) return false
  const url = new URL(response.url())
  if (url.pathname !== '/api/nocodebackend/catalog/products') return false
  if (url.searchParams.get('page') !== String(page) || url.searchParams.get('limit') !== '24') return false
  return query === null ? !url.searchParams.has('q') : url.searchParams.get('q') === query
}

const completeRatingCards = async (page) => {
  let completedAttributes = 0
  while (await page.getByRole('slider').count()) {
    const currentHeading = page.getByRole('heading', { level: 2 }).first()
    const headingText = await currentHeading.textContent()
    expect(headingText).toBeTruthy()

    const scoreOne = page.locator('button[aria-label$=": 1 out of 7"]').first()
    await expect(scoreOne).toBeVisible()
    await scoreOne.click()
    await expect(currentHeading).not.toHaveText(headingText)

    completedAttributes += 1
    expect(completedAttributes).toBeLessThanOrEqual(20)
  }

  expect(completedAttributes).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: 'Bonus attributes' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { name: 'Review your rating' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit rating' })).toBeEnabled()
}

test.describe.configure({ mode: 'serial', retries: 0 })

test('host health, headers, SPA fallback and rejected redirects', async ({ page, request }) => {
  const health = await request.get('/api/health')
  expect(health.status()).toBe(200)
  expect(await health.json()).toMatchObject({
    status: 'ok',
    service: 'pourfolio',
    checks: { authenticationConfigured: true, dataConfigured: true }
  })

  const document = await request.get('/products/1')
  expect(document.status()).toBe(200)
  const headers = document.headers()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['strict-transport-security']).toContain('max-age=63072000')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toContain('camera=()')

  await page.goto('/route-that-must-not-exist')
  await expect(page).toHaveURL(/\/login$/)

  const rejected = await request.get('/api/nocodebackend/auth/sign-in/google?redirectTo=https://attacker.invalid/callback', { maxRedirects: 0 })
  const rejectedStatus = rejected.status()
  const location = rejected.headers().location
  if (REDIRECT_STATUSES.includes(rejectedStatus)) {
    expect(location).toBeTruthy()
    expect(new URL(location).hostname).not.toBe('attacker.invalid')
  } else {
    expect(SAFE_REJECTION_STATUSES).toContain(rejectedStatus)
    expect(location).toBeFalsy()
  }
})

test('public policy and support documents are reachable without authentication', async ({ page }) => {
  for (const path of ['/privacy', '/terms', '/moderation', '/support', '/retention']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact)), `axe violations on ${path}`).toEqual([])
  }
})

test('provider discovery, sign-up, password sign-in, OTP, Google and logout', async ({ page, request }) => {
  const providersResponse = await request.get('/api/nocodebackend/auth/providers')
  expect(providersResponse.ok()).toBeTruthy()
  const providerPayload = await responseJson(providersResponse)
  const providers = providerPayload?.providers
  expect(providers).toBeTruthy()
  expect(providers.email).toBe(true)

  if (process.env.RELEASE_SIGNUP_EMAIL) {
    const signup = requiredEnvironment(['RELEASE_SIGNUP_EMAIL', 'RELEASE_SIGNUP_PASSWORD'])
    await page.goto('/login')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.getByLabel('Name').fill('Release Candidate')
    await page.getByLabel('Email').fill(signup.RELEASE_SIGNUP_EMAIL)
    await page.getByLabel('Password').fill(signup.RELEASE_SIGNUP_PASSWORD)
    await page.getByLabel('Confirm password').fill(signup.RELEASE_SIGNUP_PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText(/Account created|Discover beer/)).toBeVisible()
    if (/\/home$/.test(page.url())) await signOut(page)
  }

  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)
  await signOut(page)

  if (providers.emailOTP === true) {
    const otp = requiredEnvironment(['RELEASE_OTP_EMAIL', 'RELEASE_OTP_CODE'])
    await page.getByRole('button', { name: 'Email code' }).click()
    await page.getByLabel('Email').fill(otp.RELEASE_OTP_EMAIL)
    await page.getByRole('button', { name: 'Send one-time passcode' }).click()
    await expect(page.getByRole('status')).toContainText('Check your email')
    await page.getByLabel('One-time passcode').fill(otp.RELEASE_OTP_CODE)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/home$/)
    await signOut(page)
  }

  if (providers.google === true) {
    const google = await request.get('/api/nocodebackend/auth/sign-in/google', { maxRedirects: 0 })
    expect(REDIRECT_STATUSES).toContain(google.status())
    expect(google.headers().location).toMatch(/^https:\/\//)
  }
})

test('catalogue, pagination, direct details, rating form boundary and session-backed profile read', async ({ page }) => {
  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)
  await page.goto('/search')

  const searchInput = page.getByLabel('Search products, producers or styles')
  const searchStatus = page.locator('#product-search-status')
  await expect(searchInput).toBeFocused()
  await expect(searchStatus).toHaveText(/^\d+ products? found$/)

  const nextPage = page.getByRole('button', { name: 'Next product page, page 2' })
  await expect(nextPage).toBeVisible()
  const pageTwoResponse = page.waitForResponse((response) => isCatalogueResponse(response, { page: 2 }))
  await nextPage.click()
  await pageTwoResponse
  await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible()

  const searchTerm = process.env.RELEASE_SEARCH_TERM || 'beer'
  const searchResponsePromise = page.waitForResponse((response) => isCatalogueResponse(response, { page: 1, query: searchTerm }))
  await searchInput.fill(searchTerm)
  const searchResponse = await searchResponsePromise
  const searchPayload = await responseJson(searchResponse)
  expect(searchPayload.items?.length).toBeGreaterThan(0)
  await expect(searchStatus).toHaveText(new RegExp(`^${searchPayload.total} products? found$`))

  const productLink = page.locator('[aria-label="Products"] a[href^="/products/"]').first()
  await expect(productLink).toBeVisible()
  const productPath = await productLink.getAttribute('href')
  expect(productPath).toMatch(/^\/products\/\d+$/)
  await page.goto(productPath)
  await expect(page.getByRole('link', { name: 'Rate this beer' })).toBeVisible()
  await page.goto(`${productPath}/rate`)

  const ratingSubmitRequests = []
  page.on('request', (request) => {
    const requestUrl = new URL(request.url())
    if (request.method() === 'POST' && requestUrl.pathname === '/api/nocodebackend/ratings/submit') {
      ratingSubmitRequests.push(request.url())
    }
  })

  const firstScore = page.getByRole('slider').first()
  await expect(firstScore).toBeVisible()
  await expect(firstScore).toHaveAttribute('min', '1')
  await expect(firstScore).toHaveAttribute('max', '7')
  await expect(firstScore).toHaveAttribute('step', '1')
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Submit rating' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Next' }).click({ force: true })
  await expect(page).toHaveURL(new RegExp(`${productPath}/rate$`))
  await expect(page.getByRole('slider').first()).toBeVisible()
  expect(ratingSubmitRequests).toEqual([])

  const profileResponse = await page.request.get('/api/nocodebackend/profile')
  expect(profileResponse.status()).toBe(200)
  const profile = await responseJson(profileResponse)
  expect(profile.profile?.id).toBeTruthy()

  const profileUpdate = await page.request.put('/api/nocodebackend/profile', { data: { name: 'Release check must not persist' } })
  expect(profileUpdate.status()).toBe(503)
  expect(await responseJson(profileUpdate)).toMatchObject({ code: 'profile_persistence_unavailable' })

  authenticatedStorageState = await page.context().storageState()
})

test('Breweries & Venues is keyboard operable and preserves the verified-data boundary', async ({ page }) => {
  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)
  await page.goto('/places')

  const breweries = page.getByRole('tab', { name: 'Breweries' })
  const venues = page.getByRole('tab', { name: 'Venues' })
  await expect(breweries).toHaveAttribute('aria-selected', 'true')
  await breweries.focus()
  await page.keyboard.press('ArrowRight')
  await expect(venues).toBeFocused()
  await expect(venues).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel', { name: 'Venues' })).toBeVisible()
  await expect(page.getByText('Venue discovery is awaiting verified data.')).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(breweries).toBeFocused()
  await expect(breweries).toHaveAttribute('aria-selected', 'true')
})

test('rating create/history/delete uses exact cleanup identity', async ({ page }) => {
  test.skip(!destructiveEnabled, `Requires RELEASE_DESTRUCTIVE_CONFIRMATION=${DESTRUCTIVE_CONFIRMATION}`)

  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)
  const catalogue = await responseJson(await page.request.get('/api/nocodebackend/catalog/products?page=1&limit=1'))
  const product = catalogue.items[0]
  expect(product?.id).toBeTruthy()

  const before = await responseJson(await page.request.get('/api/nocodebackend/ratings/mine'))
  const beforeIds = new Set((before.items || []).map(({ id }) => String(id)))
  let createdRatingId = null

  try {
    await page.goto(`/products/${product.id}/rate`)
    await completeRatingCards(page)
    await page.getByRole('button', { name: 'Submit rating' }).click()
    await expect(page).toHaveURL(new RegExp(`/products/${product.id}$`))

    const after = await responseJson(await page.request.get('/api/nocodebackend/ratings/mine'))
    const created = (after.items || []).filter(({ id }) => !beforeIds.has(String(id)))
    expect(created).toHaveLength(1)
    createdRatingId = created[0].id
    expect(created[0].product_id).toBe(product.id)
  } finally {
    if (createdRatingId) {
      const cleanup = await page.request.delete(`/api/nocodebackend/ratings/${encodeURIComponent(createdRatingId)}`)
      expect(cleanup.ok(), 'release rating cleanup must succeed').toBeTruthy()
    }
  }
})

test('cellar CRUD and cross-account ownership boundaries use guaranteed cleanup', async ({ browser, page }) => {
  test.skip(!destructiveEnabled, `Requires RELEASE_DESTRUCTIVE_CONFIRMATION=${DESTRUCTIVE_CONFIRMATION}`)
  const otherCredentials = requiredEnvironment(['RELEASE_OTHER_EMAIL', 'RELEASE_OTHER_PASSWORD'])

  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)
  const catalogue = await page.request.get('/api/nocodebackend/catalog/products?page=1&limit=1')
  const product = (await responseJson(catalogue)).items[0]
  expect(product?.id).toBeTruthy()

  let cellarItemId = null
  try {
    const created = await page.request.post('/api/nocodebackend/cellar', { data: {
      product_id: product.id, quantity: 1, container: 'release-check', notes: 'redacted automated evidence'
    } })
    expect(created.status()).toBe(201)
    const cellarItem = (await responseJson(created)).item
    cellarItemId = cellarItem.id

    const updated = await page.request.put(`/api/nocodebackend/cellar/${cellarItemId}`, { data: { quantity: 2, notes: 'release-check updated' } })
    expect(updated.ok()).toBeTruthy()

    const ownerCellar = await responseJson(await page.request.get('/api/nocodebackend/cellar'))
    expect(ownerCellar.items.map(({ id }) => String(id))).toContain(String(cellarItemId))

    const otherContext = await browser.newContext()
    try {
      const otherPage = await otherContext.newPage()
      await signIn(otherPage, otherCredentials.RELEASE_OTHER_EMAIL, otherCredentials.RELEASE_OTHER_PASSWORD)
      expect([403, 404]).toContain((await otherPage.request.get(`/api/nocodebackend/cellar/${cellarItemId}`)).status())
      expect((await otherPage.request.put(`/api/nocodebackend/cellar/${cellarItemId}`, { data: { quantity: 99 } })).status()).toBe(403)
      expect((await otherPage.request.delete(`/api/nocodebackend/cellar/${cellarItemId}`)).status()).toBe(403)
      const otherCellar = await responseJson(await otherPage.request.get('/api/nocodebackend/cellar'))
      expect(otherCellar.items.map(({ id }) => String(id))).not.toContain(String(cellarItemId))
    } finally {
      await otherContext.close()
    }
  } finally {
    if (cellarItemId) {
      const cleanup = await page.request.delete(`/api/nocodebackend/cellar/${encodeURIComponent(cellarItemId)}`)
      expect(cleanup.ok(), 'release cellar cleanup must succeed').toBeTruthy()
    }
  }
})

test('expired session returns every protected direct route to sign-in', async ({ page }) => {
  await signIn(page, ownerCredentials.RELEASE_OWNER_EMAIL, ownerCredentials.RELEASE_OWNER_PASSWORD)
  await page.context().clearCookies()
  for (const path of ['/home', '/search', '/places', '/cellar', '/profile']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
  }
})

test('axe has no serious or critical violations on every reachable launch page', async ({ browser }) => {
  expect(authenticatedStorageState).toBeTruthy()
  const context = await browser.newContext({ storageState: authenticatedStorageState })
  const page = await context.newPage()

  try {
    const catalogue = await responseJson(await page.request.get('/api/nocodebackend/catalog/products?page=1&limit=1'))
    const productId = catalogue.items[0].id
    const paths = ['/home', '/search', '/places', `/products/${productId}`, `/products/${productId}/rate`, '/cellar', '/profile']
    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator('main, h1').first()).toBeVisible()
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).exclude('[data-release-check-exclude]').analyze()
      expect(results.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact)), `axe violations on ${path}`).toEqual([])
    }
    await signOut(page)
    const loginResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(loginResults.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
  } finally {
    await context.close()
  }
})
