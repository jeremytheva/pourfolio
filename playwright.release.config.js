import { defineConfig, devices } from '@playwright/test'
import { parseReleaseBaseUrl } from './release-check/releaseTarget.js'

const baseURL = parseReleaseBaseUrl(process.env.RELEASE_BASE_URL)

export default defineConfig({
  testDir: './release-check',
  outputDir: 'test-results/release-check',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/release-check', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: { 'x-release-check': 'connected-staging' }
  },
  projects: [{ name: 'connected-chromium', use: { ...devices['Desktop Chrome'] } }]
})
