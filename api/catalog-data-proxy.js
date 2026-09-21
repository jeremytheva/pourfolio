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

const requiredRelationshipList = async (collection, filters) =>
  normaliseList(await dataProvider.list(collection, filters))

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
    ? await requiredRelationshipList(COLLECTIONS.productProducers, { 'product_id[in]': productIds.join(',') })
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

const readAllProviderRows = async (collection, { filters = {}, orderBy = 'id', order = 'asc', limit = 100 } = {}) => {
  const rows = []
  let page = 1
  while (true) {
    const providerPage = await dataProvider.listPage(collection, { page, limit, orderBy, order, filters })
    rows.push(...normaliseList(providerPage.items))
    if (page >= providerPage.totalPages) break
    page += 1
  }
  return rows
}

const chunk = (values, size = 75) => {
  const groups = []
  for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size))
  return groups
}

const producerMatchesSearch = (producer, search) => {
  if (!search) return true
  const needle = normaliseName(search)
  return [producer?.producer_name, producer?.address]
    .filter((value) => typeof value === 'string' && value.trim())
    .some((value) => normaliseName(value).includes(needle))
}

const producerAttributionCounts = async (producerIds) => {
  const ids = [...new Set(producerIds.map(String).filter((id) => /^[1-9]\d*$/.test(id)))]
  const counts = new Map(ids.map((id) => [id, new Set()]))
  if (!ids.length) return new Map()

  for (const producerChunk of chunk(ids)) {
    const producerFilter = { 'producer_id[in]': producerChunk.join(',') }
    const [canonicalRows, legacyProducts] = await Promise.all([
      readAllProviderRows(COLLECTIONS.productProducers, { filters: producerFilter }),
      readAllProviderRows(COLLECTIONS.products, { filters: producerFilter })
    ])

    const canonicalProductIds = new Set()
    for (const relationship of canonicalRows) {
      const producerId = String(relationship.producer_id ?? '')
      const productId = String(relationship.product_id ?? '')
      if (!counts.has(producerId) || !/^[1-9]\d*$/.test(productId)) continue
      counts.get(producerId).add(productId)
      canonicalProductIds.add(productId)
    }

    const legacyProductIds = legacyProducts
      .map((product) => String(product.id ?? ''))
      .filter((id) => /^[1-9]\d*$/.test(id))
    const relationshipProductIds = new Set()
    for (const productChunk of chunk(legacyProductIds)) {
      const rows = await readAllProviderRows(COLLECTIONS.productProducers, {
        filters: { 'product_id[in]': productChunk.join(',') }
      })
      rows.forEach((relationship) => {
        const productId = String(relationship.product_id ?? '')
        if (/^[1-9]\d*$/.test(productId)) relationshipProductIds.add(productId)
      })
    }

    for (const product of legacyProducts) {
      const productId = String(product.id ?? '')
      const producerId = String(product.producer_id ?? '')
      if (!counts.has(producerId) || !/^[1-9]\d*$/.test(productId)) continue
      if (canonicalProductIds.has(productId) || relationshipProductIds.has(productId)) continue
      counts.get(producerId).add(productId)
    }
  }

  return new Map([...counts.entries()].map(([producerId, productIds]) => [producerId, productIds.size]))
}

const paginateProducerRows = (rows, page, limit) => {
  const total = rows.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
  if (page > Math.max(1, totalPages)) {
    const error = new Error('Producer page is out of range.')
    error.status = 400
    throw error
  }
  const start = (page - 1) * limit
  return {
    items: rows.slice(start, start + limit),
    page,
    pageSize: limit,
    total,
    totalPages
  }
}

const listProducers = async (request, response) => {
  const search = parseCatalogueSearch(request.query?.q)
  const page = Math.max(1, Number.parseInt(request.query?.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query?.limit, 10) || 50))
  const hasProducts = ['1', 'true'].includes(String(request.query?.hasProducts ?? '').trim().toLocaleLowerCase())

  if (!search && !hasProducts) {
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
    return
  }

  const producers = (await readAllProviderRows(COLLECTIONS.producers, {
    orderBy: 'producer_name',
    order: 'asc'
  }))
    .map(projectProducer)
    .filter((producer) => producerMatchesSearch(producer, search))
    .sort((left, right) => left.producer_name.localeCompare(right.producer_name) || Number(left.id) - Number(right.id))

  if (!hasProducts) {
    response.status(200).json(paginateProducerRows(producers, page, limit))
    return
  }

  const counts = await producerAttributionCounts(producers.map((producer) => producer.id))
  const verified = producers
    .map((producer) => ({ producer, productCount: counts.get(String(producer.id)) || 0 }))
    .filter(({ productCount }) => productCount > 0)
  response.status(200).json(paginateProducerRows(verified, page, limit))
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

const loadProducerProducts = async (producerId) => {
  const [relationships, legacyProducts] = await Promise.all([
    readAllProviderRows(COLLECTIONS.productProducers, { filters: { producer_id: producerId } }),
    readAllProviderRows(COLLECTIONS.products, {
      filters: { producer_id: producerId },
      orderBy: 'product_name',
      order: 'asc'
    })
  ])

  const relationshipProductIds = [...new Set(relationships
    .map((relationship) => String(relationship.product_id ?? ''))
    .filter((productId) => /^[1-9]\d*$/.test(productId)))]

  const relationshipProducts = []
  for (const productIds of chunk(relationshipProductIds)) {
    relationshipProducts.push(...await readAllProviderRows(COLLECTIONS.products, {
      filters: { 'id[in]': productIds.join(',') },
      orderBy: 'product_name',
      order: 'asc'
    }))
  }

  const combined = new Map()
  for (const product of [...legacyProducts, ...relationshipProducts]) {
    const productId = String(product?.id ?? '')
    if (/^[1-9]\d*$/.test(productId)) combined.set(productId, product)
  }

  const hydrated = await hydrateProducts([...combined.values()])
  return hydrated
    .filter((product) => product.producers.some((item) => String(item.id) === String(producerId)))
    .sort((left, right) => left.product_name.localeCompare(right.product_name) || Number(left.id) - Number(right.id))
}

const readProducerRatings = async (productIds) => {
  const ratingsById = new Map()
  for (const productChunk of chunk(productIds)) {
    const rows = await readAllProviderRows(COLLECTIONS.ratings, {
      filters: {
        'product_id[in]': productChunk.join(','),
        submission_state: 'complete'
      }
    })
    for (const rating of rows) {
      const ratingId = String(rating?.id ?? '')
      if (!/^[1-9]\d*$/.test(ratingId) || !isCompletedRating(rating)) continue
      ratingsById.set(ratingId, rating)
    }
  }
  return [...ratingsById.values()]
}

const averageCompletedTotals = (values) => {
  const totals = values.map(completedRatingTotal).filter((value) => value !== null)
  return {
    count: totals.length,
    average: totals.length
      ? Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(2))
      : null
  }
}

const topRatedProducerProducts = (ratings, products, limit = 3) => {
  const productsById = new Map(products.map((product) => [String(product.id), product]))
  const aggregates = new Map()

  for (const rating of ratings) {
    const productId = String(rating.product_id ?? '')
    const product = productsById.get(productId)
    const weighted = completedRatingTotal(rating.total_weighted)
    if (!product || weighted === null) continue
    const current = aggregates.get(productId) || { sum: 0, count: 0, product }
    current.sum += weighted
    current.count += 1
    aggregates.set(productId, current)
  }

  return [...aggregates.entries()]
    .map(([productId, aggregate]) => ({
      productId,
      productName: aggregate.product.product_name,
      averageWeighted: Number((aggregate.sum / aggregate.count).toFixed(2)),
      ratingCount: aggregate.count
    }))
    .sort((left, right) =>
      right.averageWeighted - left.averageWeighted ||
      right.ratingCount - left.ratingCount ||
      left.productName.localeCompare(right.productName) ||
      Number(left.productId) - Number(right.productId))
    .slice(0, limit)
}

const buildCoreAttributeStats = async (ratings) => {
  const ratingIds = ratings
    .map((rating) => String(rating.id ?? ''))
    .filter((id) => /^[1-9]\d*$/.test(id))
  if (!ratingIds.length) return []

  const [attributes, scoreRows] = await Promise.all([
    safeRelationshipList(COLLECTIONS.ratingAttributes),
    Promise.all(chunk(ratingIds).map((ratingChunk) =>
      readAllProviderRows(COLLECTIONS.ratingScores, {
        filters: { 'rating_id[in]': ratingChunk.join(',') }
      })))
      .then((groups) => groups.flat())
  ])

  const attributesById = new Map(attributes
    .map((attribute) => [String(attribute.id ?? ''), attribute])
    .filter(([id, attribute]) => /^[1-9]\d*$/.test(id) && ratingDimension(attribute.attribute_name)?.scored === true))

  const acceptedRatingIds = new Set(ratingIds)
  const scoreByRatingAttribute = new Map()
  for (const score of scoreRows) {
    const ratingId = String(score.rating_id ?? '')
    const attributeId = String(score.attribute_id ?? '')
    const attribute = attributesById.get(attributeId)
    const dimension = ratingDimension(attribute?.attribute_name)
    const value = Number(score.attribute_score)
    const min = dimension?.min ?? 1
    if (!acceptedRatingIds.has(ratingId) || !dimension?.scored ||
        !Number.isFinite(value) || value < min || value > dimension.max) continue

    const key = `${ratingId}:${attributeId}`
    const existing = scoreByRatingAttribute.get(key)
    if (!existing || Number(score.id || 0) > Number(existing.id || 0)) scoreByRatingAttribute.set(key, score)
  }

  const aggregates = new Map()
  for (const score of scoreByRatingAttribute.values()) {
    const attributeId = String(score.attribute_id)
    const current = aggregates.get(attributeId) || { sum: 0, count: 0 }
    current.sum += Number(score.attribute_score)
    current.count += 1
    aggregates.set(attributeId, current)
  }

  return [...aggregates.entries()]
    .map(([attributeId, aggregate]) => ({
      attributeId,
      name: String(attributesById.get(attributeId).attribute_name).trim(),
      average: Number((aggregate.sum / aggregate.count).toFixed(2)),
      count: aggregate.count
    }))
    .sort((left, right) => {
      const leftDimension = ratingDimension(left.name)
      const rightDimension = ratingDimension(right.name)
      const order = ['appearance', 'aroma', 'mouthfeel', 'flavour', 'follow', 'bonus']
      return order.indexOf(leftDimension.key) - order.indexOf(rightDimension.key)
    })
}

const buildProducerProductStats = (ratings, products) => {
  const accepted = ratings.filter(isCompletedRating)
  const byProduct = new Map(products.map((product) => [String(product.id), []]))
  for (const rating of accepted) {
    const productRatings = byProduct.get(String(rating.product_id ?? ''))
    if (productRatings) productRatings.push(rating)
  }
  return products.map((product) => {
    const productRatings = byProduct.get(String(product.id)) || []
    const weighted = averageCompletedTotals(productRatings.map((rating) => rating.total_weighted))
    return {
      productId: String(product.id),
      ratingCount: weighted.count,
      averageWeighted: weighted.average
    }
  })
}

const buildProducerRatingStats = async ({ ratings, products, includeAttributes = false, includeCatalogueCount = false }) => {
  const productIds = new Set(products.map((product) => String(product.id)))
  const accepted = ratings.filter((rating) =>
    productIds.has(String(rating.product_id ?? '')) && isCompletedRating(rating))
  const weighted = averageCompletedTotals(accepted.map((rating) => rating.total_weighted))
  const unweighted = averageCompletedTotals(accepted.map((rating) => rating.total_unweighted))
  const result = {
    ratingCount: weighted.count,
    ratedBeerCount: new Set(accepted.map((rating) => String(rating.product_id))).size,
    averageWeighted: weighted.average,
    averageUnweighted: unweighted.average,
    unweightedRatingCount: unweighted.count,
    topBeers: topRatedProducerProducts(accepted, products)
  }
  if (includeCatalogueCount) result.catalogueBeerCount = products.length
  if (includeAttributes) result.attributes = await buildCoreAttributeStats(accepted)
  return result
}

const getProducer = async (id, response, user) => {
  const producerId = parsePositiveId(id, 'Producer identifier')
  const producer = await dataProvider.get(COLLECTIONS.producers, producerId)
  if (!producer) {
    response.status(404).json({ error: 'Producer not found.' })
    return
  }

  const products = await loadProducerProducts(producerId)
  const productIds = products.map((product) => String(product.id))
  const communityRatings = productIds.length ? await readProducerRatings(productIds) : []
  const personalRatings = communityRatings.filter((rating) => String(rating.user_id ?? '') === String(user.id))

  const [communityStats, personalStats] = await Promise.all([
    buildProducerRatingStats({
      ratings: communityRatings,
      products,
      includeAttributes: true,
      includeCatalogueCount: true
    }),
    buildProducerRatingStats({
      ratings: personalRatings,
      products
    })
  ])

  response.status(200).json({
    producer: projectProducer(producer),
    products,
    communityStats,
    personalStats,
    productStats: products.map((product) => {
      const community = buildProducerProductStats(communityRatings, [product])[0]
      const personal = buildProducerProductStats(personalRatings, [product])[0]
      return {
        productId: String(product.id),
        community: {
          ratingCount: community.ratingCount,
          averageWeighted: community.averageWeighted
        },
        personal: {
          ratingCount: personal.ratingCount,
          averageWeighted: personal.averageWeighted
        }
      }
    })
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
  if (resource === 'catalog' && id === 'producers' && action && request.method === 'GET') return getProducer(action, response, user)
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
  requiredRelationshipList,
  isCompletedRating,
  buildRatingInsights,
  listProducers,
  readAllProviderRows,
  producerMatchesSearch,
  producerAttributionCounts,
  paginateProducerRows,
  getProduct,
  loadProducerProducts,
  readProducerRatings,
  averageCompletedTotals,
  topRatedProducerProducts,
  buildCoreAttributeStats,
  buildProducerRatingStats,
  buildProducerProductStats,
  getProducer,
  getRatingForm,
  resolveProducerForCreate,
  resolveProducerSelection,
  exactProductDuplicate,
  verifyProductProducerRows,
  persistProductProducerRows,
  createProduct
}
