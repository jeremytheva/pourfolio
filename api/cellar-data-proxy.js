import crypto from 'node:crypto'
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
  safeErrorMessage
} from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const normaliseList = (value) => asArray(value).filter((item) => item && typeof item === 'object')
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

const safeProviderGet = async (collection, id) => {
  try {
    return await dataProvider.get(collection, id)
  } catch {
    return null
  }
}

const hydrateProduct = async (product) => {
  if (!product) return null
  const [producer, category] = await Promise.all([
    product.producer_id && String(product.producer_id) !== '0'
      ? safeProviderGet(COLLECTIONS.producers, product.producer_id)
      : null,
    product.product_category_id ? safeProviderGet(COLLECTIONS.categories, product.product_category_id) : null
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
const pauseReadback = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const CELLAR_READBACK_ATTEMPTS = 6
// At most 4.75 seconds of deliberate waiting; leave room inside the client's
// 12-second timeout for authentication, provider requests and product hydration.
const cellarReadbackDelay = (attempt) => Math.min(250 * (2 ** attempt), 1_500)

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
  attempts = 1, wait = pauseReadback }) => {
  if (!/^[1-9]\d*$/.test(String(id ?? ''))) throw cellarPersistenceError()
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > CELLAR_READBACK_ATTEMPTS) throw cellarPersistenceError()
  let mismatchFields = []
  let readbackState = 'ABSENT'
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const stored = await provider.get(COLLECTIONS.cellar, id, { fresh: true })
    if (stored && (String(stored.id) !== String(id) || String(stored.user_id ?? '') !== String(userId))) {
      throw cellarPersistenceError()
    }
    mismatchFields = stored ? Object.entries(expected)
      .filter(([field, value]) => !matchesRequestedCellarValue(field, stored[field], value))
      .map(([field]) => field).sort() : []
    if (stored && mismatchFields.length === 0) return stored
    readbackState = stored ? 'MISMATCH' : 'ABSENT'
    if (attempt + 1 < attempts) await wait(cellarReadbackDelay(attempt))
  }
  throw cellarPersistenceError('CELLAR_PERSISTENCE_MISMATCH', { mismatchFields, readbackState, readbackAttempts: attempts })
}

export const verifyCellarRemoved = async ({ provider = dataProvider, id, userId,
  attempts = 1, wait = pauseReadback }) => {
  if (!/^[1-9]\d*$/.test(String(id ?? '')) || !Number.isSafeInteger(attempts) ||
      attempts < 1 || attempts > CELLAR_READBACK_ATTEMPTS) throw cellarPersistenceError('CELLAR_DELETE_NOT_VERIFIED')
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const persisted = await provider.get(COLLECTIONS.cellar, id, { fresh: true })
    if (persisted === null || persisted === undefined) return
    if (String(persisted.id) !== String(id) || userId !== undefined && String(persisted.user_id ?? '') !== String(userId)) {
      throw cellarPersistenceError('CELLAR_DELETE_NOT_VERIFIED')
    }
    if (attempt + 1 < attempts) await wait(cellarReadbackDelay(attempt))
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

const listCellar = async (response, user) => {
  const records = normaliseList(await dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }, { fresh: true }))
    .filter((record) => isOwnedBy(record, user.id))
  const productIds = [...new Set(records.map((record) => record.product_id).filter(Boolean).map(String))]
  const products = await Promise.all(productIds.map(async (id) => hydrateProduct(await safeProviderGet(COLLECTIONS.products, id))))
  const productsById = new Map(products.filter(Boolean).map((product) => [String(product.id), product]))
  response.status(200).json({
    items: records.map((record) => projectCellarRecord(record, productsById.get(String(record.product_id)) || null))
  })
}

const createCellar = async (request, response, user) => {
  const input = sanitiseCellarRequest(request.body || {})
  const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(input.product_id, 'Product identifier'))
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }
  const requested = {
    ...input,
    user_id: user.id,
    date_received: input.date_received || new Date().toISOString().slice(0, 10)
  }
  const created = firstRecord(await dataProvider.create(COLLECTIONS.cellar, requested))
  const stored = await verifyPersistedCellar({
    id: created?.id,
    userId: user.id,
    expected: requested,
    attempts: CELLAR_READBACK_ATTEMPTS
  })
  response.status(201).json({ item: projectCellarRecord(stored, await hydrateProduct(product)) })
}

const getOwnedCellarRecord = async (id, user) => {
  const record = await dataProvider.get(COLLECTIONS.cellar, parsePositiveId(id, 'Cellar identifier'), { fresh: true })
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

const updateCellar = async (id, request, response, user) => {
  const existing = await getOwnedCellarRecord(id, user)
  const updates = sanitiseCellarRequest(request.body || {}, { partial: true })
  if (updates.product_id !== undefined) {
    const requestedProduct = await dataProvider.get(COLLECTIONS.products, parsePositiveId(updates.product_id, 'Product identifier'))
    if (!requestedProduct) {
      response.status(404).json({ error: 'Product not found.' })
      return
    }
  }
  await dataProvider.update(COLLECTIONS.cellar, existing.id, updates)
  const stored = await verifyPersistedCellar({
    id: existing.id,
    userId: user.id,
    expected: { product_id: existing.product_id, ...updates },
    attempts: CELLAR_READBACK_ATTEMPTS
  })
  const product = await safeProviderGet(COLLECTIONS.products, stored.product_id)
  response.status(200).json({ item: projectCellarRecord(stored, await hydrateProduct(product)) })
}

const deleteCellar = async (id, response, user) => {
  const record = await getOwnedCellarRecord(id, user)
  await dataProvider.remove(COLLECTIONS.cellar, record.id)
  await verifyCellarRemoved({ id: record.id, userId: user.id, attempts: CELLAR_READBACK_ATTEMPTS })
  response.status(204).end()
}

export const routeCellarRequest = async (request, response, user) => {
  const [resource, id, action] = pathSegments(request)
  if (resource !== 'cellar' || action) {
    response.status(404).json({ error: 'Application data route not found.' })
    return
  }
  if (!id && request.method === 'GET') return listCellar(response, user)
  if (!id && request.method === 'POST') return createCellar(request, response, user)
  if (id && request.method === 'PUT') return updateCellar(id, request, response, user)
  if (id && request.method === 'DELETE') return deleteCellar(id, response, user)
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
  try {
    const user = await requireSessionUser(request)
    await routeCellarRequest(request, response, user)
  } catch (error) {
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
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
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

