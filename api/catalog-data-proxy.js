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
import {
  buildProductProducerRows,
  sanitiseProductProducerInputs
} from './_lib/productProducerRelationships.js'
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

const relationshipSort = (left, right) => {
  const primaryDifference = Number(Boolean(Number(right.is_primary))) - Number(Boolean(Number(left.is_primary)))
  if (primaryDifference) return primaryDifference
  const leftOrder = Number.isFinite(Number(left.sort_order)) ? Number(left.sort_order) : Number.MAX_SAFE_INTEGER
  const rightOrder = Number.isFinite(Number(right.sort_order)) ? Number(right.sort_order) : Number.MAX_SAFE_INTEGER
  return leftOrder - rightOrder || Number(left.id || 0) - Number(right.id || 0)
}

const hydrateProducts = async (products) => {
  if (!products.length) return []
  const productIds = products
    .map((product) => String(product.id ?? ''))
    .filter((id) => /^[1-9]\d*$/.test(id))
  const relationships = productIds.length
    ? await safeRelationshipList(COLLECTIONS.productProducers, { 'product_id[in]': productIds.join(',') })
    : []
  const relationshipsByProduct = new Map()
  for (const relationship of relationships) {
    const productId = String(relationship.product_id ?? '')
    const producerId = String(relationship.producer_id ?? '')
    if (!productIds.includes(productId) || !/^[1-9]\d*$/.test(producerId)) continue
    const rows = relationshipsByProduct.get(productId) || []
    rows.push(relationship)
    relationshipsByProduct.set(productId, rows)
  }

  const producerIds = new Set()
  const categoryIds = new Set()
  for (const product of products) {
    const relationshipRows = relationshipsByProduct.get(String(product.id)) || []
    if (relationshipRows.length) {
      relationshipRows.forEach((relationship) => producerIds.add(String(relationship.producer_id)))
    } else if (product.producer_id && String(product.producer_id) !== '0') {
      producerIds.add(String(product.producer_id))
    }
    if (product.product_category_id) categoryIds.add(String(product.product_category_id))
  }

  const [producers, categories] = await Promise.all([
    producerIds.size ? safeRelationshipList(COLLECTIONS.producers, { 'id[in]': [...producerIds].join(',') }) : [],
    categoryIds.size ? safeRelationshipList(COLLECTIONS.categories, { 'id[in]': [...categoryIds].join(',') }) : []
  ])
  const producersById = indexById(producers)
  const categoriesById = indexById(categories)

  return products.map((product) => {
    const relationshipRows = [...(relationshipsByProduct.get(String(product.id)) || [])].sort(relationshipSort)
    const projectedProducers = relationshipRows
      .map((relationship) => projectProducer(producersById.get(String(relationship.producer_id))))
      .filter(Boolean)
    const uniqueProducers = [...new Map(projectedProducers.map((producer) => [String(producer.id), producer])).values()]

    let primary = uniqueProducers[0] || null
    if (relationshipRows.length) {
      const explicitPrimary = relationshipRows.find((relationship) => Number(relationship.is_primary) === 1)
      const compatibilityPrimary = relationshipRows.find((relationship) => String(relationship.producer_id) === String(product.producer_id ?? ''))
      const primaryId = String((explicitPrimary || compatibilityPrimary || relationshipRows[0])?.producer_id ?? '')
      primary = projectProducer(producersById.get(primaryId)) || primary
    } else if (product.producer_id && String(product.producer_id) !== '0') {
      primary = projectProducer(producersById.get(String(product.producer_id)))
      if (primary && !uniqueProducers.length) uniqueProducers.push(primary)
    }

    const projected = pickFields(product, PRODUCT_FIELDS)
    if (relationshipRows.length) projected.collaboration = uniqueProducers.length > 1 ? 1 : 0
    return {
      ...projected,
      producer: primary,
      producers: uniqueProducers,
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

const listProducers = async (request, response) => {
  const page = Math.max(1, Number.parseInt(request.query?.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query?.limit, 10) || 50))
  const providerPage = await dataProvider.listPage(COLLECTIONS.producers, {
    page, limit, orderBy: 'producer_name', order: 'asc'
  })
  response.status(200).json({
    items: normaliseList(providerPage.items).map(projectProducer),
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

  const [relationships, legacyProducts] = await Promise.all([
    safeRelationshipList(COLLECTIONS.productProducers, { producer_id: producerId }),
    safeRelationshipList(COLLECTIONS.products, { producer_id: producerId })
  ])
  const relationshipProductIds = [...new Set(relationships
    .map((relationship) => String(relationship.product_id ?? ''))
    .filter((productId) => /^[1-9]\d*$/.test(productId)))]
  const relationshipProducts = relationshipProductIds.length
    ? await safeRelationshipList(COLLECTIONS.products, { 'id[in]': relationshipProductIds.join(',') })
    : []
  const combined = new Map()
  for (const product of [...legacyProducts, ...relationshipProducts]) {
    if (product?.id !== undefined) combined.set(String(product.id), product)
  }
  const products = await hydrateProducts([...combined.values()])

  response.status(200).json({
    producer: projectProducer(producer),
    products: products.filter((product) => product.producers.some((item) => String(item.id) === producerId))
  })
}

const providerWriteFailure = (message) => {
  const error = new Error(message)
  error.status = 502
  error.code = 'CATALOGUE_WRITE_FAILED'
  return error
}

const providerCreatedId = (record, label) => {
  const text = String(record?.id ?? '').trim()
  if (!/^[1-9]\d*$/.test(text)) throw providerWriteFailure(`${label} did not return a record identifier.`)
  return text
}

const resolveProducerSelection = async (selection, userId) => {
  if (selection.producer_id) {
    const producer = await dataProvider.get(COLLECTIONS.producers, selection.producer_id)
    if (!producer || String(producer.id ?? '') !== String(selection.producer_id)) {
      const error = new Error('Selected producer is not available.')
      error.status = 400
      error.code = 'PRODUCER_NOT_FOUND'
      throw error
    }
    return { producer, created: false }
  }

  const requestedName = normaliseName(selection.new_producer.producer_name)
  const existing = normaliseList(await dataProvider.list(COLLECTIONS.producers))
    .find((producer) => normaliseName(producer.producer_name) === requestedName)
  if (existing) return { producer: existing, created: false }

  const producerPayload = {
    user_id: userId,
    producer_name: selection.new_producer.producer_name,
    ...(selection.new_producer.address ? { address: selection.new_producer.address } : {})
  }
  const created = first(await dataProvider.create(COLLECTIONS.producers, producerPayload))
  const createdId = providerCreatedId(created, 'Producer creation')
  const persisted = await dataProvider.get(COLLECTIONS.producers, createdId)
  if (!persisted || String(persisted.id ?? '') !== createdId ||
      normaliseName(persisted.producer_name) !== requestedName ||
      String(persisted.user_id ?? '') !== String(userId)) {
    throw providerWriteFailure('The producer could not be verified after creation.')
  }
  return { producer: persisted, created: true }
}

const resolveProducerForCreate = async (input, userId) => resolveProducerSelection({
  producer_id: input.producer_id,
  new_producer: input.new_producer
}, userId)

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

const verifyProductProducerRows = (rows, productId, producerIds) => {
  const expected = buildProductProducerRows(productId, producerIds)
  const actual = rows
    .filter((row) => String(row.product_id ?? '') === String(productId))
    .map((row) => ({
      product_id: String(row.product_id),
      producer_id: String(row.producer_id),
      is_primary: Number(row.is_primary) === 1 ? 1 : 0,
      sort_order: Number(row.sort_order)
    }))
    .sort((left, right) => left.sort_order - right.sort_order)
  return actual.length === expected.length && expected.every((row, index) => (
    actual[index]?.product_id === row.product_id &&
    actual[index]?.producer_id === row.producer_id &&
    actual[index]?.is_primary === row.is_primary &&
    actual[index]?.sort_order === row.sort_order
  ))
}

const persistProductProducerRows = async (productId, producerIds) => {
  const rows = buildProductProducerRows(productId, producerIds)
  try {
    for (const row of rows) await dataProvider.create(COLLECTIONS.productProducers, row)
    const persisted = normaliseList(await dataProvider.list(COLLECTIONS.productProducers, { product_id: String(productId) }))
    if (!verifyProductProducerRows(persisted, productId, producerIds)) {
      throw providerWriteFailure('Product producer relationships could not be verified after creation.')
    }
  } catch (error) {
    const persisted = await safeRelationshipList(COLLECTIONS.productProducers, { product_id: String(productId) })
    await Promise.allSettled(persisted
      .filter((row) => row.id !== undefined)
      .map((row) => dataProvider.remove(COLLECTIONS.productProducers, row.id)))
    await Promise.allSettled([dataProvider.remove(COLLECTIONS.products, productId)])
    if (error?.code === 'CATALOGUE_WRITE_FAILED') throw error
    throw providerWriteFailure('Product producer relationships could not be created.')
  }
}

const createProduct = async (request, response, user) => {
  let input
  let relationshipInputs
  try {
    input = sanitiseProductCreateInput(request.body)
    relationshipInputs = sanitiseProductProducerInputs(request.body, input)
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

  const requestedProducers = relationshipInputs || [{
    producer_id: input.producer_id,
    new_producer: input.new_producer
  }]
  const resolvedProducers = []
  let producersCreated = 0
  for (const selection of requestedProducers) {
    const resolved = await resolveProducerSelection(selection, user.id)
    const producerId = parsePositiveId(resolved.producer.id, 'Producer identifier')
    if (resolvedProducers.some((entry) => entry.id === producerId)) {
      const error = new Error('The same producer cannot be linked to a product more than once.')
      error.status = 400
      error.code = 'DUPLICATE_PRODUCT_PRODUCER'
      throw error
    }
    resolvedProducers.push({ id: producerId, producer: resolved.producer })
    if (resolved.created) producersCreated += 1
  }

  const primaryProducer = resolvedProducers[0]
  const producerProducts = normaliseList(await dataProvider.list(COLLECTIONS.products, { producer_id: primaryProducer.id }))
  const duplicate = exactProductDuplicate(producerProducts, input, primaryProducer.id)
  if (duplicate) {
    const error = new Error('This beer already exists for the selected primary producer, style and edition.')
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
    producer_id: primaryProducer.id,
    abv: input.abv,
    ibu: input.ibu,
    declared_category: input.declared_category,
    edition: input.edition,
    collaboration: relationshipInputs ? (resolvedProducers.length > 1 ? 1 : 0) : input.collaboration,
    product_image: input.product_image
  }
  const created = first(await dataProvider.create(COLLECTIONS.products, productPayload))
  const createdId = providerCreatedId(created, 'Product creation')
  const persisted = await dataProvider.get(COLLECTIONS.products, createdId)
  if (!persisted || String(persisted.id ?? '') !== createdId ||
      String(persisted.user_id ?? '') !== String(user.id) ||
      String(persisted.producer_id ?? '') !== primaryProducer.id ||
      String(persisted.product_category_id ?? '') !== String(input.product_category_id) ||
      normaliseName(persisted.product_name) !== normaliseName(input.product_name)) {
    throw providerWriteFailure('The product could not be verified after creation.')
  }

  if (relationshipInputs) await persistProductProducerRows(createdId, resolvedProducers.map((entry) => entry.id))
  const [hydrated] = await hydrateProducts([persisted])
  response.status(201).json({
    product: hydrated,
    producerCreated: producersCreated > 0,
    producersCreated
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
  if (resource === 'catalog' && id === 'producers' && !action && request.method === 'GET') return listProducers(request, response)
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
  listProducers,
  getProduct,
  getProducer,
  getRatingForm,
  resolveProducerForCreate,
  resolveProducerSelection,
  exactProductDuplicate,
  verifyProductProducerRows,
  persistProductProducerRows,
  createProduct
}
