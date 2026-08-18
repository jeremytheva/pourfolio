import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { checkProviderContractTranscript } from '../check-provider-contract-transcript.js'

test('connected provider workflow is manual, SHA-pinned, protected and destructively guarded', () => {
  const workflow = fs.readFileSync('.github/workflows/connected-provider-contract.yml', 'utf8')
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /environment: staging-release/)
  assert.match(workflow, /ref: \$\{\{ inputs\.release_sha \}\}/)
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/)
  assert.match(workflow, /isolated-staging-destructive-provider-contract/)
  assert.match(workflow, /NCB_CONTRACT_ENVIRONMENT: isolated-staging/)
  assert.match(workflow, /NCB_CONTRACT_ALLOW_DESTRUCTIVE: "1"/)
  assert.match(workflow, /redacted-transcript\.json/)
  assert.match(workflow, /check:provider-contract-transcript/)
  assert.match(workflow, /if-no-files-found: error/)
  assert.doesNotMatch(workflow, /pull_request:|push:/)
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
