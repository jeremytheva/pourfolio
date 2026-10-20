import fs from 'node:fs/promises'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'
import { inspectBrowserRatingFixture } from './browser-rating-fixture-inspection.js'

// Exact fixture acknowledged in the owner browser on the pinned production
// release. These identifiers are read targets only; no deletion is enabled.
const fixture = Object.freeze({ kind: 'browser-created-and-deleted-rating',
  ratingId: '630', productId: '1', dateRated: '2026-10-20', expectedTotal: 2.82,
  runtimeCommit: '36ce8ffef482a9044e1e9f35da03214f46b7e1d5',
  olderRatings: [{ id: '622', total: 3.51 }, { id: '365', total: 4.36 }],
  expectedCommunityCount: 4, expectedPersonalCount: 2, createsAttempted: 1, deletesAttempted: 1 })
const environment = process.env
let report = { version: 1, mode: 'read-only-browser-rating-fixture', status: 'BLOCKED',
  createsAttempted: 0, updatesAttempted: 0, deletesAttempted: 0 }
const blocked = async () => { throw Object.assign(new Error(), { code: 'RATING_UI_MUTATION_DISABLED' }) }
for (const method of ['create', 'update', 'compareAndSet', 'remove']) dataProvider[method] = blocked
try {
  if (environment.RATING_UI_INSPECTION_CONFIRMATION !== 'INSPECT THE RECORDED BROWSER RATING FIXTURE' ||
      !/^[a-f0-9]{40}$/.test(environment.RATING_UI_INSPECTION_SHA || '') ||
      environment.BONUS_CERTIFICATION_AUTH_SHA !== fixture.runtimeCommit) {
    throw Object.assign(new Error(), { code: 'RATING_UI_INSPECTION_GUARD_MISSING' })
  }
  if (['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE'].some((name) => !environment[name]?.trim())) {
    throw Object.assign(new Error(), { code: 'RUNTIME_CONFIGURATION_MISSING' })
  }
  const owner = await resolveBonusCertificationOwner({ environment: { ...environment, NOCODEBACKEND_CONTRACT_USER_ID: '' } })
  report = await inspectBrowserRatingFixture({ provider: dataProvider, userId: owner.id, fixture })
  report.ownerSource = owner.source
  report.authCommit = owner.authCommit
} catch (error) {
  report.failure = /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code || '') ? error.code : 'RATING_UI_INSPECTION_FAILED'
}
report.candidateCommit = /^[a-f0-9]{40}$/.test(environment.RATING_UI_INSPECTION_SHA || '') ? environment.RATING_UI_INSPECTION_SHA : null
report.observedAt = new Date().toISOString()
await fs.mkdir('artifacts/browser-rating-inspection', { recursive: true })
await fs.writeFile('artifacts/browser-rating-inspection/summary.json', `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(report)}\n`)
if (report.status !== 'PASS') process.exitCode = 2
