import crypto from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import {
  buildCompletedRatingDistribution,
  completedRatingTotal
} from '../src/lib/completedRatingContract.js'
import { canonicalRatingKey, ratingDimension } from '../src/lib/ratingFormulaV1.js'
import { requireSessionUser } from './_lib/authSession.js'
import { loadBonusCatalogue } from './_lib/bonusAttributeCatalogue.js'
import { dataProvider } from './_lib/dataProvider.js'
import {
  CATEGORY_FIELDS,
  PRODUCT_FIELDS,
  PRODUCER_FIELDS,
  projectAttribute,
  sanitiseProductCreateInput
} from './_lib/dataPolicy.js'
import { pickFields } from '../src/data/contract.js'
import {
  enforceOrigin,
  enforceRateLimit,
  enforceRequestSize,
  safeErrorMessage
} from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const ALLOWED_METHODS = new Set(['GET', 'POST'])
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])
const normaliseList = (value) => asArray(value).filter((item) => item && typeof item === 'object')
const first = (value) => (Array.isArray(value) ? value[0] || null : value || null)
const indexById = (records) => new Map(records.map((record) => [String(record.id), record]))
const normaliseName = (value) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/gu, ' ')

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

const safeRelationshipList = async (collection, filters) => {
  try {
    return normaliseList(await dataProvider.list(collection, filters))
  } catch {
    return []
  }
}

const hydrateProducts = async (products) => {
  if (!products.length) return []
  const producerIds = new Set()
  const categoryIds = new Set()
  for (const product of products) {
    if (product.producer_id && String(product.producer_id) !== '0') producerIds.add(String(product.producer_id))
    if (product.product_category_id) categoryIds.add(String(product.product_category_id))
  }
  const [producers, categories] = await Promise.all([
    producerIds.size ? safeRelationshipList(COLLECTIONS.producers, { 'id[in]': [...producerIds].join(',') }) : [],
    categoryIds.size ? safeRelationshipList(COLLECTIONS.categories, { 'id[in]': [...categoryIds].join(',') }) : []
  ])
  const producersById = indexById(producers)
  const categoriesById = indexById(categories)
  return products.map((product) => {
    const primary = product.producer_id && String(product.producer_id) !== '0'
      ? producersById.get(String(product.producer_id)) || null
      : null
    const projectedProducer = projectProducer(primary)
    return {
      ...pickFields(product, PRODUCT_FIELDS),
      producer: projectedProducer,
      producers: projectedProducer ? [projectedProducer] : [],
      category: projectCategory(categoriesById.get(String(product.product_category_id)))
    }
  })
}

const isCompletedRating = (rating) =>
  rating?.submission_state === 'complete' && completedRatingTotal(rating?.total_weighted) !== null

const buildRatingInsights = async (ratings) => {
  const acceptedRatings = ratings
    .filter(isCompletedRating)
    .map((rating) => ({ id: String(rating.id ?? ''), total: completedRatingTotal(rating.total_weighted) }))
    .filter((rating) => /^[1-9]\d*$/.test(rating.id))
  const distribution = buildCompletedRatingDistribution(acceptedRatings.map((rating) => rating.total))
  if (!acceptedRatings.length) return { distribution, attributes: [] }

  const ratingIds = new Set(acceptedRatings.map((rating) => rating.id))
  const [scores, attributes] = await Promise.all([
    safeRelationshipList(COLLECTIONS.ratingScores, { 'rating_id[in]': [...ratingIds].join(',') }),
    safeRelationshipList(COLLECTIONS.ratingAttributes)
  ])
  const attributesById = new Map(attributes
    .filter((attribute) => /^[1-9]\d*$/.test(String(attribute.id ?? '')) && canonicalRatingKey(attribute.attribute_name))
    .map((attribute) => [String(attribute.id), attribute]))
  const aggregates = new Map()
  for (const score of scores) {
    const ratingId = String(score.rating_id ?? '')
    const attributeId = String(score.attribute_id ?? '')
    const attribute = attributesById.get(attributeId)
    const dimension = ratingDimension(attribute?.attribute_name)
    const value = Number(score.attribute_score)
    const min = dimension?.min ?? 1
    if (!ratingIds.has(ratingId) || !dimension || !Number.isInteger(value) || value < min || value > dimension.max) continue
    const current = aggregates.get(attributeId) || { sum: 0, count: 0 }
    current.sum += value
    current.count += 1
    aggregates.set(attributeId, current)
  }
  const attributeInsights = [...aggregates.entries()].map(([attributeId, aggregate]) => ({
    attributeId,
    name: String(attributesById.get(attributeId).attribute_name).trim(),
    average: Number((aggregate.sum / aggregate.count).toFixed(2)),
    count: aggregate.count
  })).sort((left, right) => left.name.localeCompare(right.name))
  return { distribution, attributes: attributeInsights }
}

const listProducts = async (request, response) => {
  const search = parseCatalogueSearch(request.query?.q)
  const page = Math.max(1, Number.parseInt(request.query?.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query?.limit, 10) || 24))
  const providerPage = await dataProvider.listPage(COLLECTIONS.products, {
    search: search || undefined, page, limit, orderBy: 'product_name', order: 'asc'
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
  const ratings = await safeRelationshipList(COLLECTIONS.ratings, {
    product_id: product.id,
    submission_state: 'complete'
  })
  const validRatings = ratings.filter(isCompletedRating)
  const totals = validRatings.map((rating) => completedRatingTotal(rating.total_weighted))
  const ratingInsights = await buildRatingInsights(validRatings)
  response.status(200).json({
    ...hydrated,
    ratingSummary: {
      count: totals.length,
      average: totals.length ? Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(2)) : null
    },
    ratingInsights,
    ratings: []
  })
}

const getProducer = async (id, response) => {
  const producerId = parsePositiveId(id, 'Producer identifier')
  const producer = await dataProvider.get(COLLECTIONS.producers, producerId)
  if (!producer) {
    response.status(404).json({ error: 'Producer not found.' })
    return
  }

  const relatedProducts = await safeRelationshipList(COLLECTIONS.products, { producer_id: producerId })
  const exactProducts = relatedProducts.filter((product) => String(product.producer_id ?? '') === producerId)
  const products = await hydrateProducts(exactProducts)

  response.status(200).json({
    producer: projectProducer(producer),
    products: products.filter((product) => product.producer && String(product.producer.id) === producerId)
  })
}

const providerWriteFailure = (message) => {
  const error = new Error(message)
  error.status = 502
  error.code = 'CATALOGUE_WRITE_FAILED'
  return error
}

const resolveProducerForCreate = async (input, userId) => {
  if (input.producer_id) {
    const producer = await dataProvider.get(COLLECTIONS.producers, input.producer_id)
    if (!producer || String(producer.id ?? '') !== String(input.producer_id)) {
      const error = new Error('Selected producer is not available.')
      error.status = 400
      error.code = 'PRODUCER_NOT_FOUND'
      throw error
    }
    return { producer, created: false }
  }

  const requestedName = normaliseName(input.new_producer.producer_name)
  const existing = normaliseList(await dataProvider.list(COLLECTIONS.producers))
    .find((producer) => normaliseName(producer.producer_name) === requestedName)
  if (existing) return { producer: existing, created: false }

  const producerPayload = {
    user_id: userId,
    producer_name: input.new_producer.producer_name,
    ...(input.new_producer.address ? { address: input.new_producer.address } : {})
  }
  const created = first(await dataProvider.create(COLLECTIONS.producers, producerPayload))
  const createdId = parsePositiveId(created?.id, 'Created producer identifier')
  const persisted = await dataProvider.get(COLLECTIONS.producers, createdId)
  if (!persisted || String(persisted.id ?? '') !== createdId ||
      normaliseName(persisted.producer_name) !== requestedName ||
      String(persisted.user_id ?? '') !== String(userId)) {
    throw providerWriteFailure('The producer could not be verified after creation.')
  }
  return { producer: persisted, created: true }
}

const exactProductDuplicate = (products, input, producerId) => {
  const targetName = normaliseName(input.product_name)
  const targetEdition = normaliseName(input.edition)
  return products.find((product) => (
    String(product.producer_id ?? '') === String(producerId) &&
    String(product.product_category_id ?? '') === String(input.product_category_id) &&
    normaliseName(product.product_name) === targetName &&
    normaliseName(product.edition) === targetEdition
  )) || null
}

const createProduct = async (request, response, user) => {
  let input
  try {
    input = sanitiseProductCreateInput(request.body)
  } catch (error) {
    if (!error.status) error.status = 400
    throw error
  }

  const category = await dataProvider.get(COLLECTIONS.categories, input.product_category_id)
  if (!category || String(category.id ?? '') !== String(input.product_category_id)) {
    const error = new Error('Selected beer style/category is not available.')
    error.status = 400
    error.code = 'CATEGORY_NOT_FOUND'
    throw error
  }

  const { producer, created: producerCreated } = await resolveProducerForCreate(input, user.id)
  const producerId = parsePositiveId(producer.id, 'Producer identifier')
  const producerProducts = normaliseList(await dataProvider.list(COLLECTIONS.products, { producer_id: producerId }))
  const duplicate = exactProductDuplicate(producerProducts, input, producerId)
  if (duplicate) {
    const error = new Error('This beer already exists for the selected producer, style and edition.')
    error.status = 409
    error.code = 'PRODUCT_ALREADY_EXISTS'
    error.payload = {
      error: error.message,
      code: error.code,
      existingProductId: duplicate.id
    }
    throw error
  }

  const productPayload = {
    user_id: user.id,
    product_name: input.product_name,
    product_category_id: input.product_category_id,
    producer_id: producerId,
    abv: input.abv,
    ibu: input.ibu,
    declared_category: input.declared_category,
    edition: input.edition,
    collaboration: input.collaboration,
    product_image: input.product_image
  }
  const created = first(await dataProvider.create(COLLECTIONS.products, productPayload))
  const createdId = parsePositiveId(created?.id, 'Created product identifier')
  const persisted = await dataProvider.get(COLLECTIONS.products, createdId)
  if (!persisted || String(persisted.id ?? '') !== createdId ||
      String(persisted.user_id ?? '') !== String(user.id) ||
      String(persisted.producer_id ?? '') !== producerId ||
      String(persisted.product_category_id ?? '') !== String(input.product_category_id) ||
      normaliseName(persisted.product_name) !== normaliseName(input.product_name)) {
    throw providerWriteFailure('The product could not be verified after creation.')
  }

  const projectedProducer = projectProducer(producer)
  response.status(201).json({
    product: {
      ...pickFields(persisted, PRODUCT_FIELDS),
      producer: projectedProducer,
      producers: projectedProducer ? [projectedProducer] : [],
      category: projectCategory(category)
    },
    producerCreated
  })
}

const getRatingForm = async (request, response, user) => {
  const productId = parsePositiveId(request.query?.product_id, 'Product identifier')
  const product = await dataProvider.get(COLLECTIONS.products, productId)
  if (!product) {
    response.status(404).json({ error: 'Product not found.' })
    return
  }
  const [hydratedProducts, attributes, bonusCatalogue] = await Promise.all([
    hydrateProducts([product]),
    dataProvider.list(COLLECTIONS.ratingAttributes),
    loadBonusCatalogue(user.id)
  ])
  response.status(200).json({
    product: hydratedProducts[0],
    attributes: normaliseList(attributes).filter((attribute) => canonicalRatingKey(attribute.attribute_name)).map(projectAttribute),
    bonusAttributes: bonusCatalogue.bonusAttributes,
    bonusCategories: bonusCatalogue.bonusCategories,
    bonusDefaultPointValue: bonusCatalogue.defaultPointValue
  })
}

export const routeCatalogueRequest = async (request, response, user) => {
  const [resource, id, action] = pathSegments(request)
  if (resource === 'catalog' && id === 'products' && !action && request.method === 'GET') return listProducts(request, response)
  if (resource === 'catalog' && id === 'products' && !action && request.method === 'POST') return createProduct(request, response, user)
  if (resource === 'catalog' && id === 'products' && action && request.method === 'GET') return getProduct(action, response)
  if (resource === 'catalog' && id === 'producers' && action && request.method === 'GET') return getProducer(action, response)
  if (resource === 'rating-form' && !id && request.method === 'GET') return getRatingForm(request, response, user)
  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')
  if (!ALLOWED_METHODS.has(request.method)) {
    response.setHeader('Allow', 'GET, POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  const writeRequest = request.method === 'POST'
  if (!enforceRateLimit(request, response, {
    key: writeRequest ? 'catalog-write' : 'data-read',
    limit: writeRequest ? 30 : 240
  })) return
  try {
    const user = await requireSessionUser(request)
    await routeCatalogueRequest(request, response, user)
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) {
      writeTelemetryError(runtimeTelemetry({
        route_template: '/api/nocodebackend/catalog/:resource', method: request.method,
        status_class: `${Math.floor(status / 100)}xx`,
        event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure', correlation_id: correlationId
      }))
    }
    response.status(status).json(error.payload || {
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
      code: error.code, requestId: correlationId
    })
  }
}

export const __testables = {
  hydrateProducts,
  safeRelationshipList,
  isCompletedRating,
  buildRatingInsights,
  getProduct,
  getProducer,
  getRatingForm,
  resolveProducerForCreate,
  exactProductDuplicate,
  createProduct
}
