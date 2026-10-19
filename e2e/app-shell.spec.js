import { expect, test } from '@playwright/test'
import { installMockApi } from './mockApi.js'

for (const route of ['/privacy', '/products/4']) {
  test(`the app icon resolves as an image from the built ${route} shell`, async ({ page }) => {
    await installMockApi(page)
    const staleIconRequests = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/vite.svg') staleIconRequests.push(request.url())
    })
    await page.goto(route)
    await expect(page).toHaveTitle('Pourfolio - Discover Your Happy Place')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const icon = page.locator('link[rel="icon"]')
    await expect(icon).toHaveAttribute('type', 'image/svg+xml')
    await expect(icon).toHaveAttribute('href', '/favicon.svg')

    // A missing asset can return the SPA's HTTP 200 HTML fallback. Require
    // the actual image MIME type/body and browser decoding, not status alone.
    const url = new URL(await icon.getAttribute('href'), page.url())
    const response = await page.request.get(url.href)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/^image\/svg\+xml(?:;|$)/)
    expect(await response.text()).toContain('<svg')
    await expect.poll(() => page.evaluate((src) => new Promise((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0)
      image.onerror = () => resolve(false)
      image.src = src
    }), url.href)).toBe(true)
    expect(staleIconRequests).toEqual([])
  })
}
