import crypto from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { projectCellarWrite } from '../src/services/cellarWriteContract.js'
import { requireSessionUser } from './_lib/authSession.js'
import { dataProvider } from './_lib/dataProvider.js'
import {
  isOwnedBy,
  projectProduct,
  sanitiseCellarInput
} from './_lib/dataPolicy.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage,
  withTimeout
} from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE'])
const firstRecord = (value) => (Array.isArray(value) ? value[0] || null : value || null)

const pathSegments = (request) => {
  const raw = request.query?.path
  if (Array.isArray(raw)) return raw.map(String)
  if (!raw) return []
  return String(raw).split('/').filter(Boolean)
}

const parsePositiveId = (value, label = 'Record identifier') => {
  const text = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) {
    const error = new Error(`${label} is invalid.`)
    error.status = 400
    throw error
  }
  return text
}

const sanitiseCellarRequest = (input, options) => {
  try {
    // Apply the same provider-facing projection as the launch client. Gated
    // lookup fields may be absent/null in the domain but are not writable.
    return projectCellarWrite(sanitiseCellarInput(input, options), {
      requireProduct: !options?.partial,
      requireAtLeastOne: Boolean(options?.partial)
    })
  } catch (error) {
    if (!error.status) error.status = 400
    throw error
  }
}

const safeProviderGet = async (collection, id, options = {}) => {
  try {
    return await dataProvider.get(collection, id, options)
  } catch {
    options.signal?.throwIfAborted()
    return null
  }
}

const hydrateProduct = async (product, options = {}, readRecord = safeProviderGet) => {
  if (!product) return null
  const [producer, category] = await Promise.all([
    product.producer_id && String(product.producer_id) !== '0'
      ? readRecord(COLLECTIONS.producers, product.producer_id, options)
      : null,
    product.product_category_id ? readRecord(COLLECTIONS.categories, product.product_category_id, options) : null
  ])
  return projectProduct(product, producer, category)
}

const cellarPersistenceError = (code = 'CELLAR_PERSISTENCE_MISMATCH', details = {}) => {
  const error = new Error('The cellar change could not be verified.')
  error.status = 502
  error.code = code
  Object.assign(error, details)
  return error
}

const cellarFlag = (value) => value === true || value === 1 || value === '1' || value === 'true'
const pauseReadback = (ms, options = {}) => delay(ms, undefined, options)
const CELLAR_READBACK_ATTEMPTS = 6
// Share one deadline across auth, all provider calls, settlement and hydration.
// Return a safe uncertain outcome before the client's 12-second timeout.
const CELLAR_WRITE_TIMEOUT_MS = 10_000
const cellarReadbackDelay = (attempt) => Math.min(250 * (2 ** attempt), 1_500)
const freshReadOptions = (signal) => ({ fresh: true, ...(signal ? { signal } : {}) })

const matchesRequestedCellarValue = (field, actual, expected) => {
  if (expected === null) return actual === null || actual === undefined || actual === ''
  if (field === 'gift') {
    // Unknown provider values must not confirm that a requested false flag
    // persisted merely because the display projection treats them as false.
    return [true, false, 1, 0, '1', '0', 'true', 'false'].includes(actual) &&
      cellarFlag(actual) === cellarFlag(expected)
  }
  if (field === 'date_received') return typeof actual === 'string' && actual.slice(0, 10) === expected
  if (['quantity', 'mls', 'purchase_price', 'retail_price'].includes(field)) {
    return actual !== null && actual !== undefined && String(actual).trim() !== '' &&
      Number.isFinite(Number(actual)) && Number(actual) === expected
  }
  return String(actual ?? '') === String(expected)
}

// A provider write response can echo the request even if the row was not
// saved. Verify the persisted private record; never return a fabricated
// merged object as an acknowledged cellar mutation.
export const verifyPersistedCellar = async ({ provider = dataProvider, id, userId, expected,
  attempts = 1, wait = pauseReadback, signal }) => {
  if (!/^[1-9]\d*$/.test(String(id ?? ''))) throw cellarPersistenceError()
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > CELLAR_READBACK_ATTEMPTS) throw cellarPersistenceError()
  let mismatchFields = []
  let readbackState = 'ABSENT'
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    signal?.throwIfAborted()
    const stored = await provider.get(COLLECTIONS.cellar, id, freshReadOptions(signal))
    signal?.throwIfAborted()
    if (stored && (String(stored.id) !== String(id) || String(stored.user_id ?? '') !== String(userId))) {
      throw cellarPersistenceError()
    }
    mismatchFields = stored ? Object.entries(expected)
      .filter(([field, value]) => !matchesRequestedCellarValue(field, stored[field], value))
      .map(([field]) => field).sort() : []
    if (stored && mismatchFields.length === 0) return stored
    readbackState = stored ? 'MISMATCH' : 'ABSENT'
    if (attempt + 1 < attempts) await wait(cellarReadbackDelay(attempt), { signal })
  }
  throw cellarPersistenceError('CELLAR_PERSISTENCE_MISMATCH', { mismatchFields, readbackState, readbackAttempts: attempts })
}

export const verifyCellarRemoved = async ({ provider = dataProvider, id, userId,
  attempts = 1, wait = pauseReadback, signal }) => {
  if (!/^[1-9]\d*$/.test(String(id ?? '')) || !Number.isSafeInteger(attempts) ||
      attempts < 1 || attempts > CELLAR_READBACK_ATTEMPTS) throw cellarPersistenceError('CELLAR_DELETE_NOT_VERIFIED')
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    signal?.throwIfAborted()
    const persisted = await provider.get(COLLECTIONS.cellar, id, freshReadOptions(signal))
    signal?.throwIfAborted()
    if (persisted === null || persisted === undefined) return
    if (String(persisted.id) !== String(id) || userId !== undefined && String(persisted.user_id ?? '') !== String(userId)) {
      throw cellarPersistenceError('CELLAR_DELETE_NOT_VERIFIED')
    }
    if (attempt + 1 < attempts) await wait(cellarReadbackDelay(attempt), { signal })
  }
  throw cellarPersistenceError('CELLAR_DELETE_NOT_VERIFIED', { readbackState: 'PRESENT', readbackAttempts: attempts })
}

export const projectCellarRecord = (record, product = null) => ({
  id: record.id,
  product_id: record.product_id,
  location_id: record.location_id ?? null,
  quantity: record.quantity ?? 0,
  mls: record.mls ?? null,
  container: record.container ?? null,
  purchase_price: record.purchase_price ?? null,
  retail_price: record.retail_price ?? null,
  date_received: record.date_received ?? null,
  sharing_series_id: record.sharing_series_id ?? null,
  series_version_id: record.series_version_id ?? null,
  purchase_location_id: record.purchase_location_id ?? null,
  purchased_by_id: record.purchased_by_id ?? null,
  gift: cellarFlag(record.gift),
  gift_from: record.gift_from ?? null,
  bet_id: record.bet_id ?? null,
  notes: record.notes ?? '',
  product
})

const CELLAR_PAGE_SIZE = 100
const CELLAR_MAX_PAGES = 1000
const CELLAR_ENRICHMENT_TIMEOUT_MS = 5_000
const cellarReadError = () => Object.assign(new Error('The complete cellar could not be verified. Please try again.'), {
  status: 502, code: 'CELLAR_READ_UNVERIFIED'
})
const canonicalCellarId = value => {
  if (typeof value !== 'string' && !Number.isSafeInteger(value)) return null
  const id = String(value)
  return /^[1-9]\d*$/.test(id) ? id : null
}
// Canonical decimal strings preserve ordering even beyond Number's safe range.
const afterId = (id, previous) => previous === null || id.length > previous.length ||
  id.length === previous.length && id > previous

const readOwnerCellarRows = async (user, options) => {
  const rows = []
  const seen = new Set()
  let previousId = null
  let pagination = null
  for (let page = 1; page <= CELLAR_MAX_PAGES; page += 1) {
    options.signal?.throwIfAborted()
    const result = await dataProvider.listPage(COLLECTIONS.cellar, {
      page, limit: CELLAR_PAGE_SIZE, orderBy: 'id', order: 'asc', filters: { user_id: user.id }, fresh: true
    }, options)
    options.signal?.throwIfAborted()
    if (!Array.isArray(result?.items) || result.page !== page || result.pageSize !== CELLAR_PAGE_SIZE ||
        !Number.isSafeInteger(result.total) || result.total < 0 ||
        !Number.isSafeInteger(result.totalPages) || result.totalPages < 0 || result.totalPages > CELLAR_MAX_PAGES) {
      throw cellarReadError()
    }
    // Array-only provider responses have inferred totals which grow until the
    // terminal page. Exact advertised totals must remain stable across pages.
    const inferred = Object.hasOwn(result, 'totalIsEstimate')
    if (pagination && (pagination.inferred !== inferred || !inferred &&
        (pagination.total !== result.total || pagination.totalPages !== result.totalPages))) throw cellarReadError()
    pagination = { inferred, total: result.total, totalPages: result.totalPages }
    for (const row of result.items) {
      const id = canonicalCellarId(row?.id)
      if (!row || typeof row !== 'object' || Array.isArray(row) || !id || seen.has(id) || !afterId(id, previousId)) {
        throw cellarReadError()
      }
      seen.add(id)
      previousId = id
      if ((typeof row.user_id === 'string' || Number.isSafeInteger(row.user_id)) && isOwnedBy(row, user.id)) rows.push(row)
    }
    if (page >= Math.max(1, result.totalPages)) {
      if (seen.size !== result.total) throw cellarReadError()
      return rows
    }
  }
  throw cellarReadError()
}

const hydrateCellarProducts = async (records, options) => {
  const productIds = [...new Set(records.map(record => canonicalCellarId(record.product_id)).filter(Boolean))]
  const productsById = new Map()
  const reads = new Map()
  const readOnce = (collection, id, readOptions) => {
    const key = `${collection}:${id}`
    if (!reads.has(key)) reads.set(key, safeProviderGet(collection, id, readOptions))
    return reads.get(key)
  }
  if (!productIds.length) return productsById
  try {
    await withTimeout(async signal => {
      const readOptions = { fresh: true, signal }
      // Four products at a time; each has at most two parallel relationship
      // reads. Shared producer/category lookups are deduplicated for this request.
      for (let index = 0; index < productIds.length; index += 4) {
        signal.throwIfAborted()
        const products = await Promise.all(productIds.slice(index, index + 4).map(async id => {
          const product = await readOnce(COLLECTIONS.products, id, readOptions)
          signal.throwIfAborted()
          return hydrateProduct(product, readOptions, readOnce)
        }))
        for (const product of products.filter(Boolean)) productsById.set(String(product.id), product)
      }
    }, CELLAR_ENRICHMENT_TIMEOUT_MS, options.signal)
  } catch {
    options.signal?.throwIfAborted()
    // Optional metadata must not hide verified private cellar rows.
  }
  return productsById
}

const listCellar = async (response, user, options = {}) => {
  const records = await readOwnerCellarRows(user, options)
  const productsById = await hydrateCellarProducts(records, options)
  options.signal?.throwIfAborted()
  response.status(200).json({
    items: records.map((record) => projectCellarRecord(record, productsById.get(String(record.product_id)) || null))
  })
}

const createCellar = async (request, response, user, options = {}) => {
  const { signal } = options
  signal?.throwIfAborted()
  const input = sanitiseCellarRequest(request.body || {})
  const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(input.product_id, 'Product identifier'), options)
  signal?.throwIfAborted()
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }
  const requested = {
    ...input,
    user_id: user.id,
    date_received: input.date_received || new Date().toISOString().slice(0, 10)
  }
  const created = firstRecord(await dataProvider.create(COLLECTIONS.cellar, requested, options))
  const stored = await verifyPersistedCellar({
    id: created?.id,
    userId: user.id,
    expected: requested,
    attempts: CELLAR_READBACK_ATTEMPTS,
    signal
  })
  const hydrated = await hydrateProduct(product, options)
  signal?.throwIfAborted()
  response.status(201).json({ item: projectCellarRecord(stored, hydrated) })
}

const getOwnedCellarRecord = async (id, user, { signal } = {}) => {
  signal?.throwIfAborted()
  const record = await dataProvider.get(COLLECTIONS.cellar, parsePositiveId(id, 'Cellar identifier'), freshReadOptions(signal))
  signal?.throwIfAborted()
  if (!record) {
    const error = new Error('Cellar record not found.')
    error.status = 404
    throw error
  }
  if (!isOwnedBy(record, user.id)) {
    const error = new Error('You are not authorised to change this cellar record.')
    error.status = 403
    throw error
  }
  return record
}

const updateCellar = async (id, request, response, user, options = {}) => {
  const { signal } = options
  const existing = await getOwnedCellarRecord(id, user, options)
  const updates = sanitiseCellarRequest(request.body || {}, { partial: true })
  if (updates.product_id !== undefined) {
    const requestedProduct = await dataProvider.get(COLLECTIONS.products, parsePositiveId(updates.product_id, 'Product identifier'), options)
    signal?.throwIfAborted()
    if (!requestedProduct) {
      response.status(404).json({ error: 'Product not found.' })
      return
    }
  }
  signal?.throwIfAborted()
  await dataProvider.update(COLLECTIONS.cellar, existing.id, updates, options)
  const stored = await verifyPersistedCellar({
    id: existing.id,
    userId: user.id,
    expected: { product_id: existing.product_id, ...updates },
    attempts: CELLAR_READBACK_ATTEMPTS,
    signal
  })
  const product = await safeProviderGet(COLLECTIONS.products, stored.product_id, options)
  const hydrated = await hydrateProduct(product, options)
  signal?.throwIfAborted()
  response.status(200).json({ item: projectCellarRecord(stored, hydrated) })
}

const deleteCellar = async (id, response, user, options = {}) => {
  const { signal } = options
  const record = await getOwnedCellarRecord(id, user, options)
  await dataProvider.remove(COLLECTIONS.cellar, record.id, options)
  await verifyCellarRemoved({ id: record.id, userId: user.id, attempts: CELLAR_READBACK_ATTEMPTS, signal })
  signal?.throwIfAborted()
  response.status(204).end()
}

export const routeCellarRequest = async (request, response, user, options = {}) => {
  const [resource, id, action] = pathSegments(request)
  if (resource !== 'cellar' || action) {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }
  if (!id && request.method === 'GET') return listCellar(response, user, options)
  if (!id && request.method === 'POST') return createCellar(request, response, user, options)
  if (id && request.method === 'PUT') return updateCellar(id, request, response, user, options)
  if (id && request.method === 'DELETE') return deleteCellar(id, response, user, options)
  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')
  if (!ALLOWED_METHODS.has(request.method)) {
    response.setHeader('Allow', [...ALLOWED_METHODS].join(', '))
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, {
    key: request.method === 'GET' ? 'data-read' : 'data-write',
    limit: request.method === 'GET' ? 240 : 60
  })) return
  const isMutation = request.method !== 'GET'
  let requestSignal
  try {
    const run = async (signal) => {
      requestSignal = signal
      const options = signal ? { signal } : {}
      const user = await requireSessionUser(request, options)
      await routeCellarRequest(request, response, user, options)
    }
    if (isMutation) await withTimeout(run, CELLAR_WRITE_TIMEOUT_MS)
    else await run()
  } catch (cause) {
    const error = isMutation && (requestSignal?.aborted ||
        ['CELLAR_PERSISTENCE_MISMATCH', 'CELLAR_DELETE_NOT_VERIFIED'].includes(cause.code))
      ? Object.assign(new Error('The cellar change could not be confirmed. Reload your cellar and check it before making another change.'), {
        status: 502,
        code: 'CELLAR_WRITE_UNVERIFIED'
      })
      : cause
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) {
      writeTelemetryError(runtimeTelemetry({
        route_template: '/api/nocodebackend/cellar/:id',
        method: request.method,
        status_class: `${Math.floor(status / 100)}xx`,
        event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure',
        correlation_id: correlationId
      }))
    }
    response.status(status).json(error.payload || {
      error: error.code === 'CELLAR_WRITE_UNVERIFIED' || status < 500 && error.message ? error.message : safeErrorMessage(status),
      code: error.code,
      requestId: correlationId
    })
  }
}

export const __testables = {
  safeProviderGet,
  hydrateProduct,
  sanitiseCellarRequest,
  listCellar,
  updateCellar,
  createCellar,
  deleteCellar
}

