import crypto from 'node:crypto'
import { COLLECTIONS } from '../src/data/contract.js'
import { requireSessionUser } from './_lib/authSession.js'
import { dataProvider } from './_lib/dataProvider.js'
import {
  CATEGORY_FIELDS,
  PRODUCT_FIELDS,
  PRODUCER_FIELDS,
  projectAttribute,
  projectBonus
} from './_lib/dataPolicy.js'
import { pickFields } from '../src/data/contract.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage
} from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const normaliseList = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const indexById = (records) => new Map(records.map((record) => [String(record.id), record]))

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

const parseCatalogueSearch = (value) => {
  const search = String(value || '').trim()
  if (search.length > 100 || [...search].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint < 32 || codePoint === 127
  })) {
    const error = new Error('Catalogue search is invalid.')
    error.status = 400
    throw error
  }
  return search
}

const projectProducer = (record) => pickFields(record, PRODUCER_FIELDS)
const projectCategory = (record) => pickFields(record, CATEGORY_FIELDS)

const loadProductProducerRows = async (productIds) => {
  try {
    const batches = await Promise.all(productIds.map((productId) =>
      dataProvider.list(COLLECTIONS.productProducers, { product_id: productId })
    ))
    return normaliseList(batches.flat())
  } catch (error) {
    if (error?.status === 404) return []
    throw error
  }
}

const hydrateProducts = async (products) => {
  const productIds = [...new Set(products.map((product) => String(product.id)))]
  const junctionRows = await loadProductProducerRows(productIds)
  const junctionByProduct = new Map()
  for (const row of junctionRows) {
    const productId = String(row.product_id)
    const existing = junctionByProduct.get(productId) || []
    existing.push(row)
    junctionByProduct.set(productId, existing)
  }

  const producerIds = new Set()
  const categoryIds = new Set()
  for (const product of products) {
    if (product.producer_id && String(product.producer_id) !== '0') producerIds.add(String(product.producer_id))
    if (product.product_category_id) categoryIds.add(String(product.product_category_id))
    for (const row of junctionByProduct.get(String(product.id)) || []) {
      if (row.producer_id) producerIds.add(String(row.producer_id))
    }
  }

  const [producers, categories] = await Promise.all([
    Promise.all([...producerIds].map((id) => dataProvider.get(COLLECTIONS.producers, id))),
    Promise.all([...categoryIds].map((id) => dataProvider.get(COLLECTIONS.categories, id)))
  ])
  const producersById = indexById(normaliseList(producers))
  const categoriesById = indexById(normaliseList(categories))

  return products.map((product) => {
    const rows = junctionByProduct.get(String(product.id)) || []
    const attributed = rows
      .slice()
      .sort((left, right) => Number(Boolean(right.is_primary)) - Number(Boolean(left.is_primary)) || Number(left.id || 0) - Number(right.id || 0))
      .map((row) => producersById.get(String(row.producer_id)))
      .filter(Boolean)

    const legacyPrimary = product.producer_id && String(product.producer_id) !== '0'
      ? producersById.get(String(product.producer_id)) || null
      : null
    if (!attributed.length && legacyPrimary) attributed.push(legacyPrimary)

    const primary = attributed.find((producer) => rows.some((row) =>
      String(row.producer_id) === String(producer.id) && Boolean(row.is_primary)
    )) || legacyPrimary || attributed[0] || null

    return {
      ...pickFields(product, PRODUCT_FIELDS),
      producer: projectProducer(primary),
      producers: attributed.map(projectProducer),
      category: projectCategory(categoriesById.get(String(product.product_category_id)))
    }
  })
}

const listProducts = async (request, response) => {
  const search = parseCatalogueSearch(request.query?.q)
  const page = Math.max(1, Number.parseInt(request.query?.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query?.limit, 10) || 24))
  const providerPage = await dataProvider.listPage(COLLECTIONS.products, {
    search: search || undefined,
    page,
    limit,
    orderBy: 'product_name',
    order: 'asc'
  })
  response.status(200).json({
    items: await hydrateProducts(normaliseList(providerPage.items)),
    page: providerPage.page,
    pageSize: providerPage.pageSize,
    total: providerPage.total,
    totalPages: providerPage.totalPages
  })
}

const getProduct = async (id, response) => {
  const product = await dataProvider.get(COLLECTIONS.products, parsePositiveId(id, 'Product identifier'))
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }
  const [hydrated] = await hydrateProducts([product])
  const ratings = normaliseList(await dataProvider.list(COLLECTIONS.ratings, { product_id: product.id, fields: 'total_weighted' }))
  const totals = ratings.map((rating) => Number(rating.total_weighted)).filter(Number.isFinite)
  response.status(200).json({
    ...hydrated,
    ratingSummary: {
      count: totals.length,
      average: totals.length ? Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(2)) : null
    },
    ratings: []
  })
}

const getRatingForm = async (request, response) => {
  const productId = parsePositiveId(request.query?.product_id, 'Product identifier')
  const product = await dataProvider.get(COLLECTIONS.products, productId)
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }
  const [hydratedProducts, attributes, bonuses] = await Promise.all([
    hydrateProducts([product]),
    dataProvider.list(COLLECTIONS.ratingAttributes),
    dataProvider.list(COLLECTIONS.bonusAttributes)
  ])
  response.status(200).json({
    product: hydratedProducts[0],
    attributes: normaliseList(attributes).filter((attribute) => Number(attribute.is_scored) === 1).map(projectAttribute),
    bonusAttributes: normaliseList(bonuses).map(projectBonus)
  })
}

export const routeCatalogueRequest = async (request, response) => {
  const [resource, id, action] = pathSegments(request)
  if (resource === 'catalog' && id === 'products' && !action) return listProducts(request, response)
  if (resource === 'catalog' && id === 'products' && action) return getProduct(action, response)
  if (resource === 'rating-form' && !id) return getRatingForm(request, response)
  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')
  if (!ALLOWED_METHODS.has(request.method)) {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, { key: 'data-read', limit: 240 })) return
  try {
    await requireSessionUser(request)
    await routeCatalogueRequest(request, response)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) {
      writeTelemetryError(runtimeTelemetry({
        route_template: '/api/nocodebackend/catalog/:resource',
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

export const __testables = { hydrateProducts, loadProductProducerRows }
