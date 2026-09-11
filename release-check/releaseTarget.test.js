import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseReleaseBaseUrl,
  parseReleaseSha,
  validateReadinessPayload,
  verifyReleaseTarget,
  verifyReleaseTargetWithRetry
} from './releaseTarget.js'

const sha = '0123456789abcdef0123456789abcdef01234567'
const deployment = 'https://pourfolio-qc830ecrq-jeremythevas-projects.vercel.app'
const publicProduction = 'https://brew-buds-mobile-app-design-3577.vercel.app'

const readiness = (overrides = {}) => ({
  status: 'ready',
  release: { commitSha: sha, environment: 'preview' },
  checks: { dataProvider: 'ok' },
  ...overrides
})

test('release target accepts only explicitly approved Pourfolio Vercel origins', () => {
  assert.equal(parseReleaseBaseUrl(deployment), deployment)
  assert.equal(parseReleaseBaseUrl(publicProduction), publicProduction)
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
    'https://brew-buds-mobile-app-design-3578.vercel.app',
    'https://brew-buds-mobile-app-design-3577.vercel.app.attacker.invalid',
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

test('bounded retry tolerates deployment propagation then requires the exact release', async () => {
  let calls = 0
  const sleeps = []
  const staleSha = 'f'.repeat(40)
  const result = await verifyReleaseTargetWithRetry({
    baseUrl: publicProduction,
    releaseSha: sha,
    attempts: 3,
    delayMs: 25,
    sleepImpl: async (milliseconds) => { sleeps.push(milliseconds) },
    fetchImpl: async () => {
      calls += 1
      const commitSha = calls < 3 ? staleSha : sha
      return {
        status: 200,
        json: async () => readiness({ release: { commitSha, environment: 'production' } })
      }
    }
  })

  assert.equal(calls, 3)
  assert.deepEqual(sleeps, [25, 25])
  assert.deepEqual(result, {
    origin: publicProduction,
    commitSha: sha,
    environment: 'production',
    dataProvider: 'ok'
  })
})

test('bounded retry still fails closed after the configured propagation window', async () => {
  let calls = 0
  let sleeps = 0
  await assert.rejects(
    verifyReleaseTargetWithRetry({
      baseUrl: publicProduction,
      releaseSha: sha,
      attempts: 3,
      delayMs: 1,
      sleepImpl: async () => { sleeps += 1 },
      fetchImpl: async () => {
        calls += 1
        return {
          status: 200,
          json: async () => readiness({ release: { commitSha: 'f'.repeat(40), environment: 'production' } })
        }
      }
    }),
    /provenance/i
  )

  assert.equal(calls, 3)
  assert.equal(sleeps, 2)
})

test('retry configuration is bounded and invalid release inputs fail before polling', async () => {
  for (const attempts of [0, 61, 1.5]) {
    await assert.rejects(
      verifyReleaseTargetWithRetry({ baseUrl: deployment, releaseSha: sha, attempts }),
      /attempt count/i
    )
  }
  for (const delayMs of [-1, 60001, 1.5]) {
    await assert.rejects(
      verifyReleaseTargetWithRetry({ baseUrl: deployment, releaseSha: sha, delayMs }),
      /delay/i
    )
  }

  let called = false
  await assert.rejects(
    verifyReleaseTargetWithRetry({
      baseUrl: 'https://attacker.invalid',
      releaseSha: sha,
      fetchImpl: async () => { called = true }
    }),
    /Release URL/
  )
  assert.equal(called, false)
})
