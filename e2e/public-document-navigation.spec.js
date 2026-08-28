import { expect, test } from '@playwright/test'

test('public document exposes skip target and section navigation', async ({ page }) => {
  await page.goto('/privacy')

  const main = page.locator('#document-content')
  await expect(main).toHaveAttribute('tabindex', '-1')

  const sectionNav = page.getByRole('navigation', { name: 'Document sections' })
  await expect(sectionNav).toBeVisible()
  await expect(sectionNav.getByRole('link', { name: 'What we collect' })).toHaveAttribute('href', '#section-what-we-collect')
  await expect(page.locator('#section-what-we-collect')).toHaveText('What we collect')

  await page.keyboard.press('Tab')
  const skipLink = page.getByRole('link', { name: 'Skip to document' })
  await expect(skipLink).toBeFocused()
  await skipLink.press('Enter')
  await expect(main).toBeFocused()
})
