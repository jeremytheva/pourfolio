import { expect } from '@playwright/test'

// Use the real card transitions, including optional zero-weight dimensions.
// Burp is out of 1, not 7; optional cards should be skipped explicitly.
export const completeRatingCards = async (page) => {
  const group = page.getByRole('group', { name: 'Applicable attributes' })
  let manualScoreCount = 0
  for (const name of ['Design', 'Appearance', 'Aroma', 'Mouthfeel', 'Flavour', 'Follow', 'Burp']) {
    await expect(group.getByRole('heading', { name, exact: true, level: 2 })).toBeVisible()
    const skip = group.getByRole('button', { name: 'Skip this attribute', exact: true })
    if (await skip.count()) {
      await skip.click()
    } else {
      await group.getByRole('button', { name: `${name}: 4 out of 7`, exact: true }).click()
      manualScoreCount += 1
    }
  }

  await expect(group.getByRole('heading', { name: 'All bonus attributes', exact: true, level: 2 })).toBeVisible()
  // Select an existing descriptor; its persisted value remains authoritative.
  // An empty bonus catalogue fails before any submission or fixture creation.
  const bonus = group.getByRole('checkbox').first()
  await expect(bonus).toBeVisible()
  await bonus.check()
  await expect(bonus).toBeChecked()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(group.getByRole('heading', { name: 'Review your rating', exact: true, level: 2 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit rating', exact: true })).toBeEnabled()
  return { manualScoreCount, selectedBonusCount: 1 }
}
