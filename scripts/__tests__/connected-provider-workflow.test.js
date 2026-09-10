import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { checkProviderContractTranscript } from '../check-provider-contract-transcript.js'

test('connected provider workflows keep production provider configuration owned by the deployed runtime', () => {
  const providerWorkflow = fs.readFileSync('.github/workflows/connected-provider-contract.yml', 'utf8')
  const releaseWorkflow = fs.readFileSync('.github/workflows/connected-release-check.yml', 'utf8')
  const repositoryValuePattern = /NOCODEBACKEND_INSTANCE:\s+(?!\$\{\{)/

  assert.match(providerWorkflow, /workflow_dispatch:/)
  assert.match(providerWorkflow, /environment: staging-release/)
  assert.match(providerWorkflow, /ref: \$\{\{ inputs\.release_sha \}\}/)
  assert.match(providerWorkflow, /\^\[0-9a-f\]\{40\}\$/)
  assert.match(providerWorkflow, /isolated-staging-destructive-provider-contract/)
  assert.match(providerWorkflow, /NOCODEBACKEND_CONTRACT_ENVIRONMENT: isolated-staging/)
  assert.match(providerWorkflow, /NOCODEBACKEND_CONTRACT_ALLOW_DESTRUCTIVE: "1"/)
  assert.match(providerWorkflow, /NOCODEBACKEND_DATA_BASE_URL: https:\/\/api\.nocodebackend\.com\//)
  assert.match(providerWorkflow, /NOCODEBACKEND_INSTANCE: \$\{\{ vars\.NOCODEBACKEND_INSTANCE \}\}/)
  assert.doesNotMatch(providerWorkflow, repositoryValuePattern)
  assert.match(providerWorkflow, /redacted-transcript\.json/)
  assert.match(providerWorkflow, /check:provider-contract-transcript/)
  assert.match(providerWorkflow, /if-no-files-found: error/)
  assert.doesNotMatch(providerWorkflow, /pull_request:|push:/)

  assert.match(releaseWorkflow, /RELEASE_BASE_URL: \$\{\{ inputs\.release_url \}\}/)
  assert.match(releaseWorkflow, /RELEASE_SHA: \$\{\{ inputs\.release_sha \}\}/)
  assert.match(releaseWorkflow, /Verify release target origin and provenance/)
  assert.match(releaseWorkflow, /node scripts\/verify-release-target\.js/)
  assert.doesNotMatch(releaseWorkflow, /NOCODEBACKEND_SECRET_KEY/)
  assert.doesNotMatch(releaseWorkflow, /NOCODEBACKEND_INSTANCE/)
  assert.doesNotMatch(releaseWorkflow, /test:provider-smoke/)
  assert.doesNotMatch(releaseWorkflow, repositoryValuePattern)

  const preflight = releaseWorkflow.indexOf('Verify release target origin and provenance')
  const credentialedChecks = releaseWorkflow.indexOf('Run connected release checks')
  const ownerPassword = releaseWorkflow.indexOf('RELEASE_OWNER_PASSWORD:')
  assert.ok(preflight >= 0)
  assert.ok(credentialedChecks > preflight)
  assert.ok(ownerPassword > preflight)
})

test('provider transcript checker requires cleanup and rejects sensitive values', () => {
  const passing = checkProviderContractTranscript({
    entries: [{ request: { path: '/ratings' }, response: { status: 200 } }],
    cleanup: { attempted: 2, failures: 0, status: 'PASS' }
  }, ['private-secret'])
  assert.equal(passing.status, 'PASS')

  const blocked = checkProviderContractTranscript({
    entries: [{ request: { path: '/ratings?user=private-secret' } }],
    cleanup: { attempted: 2, failures: 1, status: 'BLOCKED' }
  }, ['private-secret'])
  assert.equal(blocked.status, 'BLOCKED')
  assert.deepEqual(blocked.blockers.map((blocker) => blocker.code), [
    'CLEANUP_NOT_PROVEN',
    'SENSITIVE_VALUE_PRESENT'
  ])
})
