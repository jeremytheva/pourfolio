import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseReleaseBaseUrl,
  parseReleaseSha,
  validateReadinessPayload,
  verifyReleaseTarget
} from './releaseTarget.js'

const sha = '0123456789abcdef0123456789abcdef01234567'
const deployment = 'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app'

const readiness = (overrides = {}) => ({
  status: 'ready',
  release: { commitSha: sha, environment: 'preview' },
  checks: { dataProvider: 'ok' },
  ...overrides
})

test('release target accepts only the Pourfolio Vercel origin family', () => {
  assert.equal(parseReleaseBaseUrl(deployment), deployment)
  assert.equal(
    parseReleaseBaseUrl('https://pourfolio-git-main-jeremythevas-projects.vercel.app/'),
    'https://pourfolio-git-main-jeremythevas-projects.vercel.app'
  )
  assert.equal(
    parseReleaseBaseUrl('https://pourfolio-jeremythevas-projects.vercel.app'),
    'https://pourfolio-jeremythevas-projects.vercel.app'
  )

  for (const invalid of [
    'http://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app',
    'https://attacker.invalid',
    'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app.attacker.invalid',
    'https://user:password@pourfolio-qc830ecrq-jeremythevas-projects.vercel.app',
    'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app:8443',
    'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app/login',
    'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app/?share=1',
    'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app/#fragment'
  ]) {
    assert.throws(() => parseReleaseBaseUrl(invalid), /Release URL/)
  }
})

test('release SHA requires exact lowercase full provenance', () => {
  assert.equal(parseReleaseSha(sha), sha)
  for (const invalid of [sha.slice(0, 39), `${sha}0`, sha.toUpperCase(), 'main', '', null]) {
    assert.throws(() => parseReleaseSha(invalid), /Release SHA/)
  }
})

test('readiness requires the exact ready release and usable data provider', () => {
  assert.deepEqual(validateReadinessPayload(readiness(), sha), {
    commitSha: sha,
    environment: 'preview',
    dataProvider: 'ok'
  })

  const badPayloads = [
    null,
    {},
    readiness({ status: 'degraded' }),
    readiness({ release: { commitSha: 'f'.repeat(40), environment: 'preview' } }),
    readiness({ release: { commitSha: sha, environment: 'staging' } }),
    readiness({ checks: { dataProvider: 'forbidden' } })
  ]
  for (const payload of badPayloads) {
    assert.throws(() => validateReadinessPayload(payload, sha), /readiness|provenance/i)
  }
})

test('verification fetches readiness without credentials or redirects', async () => {
  let observedUrl
  let observedOptions
  const result = await verifyReleaseTarget({
    baseUrl: deployment,
    releaseSha: sha,
    fetchImpl: async (url, options) => {
      observedUrl = url
      observedOptions = options
      return { status: 200, json: async () => readiness() }
    }
  })

  assert.equal(observedUrl, `${deployment}/api/readiness`)
  assert.deepEqual(observedOptions, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  })
  assert.equal(Object.hasOwn(observedOptions.headers, 'Authorization'), false)
  assert.deepEqual(result, {
    origin: deployment,
    commitSha: sha,
    environment: 'preview',
    dataProvider: 'ok'
  })
})

test('verification fails closed on redirects, errors, malformed JSON and provenance drift', async () => {
  const cases = [
    async () => ({ status: 302, json: async () => readiness() }),
    async () => ({ status: 503, json: async () => readiness() }),
    async () => ({ status: 200, json: async () => { throw new Error('bad json') } }),
    async () => ({ status: 200, json: async () => readiness({ release: { commitSha: 'f'.repeat(40), environment: 'preview' } }) }),
    async () => ({ status: 200, json: async () => readiness({ checks: { dataProvider: 'forbidden' } }) })
  ]

  for (const fetchImpl of cases) {
    await assert.rejects(
      verifyReleaseTarget({ baseUrl: deployment, releaseSha: sha, fetchImpl }),
      /readiness|provenance/i
    )
  }
})
