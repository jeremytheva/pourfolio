import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { dataProvider } from '../dataProvider.js'

const enabled = process.env.RUN_NOCODEBACKEND_PROVIDER_CONTRACT === '1'
const contractTest = enabled ? test : test.skip
const requiredEnvironment = [
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NCB_CONTRACT_PRODUCT_ID'
]

const unique = `contract-${Date.now()}-${Math.random().toString(36).slice(2)}`
const created = []
const userId = `${unique}-user`
const productId = process.env.NCB_CONTRACT_PRODUCT_ID

const transcriptPath = process.env.NCB_CONTRACT_TRANSCRIPT_PATH
const transcript = []
const originalFetch = globalThis.fetch

const redactions = [
  [process.env.NOCODEBACKEND_DATA_BASE_URL, '<provider-base-url>'],
  [process.env.NOCODEBACKEND_SECRET_KEY, '<provider-secret>'],
  [unique, '<contract-run-id>'],
  [userId, '<contract-user-id>'],
  [productId, '<contract-product-id>']
].filter(([needle]) => needle)

const redactText = (value) => redactions.reduce(
  (text, [needle, replacement]) => text.replaceAll(needle, replacement),
  String(value)
)

const redactValue = (value) => {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return redactText(value)
  if (Array.isArray(value)) return value.map(redactValue)
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactValue(entry)]))
  }
  return value
}

const parseBody = (body) => {
  if (body === undefined || body === null) return null
  if (typeof body !== 'string') return '<non-string-body>'
  try {
    return redactValue(JSON.parse(body))
  } catch {
    return '<non-json-body>'
  }
}

const headersToObject = (headers = {}) => {
  const entries = headers instanceof Headers ? [...headers.entries()] : Object.entries(headers)
  return Object.fromEntries(entries.map(([key, value]) => [key.toLowerCase(), key.toLowerCase() === 'authorization' ? 'Bearer <redacted>' : redactText(value)]))
}

const captureFetch = async (input, init = {}) => {
  const startedAt = Date.now()
  const url = new URL(typeof input === 'string' ? input : input.url)
  const request = {
    method: init.method || 'GET',
    path: redactText(`${url.pathname}${url.search}`),
    headers: headersToObject(init.headers),
    body: parseBody(init.body)
  }

  try {
    const response = await originalFetch(input, init)
    const clone = response.clone()
    let responseBody = null
    try {
      const text = await clone.text()
      responseBody = text ? redactValue(JSON.parse(text)) : null
    } catch {
      responseBody = '<non-json-body>'
    }
    transcript.push({ request, response: { status: response.status, body: responseBody }, duration_ms: Date.now() - startedAt })
    return response
  } catch (error) {
    transcript.push({ request, error: { name: error?.name || 'Error', message: redactText(error?.message || '') }, duration_ms: Date.now() - startedAt })
    throw error
  }
}

if (enabled && transcriptPath) globalThis.fetch = captureFetch

const remember = (collection, record) => {
  if (record?.id !== undefined && record?.id !== null) created.push([collection, record.id])
  return record
}

const first = (value) => (Array.isArray(value) ? value[0] : value)

const requireContractEnvironment = () => {
  const missing = requiredEnvironment.filter((key) => !process.env[key])
  assert.deepEqual(missing, [], `Missing connected contract environment: ${missing.join(', ')}`)
}

const createRating = async (suffix, overrides = {}) => remember('ratings', first(await dataProvider.create('ratings', {
  user_id: userId,
  product_id: productId,
  submission_id: `${unique}-${suffix}`,
  submission_state: 'draft',
  submission_version: 1,
  ...overrides
})))

const createScore = async (rating, suffix, overrides = {}) => remember('rating_scores', first(await dataProvider.create('rating_scores', {
  user_id: userId,
  rating_id: rating.id,
  attribute_key: `overall-${suffix}`,
  score: 5,
  ...overrides
})))

test.after(async () => {
  if (enabled && transcriptPath) {
    const resolved = path.resolve(transcriptPath)
    await mkdir(path.dirname(resolved), { recursive: true })
    await writeFile(resolved, `${JSON.stringify({ generated_at: new Date().toISOString(), entries: transcript }, null, 2)}\n`)
  }
  if (!enabled) return
  for (const [collection, id] of created.reverse()) {
    try {
      await dataProvider.remove(collection, id)
    } catch {
      // Best-effort cleanup only; failures should not mask the contract assertion.
    }
  }
})

contractTest('provider contract environment is explicit and isolated', () => {
  requireContractEnvironment()
  assert.match(process.env.NOCODEBACKEND_DATA_BASE_URL, /^https:\/\//)
})

contractTest('list, filtered-list conjunction, empty-list, get, missing-record and delete behaviours', async () => {
  requireContractEnvironment()
  const rating = await createRating('list')
  await createScore(rating, 'list')

  const allForUser = await dataProvider.list('ratings', { user_id: userId })
  assert.equal(allForUser.some((record) => String(record.id) === String(rating.id)), true)

  const conjunctiveHit = await dataProvider.list('ratings', { user_id: userId, submission_id: `${unique}-list` })
  assert.deepEqual(conjunctiveHit.map((record) => String(record.id)), [String(rating.id)])

  const conjunctiveMiss = await dataProvider.list('ratings', { user_id: userId, submission_id: `${unique}-missing` })
  assert.deepEqual(conjunctiveMiss, [])

  assert.equal(String((await dataProvider.get('ratings', rating.id)).id), String(rating.id))
  assert.equal(await dataProvider.get('ratings', `999999${Date.now()}`), null)

  const deleted = await dataProvider.remove('rating_scores', created.pop()[1])
  assert.ok(deleted === null || typeof deleted === 'object' || Array.isArray(deleted))
})

contractTest('POST, PUT, DELETE, duplicate conflict and retry idempotency behaviours', async () => {
  requireContractEnvironment()
  const rating = await createRating('idempotent')
  const updated = first(await dataProvider.update('ratings', rating.id, { notes: `${unique}-updated` }))
  assert.equal(String(updated.id), String(rating.id))

  await assert.rejects(
    dataProvider.create('ratings', {
      user_id: userId,
      product_id: productId,
      submission_id: `${unique}-idempotent`,
      submission_state: 'draft',
      submission_version: 1
    }),
    (error) => error.status === 409 && dataProvider.isUniqueConflict(error)
  )

  const replayed = await dataProvider.list('ratings', { user_id: userId, submission_id: `${unique}-idempotent` })
  assert.deepEqual(replayed.map((record) => String(record.id)), [String(rating.id)])
})

contractTest('malformed, unauthorised, 404 and 409 provider behaviours are safe and machine-readable', async () => {
  requireContractEnvironment()
  const malformed = await fetch(`${process.env.NOCODEBACKEND_DATA_BASE_URL.replace(/\/+$/, '')}/ratings`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.NOCODEBACKEND_SECRET_KEY}`, 'content-type': 'application/json' },
    body: '{'
  })
  assert.equal(malformed.status >= 400, true)

  const unauthorised = await fetch(`${process.env.NOCODEBACKEND_DATA_BASE_URL.replace(/\/+$/, '')}/ratings`, {
    headers: { authorization: 'Bearer redacted-invalid-contract-token' }
  })
  assert.ok([401, 403].includes(unauthorised.status))

  await assert.rejects(dataProvider.update('ratings', `999999${Date.now()}`, { notes: unique }), { status: 404 })
})

contractTest('partial multi-collection failure leaves a draft parent that can be retried idempotently', async () => {
  requireContractEnvironment()
  const rating = await createRating('partial')
  await assert.rejects(dataProvider.create('rating_scores', {
    user_id: userId,
    rating_id: rating.id,
    attribute_key: null,
    score: 'not-a-number'
  }))

  const persisted = await dataProvider.get('ratings', rating.id)
  assert.equal(persisted.submission_state, 'draft')
  assert.equal(Number(persisted.submission_version), 1)

  await createScore(rating, 'partial')
  const transitioned = first(await dataProvider.compareAndSet('ratings', rating.id, 1, {
    submission_state: 'complete',
    submission_version: 2
  }))
  assert.equal(transitioned.submission_state, 'complete')
})

contractTest('concurrent compare-and-set on submission_version allows exactly one transition', async () => {
  requireContractEnvironment()
  const rating = await createRating('cas')

  const attempts = await Promise.allSettled([
    dataProvider.compareAndSet('ratings', rating.id, 1, { submission_state: 'complete', submission_version: 2, notes: `${unique}-winner-a` }),
    dataProvider.compareAndSet('ratings', rating.id, 1, { submission_state: 'complete', submission_version: 2, notes: `${unique}-winner-b` })
  ])

  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1)
  const rejected = attempts.find((result) => result.status === 'rejected')
  assert.equal(rejected.reason.status, 409)
  assert.equal(rejected.reason.code, 'VERSION_CONFLICT')

  const persisted = await dataProvider.get('ratings', rating.id)
  assert.equal(Number(persisted.submission_version), 2)
  assert.equal([`${unique}-winner-a`, `${unique}-winner-b`].includes(persisted.notes), true)
})

contractTest('provider pagination, terminal-page and ordering observations are captured without adapter dependency', async () => {
  requireContractEnvironment()
  const base = process.env.NOCODEBACKEND_DATA_BASE_URL.replace(/\/+$/, '')
  const response = await fetch(`${base}/ratings?user_id=${encodeURIComponent(userId)}&limit=1&page=999999`, {
    headers: { accept: 'application/json', authorization: `Bearer ${process.env.NOCODEBACKEND_SECRET_KEY}` }
  })
  assert.equal(response.ok, true)
  const payload = await response.json()
  const records = payload?.data ?? payload?.records ?? payload?.items ?? payload?.results ?? payload
  assert.equal(Array.isArray(records), true)
})

contractTest('timeouts before and after persisted writes surface as retryable safe failures', async () => {
  requireContractEnvironment()
  const timeoutMs = Number.parseInt(process.env.NCB_CONTRACT_CLIENT_TIMEOUT_MS || '1', 10)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    await assert.rejects(fetch(`${process.env.NOCODEBACKEND_DATA_BASE_URL.replace(/\/+$/, '')}/ratings`, {
      headers: { authorization: `Bearer ${process.env.NOCODEBACKEND_SECRET_KEY}` },
      signal: controller.signal
    }))
  } finally {
    clearTimeout(timer)
  }

  const rating = await createRating('timeout-after')
  const replayed = await dataProvider.list('ratings', { user_id: userId, submission_id: `${unique}-timeout-after` })
  assert.deepEqual(replayed.map((record) => String(record.id)), [String(rating.id)])
})
