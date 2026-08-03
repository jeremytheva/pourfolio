import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { requiredEnvironment, responseJson, signIn, signOut } from './support.js'

const credentials = requiredEnvironment([
  'RELEASE_OWNER_EMAIL',
  'RELEASE_OWNER_PASSWORD',
  'RELEASE_OTHER_EMAIL',
  'RELEASE_OTHER_PASSWORD'
])

test.describe.configure({ mode: 'serial' })

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
  expect([302, 303, 307, 308]).toContain(rejected.status())
  const location = rejected.headers().location
  if (location) expect(new URL(location).hostname).not.toBe('attacker.invalid')
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
  const providers = JSON.stringify(await providersResponse.json()).toLowerCase()
  expect(providers).toMatch(/email.?password|password|credentials/)

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

  await signIn(page, credentials.RELEASE_OWNER_EMAIL, credentials.RELEASE_OWNER_PASSWORD)
  await signOut(page)

  if (/otp|magic.?link|email.?code/.test(providers)) {
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

  if (/google/.test(providers)) {
    const google = await request.get('/api/nocodebackend/auth/sign-in/google', { maxRedirects: 0 })
    expect([302, 303, 307, 308]).toContain(google.status())
    expect(google.headers().location).toMatch(/^https:\/\//)
  }
})

test('catalogue, pagination, direct details, rating boundaries and history deletion', async ({ page }) => {
  await signIn(page, credentials.RELEASE_OWNER_EMAIL, credentials.RELEASE_OWNER_PASSWORD)
  await page.goto('/search')
  await expect(page.getByLabel('Search products, producers or styles')).toBeFocused()
  await page.getByLabel('Search products, producers or styles').fill(process.env.RELEASE_SEARCH_TERM || 'beer')
  await expect(page.getByText(/products? found/)).toBeVisible()
  if (await page.getByRole('button', { name: 'Next' }).isVisible()) {
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/Page 2 of/)).toBeVisible()
  }

  const productLink = page.getByRole('link', { name: 'View product' }).first()
  const productPath = await productLink.getAttribute('href')
  expect(productPath).toMatch(/^\/products\/\d+$/)
  await page.goto(productPath)
  await expect(page.getByRole('link', { name: 'Rate this beer' })).toBeVisible()
  await page.goto(`${productPath}/rate`)
  const scores = page.getByRole('combobox')
  await scores.first().selectOption('1')
  await page.getByRole('button', { name: 'Submit rating' }).click()
  await expect(page.getByRole('alert')).toContainText('Score every applicable attribute')
  for (let index = 0; index < await scores.count(); index += 1) {
    await scores.nth(index).selectOption(index % 2 ? '7' : '1')
  }
  await page.getByRole('button', { name: 'Submit rating' }).click()
  await expect(page).toHaveURL(new RegExp(`${productPath}$`))
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'My ratings' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Delete rating/ }).first().click()
})

test('cellar CRUD, profile allowlist and cross-account ownership boundaries', async ({ browser, page }) => {
  await signIn(page, credentials.RELEASE_OWNER_EMAIL, credentials.RELEASE_OWNER_PASSWORD)
  const catalogue = await page.request.get('/api/nocodebackend/catalog/products?page=1&limit=1')
  const product = (await responseJson(catalogue)).items[0]
  expect(product?.id).toBeTruthy()

  const created = await page.request.post('/api/nocodebackend/cellar', { data: {
    product_id: product.id, quantity: 1, container: 'release-check', notes: 'redacted automated evidence'
  } })
  expect(created.status()).toBe(201)
  const cellarItem = (await responseJson(created)).item
  const updated = await page.request.put(`/api/nocodebackend/cellar/${cellarItem.id}`, { data: { quantity: 2, notes: 'release-check updated' } })
  expect(updated.ok()).toBeTruthy()

  const profileBefore = await responseJson(await page.request.get('/api/nocodebackend/profile'))
  const sessionBefore = await responseJson(await page.request.get('/api/nocodebackend/auth/get-session'))
  const injected = await page.request.put('/api/nocodebackend/profile', { data: {
    name: 'Release Owner', description: 'Connected release check', email: 'injected@example.invalid',
    role: 'admin', user_id: 'other-user', id: '999999'
  } })
  expect(injected.ok()).toBeTruthy()
  const profileAfter = await responseJson(await page.request.get('/api/nocodebackend/profile'))
  const sessionAfter = await responseJson(await page.request.get('/api/nocodebackend/auth/get-session'))
  expect(profileAfter.profile.id).toBe(profileBefore.profile.id)
  expect(JSON.stringify(profileAfter)).not.toContain('injected@example.invalid')
  expect(JSON.stringify(profileAfter)).not.toContain('other-user')
  expect(JSON.stringify(profileAfter)).not.toContain('admin')
  expect(sessionAfter).toEqual(sessionBefore)

  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  await signIn(otherPage, credentials.RELEASE_OTHER_EMAIL, credentials.RELEASE_OTHER_PASSWORD)
  expect([403, 404]).toContain((await otherPage.request.get(`/api/nocodebackend/cellar/${cellarItem.id}`)).status())
  expect((await otherPage.request.put(`/api/nocodebackend/cellar/${cellarItem.id}`, { data: { quantity: 99 } })).status()).toBe(403)
  expect((await otherPage.request.delete(`/api/nocodebackend/cellar/${cellarItem.id}`)).status()).toBe(403)
  const otherCellar = await responseJson(await otherPage.request.get('/api/nocodebackend/cellar'))
  expect(otherCellar.items.map(({ id }) => String(id))).not.toContain(String(cellarItem.id))
  await otherContext.close()

  expect((await page.request.delete(`/api/nocodebackend/cellar/${cellarItem.id}`)).ok()).toBeTruthy()
})

test('expired session returns every protected direct route to sign-in', async ({ page }) => {
  await signIn(page, credentials.RELEASE_OWNER_EMAIL, credentials.RELEASE_OWNER_PASSWORD)
  await page.context().clearCookies()
  for (const path of ['/home', '/search', '/cellar', '/profile']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
  }
})

test('axe has no serious or critical violations on every reachable launch page', async ({ page }) => {
  await signIn(page, credentials.RELEASE_OWNER_EMAIL, credentials.RELEASE_OWNER_PASSWORD)
  const catalogue = await responseJson(await page.request.get('/api/nocodebackend/catalog/products?page=1&limit=1'))
  const productId = catalogue.items[0].id
  const paths = ['/home', '/search', `/products/${productId}`, `/products/${productId}/rate`, '/cellar', '/profile']
  for (const path of paths) {
    await page.goto(path)
    await expect(page.locator('main, h1').first()).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).exclude('[data-release-check-exclude]').analyze()
    expect(results.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact)), `axe violations on ${path}`).toEqual([])
  }
  await signOut(page)
  const loginResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(loginResults.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([])
})
