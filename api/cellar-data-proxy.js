import crypto from 'node:crypto'
import { COLLECTIONS } from '../src/data/contract.js'
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

const hydrateProduct = async (product) => {
  if (!product) return null
  const [producer, category] = await Promise.all([
    product.producer_id ? dataProvider.get(COLLECTIONS.producers, product.producer_id) : null,
    product.product_category_id ? dataProvider.get(COLLECTIONS.categories, product.product_category_id) : null
  ])
  return projectProduct(product, producer, category)
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
  gift: Boolean(record.gift),
  gift_from: record.gift_from ?? null,
  bet_id: record.bet_id ?? null,
  notes: record.notes ?? '',
  status: record.status ?? 'on_hand',
  quantity_acquired: record.quantity_acquired ?? null,
  date_consumed: record.date_consumed ?? null,
  acquisition_type: record.acquisition_type ?? null,
  historical_import: Boolean(record.historical_import),
  product
})

const listCellar = async (response, user) => {
  const records = normaliseList(await dataProvider.list(COLLECTIONS.cellar, { user_id: user.id }))
    .filter((record) => isOwnedBy(record, user.id))
  const productIds = [...new Set(records.map((record) => record.product_id).filter(Boolean).map(String))]
  const products = await Promise.all(productIds.map(async (id) => hydrateProduct(await dataProvider.get(COLLECTIONS.products, id))))
  const productsById = new Map(products.filter(Boolean).map((product) => [String(product.id), product]))
  response.status(200).json({
    items: records.map((record) => projectCellarRecord(record, productsById.get(String(record.product_id)) || null))
  })
}

const createCellar = async (request, response, user) => {
  const input = sanitiseCellarInput(request.body || {})
  const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(input.product_id, 'Product identifier'))
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }
  const created = firstRecord(await dataProvider.create(COLLECTIONS.cellar, {
    ...input,
    user_id: user.id,
    date_received: input.date_received || new Date().toISOString().slice(0, 10)
  }))
  response.status(201).json({ item: projectCellarRecord(created, await hydrateProduct(product)) })
}

const getOwnedCellarRecord = async (id, user) => {
  const record = await dataProvider.get(COLLECTIONS.cellar, parsePositiveId(id, 'Cellar identifier'))
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
  const updates = sanitiseCellarInput(request.body || {}, { partial: true })
  if (updates.product_id !== undefined) {
    const requestedProduct = await dataProvider.get(COLLECTIONS.products, parsePositiveId(updates.product_id, 'Product identifier'))
    if (!requestedProduct) {
      response.status(404).json({ error: 'Product not found.' })
      return
    }
  }
  const updated = firstRecord(await dataProvider.update(COLLECTIONS.cellar, existing.id, updates))
  const merged = { ...existing, ...updated }
  const product = await dataProvider.get(COLLECTIONS.products, merged.product_id)
  response.status(200).json({ item: projectCellarRecord(merged, await hydrateProduct(product)) })
}

const deleteCellar = async (id, response, user) => {
  const record = await getOwnedCellarRecord(id, user)
  await dataProvider.remove(COLLECTIONS.cellar, record.id)
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
      requestId: correlationId
    })
  }
}
