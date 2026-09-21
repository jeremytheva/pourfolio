import { ApiError } from '../lib/nocodeBackend.js'

const INVALID_MESSAGE = 'The server returned invalid producer catalogue data. Please try again.'
const INVALID_CODE = 'invalid_producer_catalogue_response'
const PAGE_KEYS = new Set(['items', 'page', 'pageSize', 'total', 'totalPages'])
const PRODUCER_KEYS = new Set(['id', 'producer_name', 'address', 'suburb_id'])
const DISCOVERY_ROW_KEYS = new Set(['producer', 'productCount'])
const RANKING_PAGE_KEYS = new Set(['items', 'page', 'pageSize', 'total', 'totalPages', 'minimumRatings', 'minimumRatedBeers'])
const RANKING_ROW_KEYS = new Set(['producer', 'averageWeighted', 'ratingCount', 'ratedBeerCount', 'catalogueBeerCount'])

const invalid = () => {
  throw new ApiError(INVALID_MESSAGE, { status: 502, code: INVALID_CODE })
}

const plainData = (value, allowedKeys, requiredKeys = []) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid()
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !allowedKeys.has(key))) invalid()
  if (requiredKeys.some((key) => !Object.hasOwn(descriptors, key))) invalid()
  return keys.reduce((result, key) => {
    const descriptor = descriptors[key]
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) invalid()
    result[key] = descriptor.value
    return result
  }, {})
}

const stableId = (value, { nullable = false } = {}) => {
  if ((value === null || value === '') && nullable) return null
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 1) invalid()
    return value
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/u.test(value) || value.length > 128) invalid()
  return value
}

const text = (value, { required = false, maxLength = 1000 } = {}) => {
  if ((value === null || value === undefined) && !required) return null
  if (typeof value !== 'string' || value.length > maxLength || [...value].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint < 32 || codePoint === 127
  })) invalid()
  if (required && !value.trim()) invalid()
  return value
}

const producer = (value) => {
  const data = plainData(value, PRODUCER_KEYS, ['id', 'producer_name'])
  const result = {
    id: stableId(data.id),
    producer_name: text(data.producer_name, { required: true, maxLength: 255 })
  }
  if (Object.hasOwn(data, 'address')) result.address = text(data.address, { maxLength: 1000 })
  if (Object.hasOwn(data, 'suburb_id')) result.suburb_id = stableId(data.suburb_id, { nullable: true })
  return Object.freeze(result)
}

const discoveryRow = (value) => {
  const data = plainData(value, DISCOVERY_ROW_KEYS, ['producer', 'productCount'])
  if (!Number.isSafeInteger(data.productCount) || data.productCount < 1) invalid()
  return Object.freeze({
    producer: producer(data.producer),
    productCount: data.productCount
  })
}

const rankingRow = (value) => {
  const data = plainData(value, RANKING_ROW_KEYS, ['producer', 'averageWeighted', 'ratingCount', 'ratedBeerCount', 'catalogueBeerCount'])
  if (typeof data.averageWeighted !== 'number' || !Number.isFinite(data.averageWeighted) || data.averageWeighted <= 0 || data.averageWeighted > 5) invalid()
  for (const key of ['ratingCount', 'ratedBeerCount', 'catalogueBeerCount']) {
    if (!Number.isSafeInteger(data[key]) || data[key] < 1) invalid()
  }
  if (data.ratedBeerCount > data.catalogueBeerCount || data.ratedBeerCount > data.ratingCount) invalid()
  return Object.freeze({
    producer: producer(data.producer),
    averageWeighted: data.averageWeighted,
    ratingCount: data.ratingCount,
    ratedBeerCount: data.ratedBeerCount,
    catalogueBeerCount: data.catalogueBeerCount
  })
}

export const validateProducerRankingPage = (payload, { expectedPage, expectedPageSize } = {}) => {
  const page = plainData(payload, RANKING_PAGE_KEYS, ['items', 'page', 'pageSize', 'total', 'totalPages', 'minimumRatings', 'minimumRatedBeers'])
  if (!Array.isArray(page.items)) invalid()
  for (const value of [page.page, page.pageSize, page.total, page.totalPages, page.minimumRatings, page.minimumRatedBeers]) {
    if (!Number.isSafeInteger(value)) invalid()
  }
  if (page.page < 1 || page.pageSize < 1 || page.pageSize > 100 || page.total < 0 || page.totalPages < 0 || page.minimumRatings < 1 || page.minimumRatedBeers < 1) invalid()
  if ((expectedPage !== undefined && page.page !== expectedPage) || (expectedPageSize !== undefined && page.pageSize !== expectedPageSize)) invalid()
  const expectedTotalPages = page.total === 0 ? 0 : Math.ceil(page.total / page.pageSize)
  if (page.totalPages !== expectedTotalPages || page.page > Math.max(1, page.totalPages)) invalid()
  const expectedItems = page.total === 0 ? 0 : page.page < page.totalPages ? page.pageSize : page.total - (page.pageSize * (page.totalPages - 1))
  if (page.items.length !== expectedItems) invalid()
  const items = page.items.map(rankingRow)
  if (new Set(items.map((item) => String(item.producer.id))).size !== items.length) invalid()
  if (items.some((item) => item.ratingCount < page.minimumRatings || item.ratedBeerCount < page.minimumRatedBeers)) invalid()
  return Object.freeze({
    items: Object.freeze(items),
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
    totalPages: page.totalPages,
    minimumRatings: page.minimumRatings,
    minimumRatedBeers: page.minimumRatedBeers
  })
}

export const validateCatalogueProducerPage = (payload, { expectedPage, expectedPageSize, includeProductCount = false } = {}) => {
  const page = plainData(payload, PAGE_KEYS, ['items', 'page', 'pageSize', 'total', 'totalPages'])
  if (!Array.isArray(page.items)) invalid()
  for (const value of [page.page, page.pageSize, page.total, page.totalPages]) {
    if (!Number.isSafeInteger(value)) invalid()
  }
  if (page.page < 1 || page.pageSize < 1 || page.pageSize > 100 || page.total < 0 || page.totalPages < 0) invalid()
  if ((expectedPage !== undefined && page.page !== expectedPage) ||
      (expectedPageSize !== undefined && page.pageSize !== expectedPageSize)) invalid()
  const expectedTotalPages = page.total === 0 ? 0 : Math.ceil(page.total / page.pageSize)
  if (page.totalPages !== expectedTotalPages || page.page > Math.max(1, page.totalPages)) invalid()
  const expectedItems = page.total === 0
    ? 0
    : page.page < page.totalPages
      ? page.pageSize
      : page.total - (page.pageSize * (page.totalPages - 1))
  if (page.items.length !== expectedItems) invalid()

  const items = includeProductCount ? page.items.map(discoveryRow) : page.items.map(producer)
  const ids = new Set(items.map((item) => String(includeProductCount ? item.producer.id : item.id)))
  if (ids.size !== items.length) invalid()
  return Object.freeze({
    items: Object.freeze(items),
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
    totalPages: page.totalPages
  })
}

export const PRODUCER_PAGE_RESPONSE_ERROR = Object.freeze({
  message: INVALID_MESSAGE,
  code: INVALID_CODE
})
