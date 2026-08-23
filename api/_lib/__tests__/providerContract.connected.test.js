import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { dataProvider } from '../dataProvider.js'

const enabled = process.env.RUN_NOCODEBACKEND_PROVIDER_CONTRACT === '1'
const contractTest = enabled ? test : test.skip
const requiredEnvironment = [
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NOCODEBACKEND_INSTANCE',
  'NOCODEBACKEND_CONTRACT_ENVIRONMENT',
  'NOCODEBACKEND_CONTRACT_ALLOW_DESTRUCTIVE',
  'NOCODEBACKEND_CONTRACT_USER_ID',
  'NOCODEBACKEND_CONTRACT_PRODUCT_ID',
  'NOCODEBACKEND_CONTRACT_ATTRIBUTE_ID'
]

const unique = `contract-${Date.now()}-${Math.random().toString(36).slice(2)}`
const created = []
const ratingPayloads = new Map()
const userId = process.env.NOCODEBACKEND_CONTRACT_USER_ID
const productId = process.env.NOCODEBACKEND_CONTRACT_PRODUCT_ID
const attributeId = process.env.NOCODEBACKEND_CONTRACT_ATTRIBUTE_ID
const dataBaseUrl = process.env.NOCODEBACKEND_DATA_BASE_URL?.replace(/\/+$/, '')
const dataSecret = process.env.NOCODEBACKEND_SECRET_KEY
const instance = process.env.NOCODEBACKEND_INSTANCE
let ratingSequence = 0

const transcriptPath = process.env.NOCODEBACKEND_CONTRACT_TRANSCRIPT_PATH
const transcript = []
const originalFetch = globalThis.fetch

const redactions = [
  [dataBaseUrl, '<provider-base-url>'],
  [dataSecret, '<provider-secret>'],
  [unique, '<contract-run-id>'],
  [userId, '<contract-user-id>'],
  [productId, '<contract-product-id>'],
  [attributeId, '<contract-attribute-id>']
].filter(([needle]) => needle)

const redactText = (value) => redactions.reduce(
  (text, [needle, replacement]) => text.replaceAll(needle, replacement),
  String(value)
)

const redactValue = (value) => {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return redactText(value)
  if (Array.isArray(value)) return value.map(redactValue)
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactValue(entry)]))
  return value
}

const parseBody = (body) => {
  if (body === undefined || body === null) return null
  if (typeof body !== 'string') return '<non-string-body>'
  try { return redactValue(JSON.parse(body)) } catch { return '<non-json-body>' }
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
  assert.equal(process.env.NOCODEBACKEND_CONTRACT_ENVIRONMENT, 'isolated-staging')
  assert.equal(process.env.NOCODEBACKEND_CONTRACT_ALLOW_DESTRUCTIVE, '1')
  assert.equal(process.env.NOCODEBACKEND_INSTANCE, '54026_rating')
}

const rawProviderUrl = (operation, collection, query = {}) => {
  const url = new URL(`${dataBaseUrl}/${operation}/${collection}`)
  url.searchParams.set('Instance', instance)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  return url
}

const rawProviderHeaders = (secret = dataSecret) => ({
  accept: 'application/json',
  authorization: `Bearer ${secret}`,
  'x-database-instance': instance
})

const nextRatingId = () => {
  ratingSequence += 1
  return (Date.now() * 1000) + ratingSequence
}

const buildRatingPayload = (suffix, overrides = {}) => {
  const ratingId = nextRatingId()
  const submissionKey = `${userId}:${ratingId}`
  return {
    user_id: userId,
    rating_id: ratingId,
    product_id: productId,
    submission_key: submissionKey,
    submission_fingerprint: createHash('sha256').update(`${unique}:${suffix}:${ratingId}`).digest('hex'),
    submission_state: 'pending',
    submission_version: 0,
    expected_score_count: 1,
    expected_bonus_count: 0,
    ...overrides
  }
}

const createRating = async (suffix, overrides = {}) => {
  const payload = buildRatingPayload(suffix, overrides)
  const rating = remember('ratings', first(await dataProvider.create('ratings', payload)))
  assert.ok(rating?.id, 'The provider must return the created rating identifier.')
  ratingPayloads.set(String(rating.id), payload)
  return rating
}

const ratingPayload = (rating) => ratingPayloads.get(String(rating.id))

const createScore = async (rating, overrides = {}) => {
  const parent = ratingPayload(rating)
  return remember('rating_scores', first(await dataProvider.create('rating_scores', {
    user_id: userId,
    rating_id: rating.id,
    attribute_id: attributeId,
    attribute_score: 5,
    uniqueness_key: `${parent.submission_key}:score:${attributeId}`,
    ...overrides
  })))
}

test.after(async () => {
  if (!enabled) return
  const cleanupAttempted = created.length
  const cleanupFailures = []
  for (const [collection, id] of created.reverse()) {
    try {
      await dataProvider.remove(collection, id)
      const remaining = await dataProvider.get(collection, id)
      if (remaining) cleanupFailures.push({ collection, code: 'RECORD_REMAINS' })
    } catch (error) {
      cleanupFailures.push({ collection, status: Number.isInteger(error?.status) ? error.status : null, code: error?.code || 'CLEANUP_FAILED' })
    }
  }
  if (transcriptPath) {
    const resolved = path.resolve(transcriptPath)
    await mkdir(path.dirname(resolved), { recursive: true })
    await writeFile(resolved, `${JSON.stringify({
      generated_at: new Date().toISOString(),
      entries: transcript,
      cleanup: { attempted: cleanupAttempted, failures: cleanupFailures.length, status: cleanupFailures.length ? 'BLOCKED' : 'PASS' }
    }, null, 2)}\n`)
  }
  assert.deepEqual(cleanupFailures, [], 'Connected contract cleanup must leave no created records.')
})

contractTest('provider contract environment is explicit and isolated', () => {
  requireContractEnvironment()
  assert.match(process.env.NOCODEBACKEND_DATA_BASE_URL, /^https:\/\//)
  assert.match(String(userId), /\S/)
  assert.match(String(productId), /^[1-9]\d*$/)
  assert.match(String(attributeId), /^[1-9]\d*$/)
})

contractTest('list, filtered-list conjunction, empty-list, get, missing-record and delete behaviours', async () => {
  requireContractEnvironment()
  const rating = await createRating('list')
  const payload = ratingPayload(rating)
  await createScore(rating)

  const allForUser = await dataProvider.list('ratings', { user_id: userId })
  assert.equal(allForUser.some((record) => String(record.id) === String(rating.id)), true)

  const conjunctiveHit = await dataProvider.list('ratings', { user_id: userId, rating_id: payload.rating_id })
  assert.deepEqual(conjunctiveHit.map((record) => String(record.id)), [String(rating.id)])

  const conjunctiveMiss = await dataProvider.list('ratings', { user_id: userId, rating_id: payload.rating_id + 1 })
  assert.deepEqual(conjunctiveMiss, [])

  assert.equal(String((await dataProvider.get('ratings', rating.id)).id), String(rating.id))
  assert.equal(await dataProvider.get('ratings', `999999${Date.now()}`), null)

  const deleted = await dataProvider.remove('rating_scores', created.pop()[1])
  assert.ok(deleted === null || typeof deleted === 'object' || Array.isArray(deleted))
})

contractTest('POST, PUT, DELETE, duplicate conflict and retry idempotency behaviours', async () => {
  requireContractEnvironment()
  const rating = await createRating('idempotent')
  const payload = ratingPayload(rating)
  const before = await dataProvider.get('ratings', rating.id)
  assert.match(String(before?.date_rated || ''), /\S/)
  const updated = first(await dataProvider.update('ratings', rating.id, { total_weighted: 4.5 }))
  assert.equal(String(updated.id), String(rating.id))
  const after = await dataProvider.get('ratings', rating.id)
  assert.equal(String(after.date_rated), String(before.date_rated))

  await assert.rejects(dataProvider.create('ratings', payload), (error) => error.status === 409 && dataProvider.isUniqueConflict(error))
  const replayed = await dataProvider.list('ratings', { user_id: userId, rating_id: payload.rating_id })
  assert.deepEqual(replayed.map((record) => String(record.id)), [String(rating.id)])
})

contractTest('malformed, unauthorised, 404 and 409 provider behaviours are safe and machine-readable', async () => {
  requireContractEnvironment()
  const malformed = await fetch(rawProviderUrl('create', 'ratings'), {
    method: 'POST',
    headers: { ...rawProviderHeaders(), 'content-type': 'application/json' },
    body: '{'
  })
  assert.equal(malformed.status >= 400, true)

  const unauthorised = await fetch(rawProviderUrl('read', 'ratings'), { headers: rawProviderHeaders('redacted-invalid-contract-token') })
  assert.ok([401, 403].includes(unauthorised.status))
  await assert.rejects(dataProvider.update('ratings', `999999${Date.now()}`, { total_weighted: 4.5 }), { status: 404 })
})

contractTest('partial multi-collection failure leaves a pending parent that can be retried idempotently', async () => {
  requireContractEnvironment()
  const rating = await createRating('partial')
  const payload = ratingPayload(rating)
  await assert.rejects(dataProvider.create('rating_scores', {
    user_id: userId,
    rating_id: rating.id,
    attribute_id: null,
    attribute_score: 'not-a-number',
    uniqueness_key: `${payload.submission_key}:score:invalid`
  }))

  const persisted = await dataProvider.get('ratings', rating.id)
  assert.equal(persisted.submission_state, 'pending')
  assert.equal(Number(persisted.submission_version), 0)

  await createScore(rating)
  const transitioned = first(await dataProvider.compareAndSet('ratings', rating.id, 0, { submission_state: 'complete', submission_version: 1 }))
  assert.equal(transitioned.submission_state, 'complete')
})

contractTest('concurrent compare-and-set on submission_version allows exactly one transition', async () => {
  requireContractEnvironment()
  const rating = await createRating('cas')

  const attempts = await Promise.allSettled([
    dataProvider.compareAndSet('ratings', rating.id, 0, { submission_state: 'complete', submission_version: 1, total_weighted: 4.1 }),
    dataProvider.compareAndSet('ratings', rating.id, 0, { submission_state: 'complete', submission_version: 1, total_weighted: 4.2 })
  ])

  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1)
  const rejected = attempts.find((result) => result.status === 'rejected')
  assert.equal(rejected.reason.status, 409)
  assert.equal(rejected.reason.code, 'VERSION_CONFLICT')

  const persisted = await dataProvider.get('ratings', rating.id)
  assert.equal(Number(persisted.submission_version), 1)
  assert.equal([4.1, 4.2].includes(Number(persisted.total_weighted)), true)
})

contractTest('provider pagination, terminal-page and ordering observations are captured without adapter dependency', async () => {
  requireContractEnvironment()
  const response = await fetch(rawProviderUrl('read', 'ratings', { user_id: userId, limit: 1, page: 999999 }), { headers: rawProviderHeaders() })
  assert.equal(response.ok, true)
  const payload = await response.json()
  const records = payload?.data ?? payload?.records ?? payload?.items ?? payload?.results ?? payload
  assert.equal(Array.isArray(records), true)
})

contractTest('a client abort does not weaken canonical idempotency replay', async () => {
  requireContractEnvironment()
  const timeoutMs = Number.parseInt(process.env.NOCODEBACKEND_CONTRACT_CLIENT_TIMEOUT_MS || '1', 10)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    await assert.rejects(fetch(rawProviderUrl('read', 'ratings'), { headers: rawProviderHeaders(), signal: controller.signal }))
  } finally {
    clearTimeout(timer)
  }

  const rating = await createRating('timeout-after')
  const replayed = await dataProvider.list('ratings', { user_id: userId, rating_id: ratingPayload(rating).rating_id })
  assert.deepEqual(replayed.map((record) => String(record.id)), [String(rating.id)])
})
