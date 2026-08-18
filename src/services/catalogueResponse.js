import { ApiError } from '../lib/nocodeBackend.js'

const INVALID_CATALOGUE_MESSAGE = 'The server returned invalid catalogue data. Please try again.'
const INVALID_CATALOGUE_CODE = 'invalid_catalogue_response'

const PAGE_KEYS = new Set(['items', 'page', 'pageSize', 'total', 'totalPages'])
const PRODUCT_KEYS = new Set([
  'id',
  'product_name',
  'product_category_id',
  'producer_id',
  'abv',
  'ibu',
  'declared_category',
  'edition',
  'collaboration',
  'product_image',
  'producer',
  'category'
])
const DETAIL_KEYS = new Set([...PRODUCT_KEYS, 'ratingSummary', 'ratings'])
const PRODUCER_KEYS = new Set(['id', 'producer_name', 'address', 'suburb_id'])
const CATEGORY_KEYS = new Set(['id', 'category_name', 'parent_id'])
const RATING_SUMMARY_KEYS = new Set(['count', 'average'])
const DECIMAL_NUMBER = /^(?:\d+(?:\.\d+)?|\.\d+)$/u

class InvalidCatalogueResponse extends Error {}

const invalid = () => {
  throw new InvalidCatalogueResponse()
}

const hasControlCharacter = (value) => [...value].some((character) => {
  const codePoint = character.codePointAt(0)
  return codePoint < 32 || codePoint === 127
})

const readDataProperties = (value, allowedKeys, requiredKeys = []) => {
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

const validateText = (value, { required = false, maxLength = 500 } = {}) => {
  if (value === null && !required) return value
  if (typeof value !== 'string' || value.length > maxLength || hasControlCharacter(value)) invalid()
  if (required && !value.trim()) invalid()
  return value
}

const validateStableId = (value, { nullable = false, emptyAsNull = false } = {}) => {
  if (value === null && nullable) return value
  if (value === '' && nullable && emptyAsNull) return null
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 1) invalid()
    return value
  }
  if (typeof value !== 'string' || value.length > 128 || !/^[1-9]\d*$/u.test(value)) invalid()
  return value
}

const validateOptionalNumber = (value, { max }) => {
  if (value === null) return value
  if (value === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') invalid()
  if (typeof value === 'string' && (!DECIMAL_NUMBER.test(value) || !value.length)) invalid()
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > max) invalid()
  return value
}

const validateOptionalDisplayScalar = (value) => {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalid()
    return value
  }
  return validateText(value)
}

const validateImageUrl = (value) => {
  if (value === null || value === '') return value
  validateText(value, { maxLength: 2048 })
  if (value.startsWith('/') && !value.startsWith('//')) return value

  let url
  try {
    url = new URL(value)
  } catch {
    invalid()
  }
  if (url.protocol !== 'https:' || url.username || url.password) invalid()
  return value
}

const sameId = (left, right) => String(left) === String(right)

const validateProducer = (value) => {
  if (value === null) return null
  const producer = readDataProperties(value, PRODUCER_KEYS, ['id', 'producer_name'])
  const result = {
    id: validateStableId(producer.id),
    producer_name: validateText(producer.producer_name, { required: true })
  }
  if (Object.hasOwn(producer, 'address')) result.address = validateText(producer.address, { maxLength: 1000 })
  if (Object.hasOwn(producer, 'suburb_id')) {
    result.suburb_id = validateStableId(producer.suburb_id, { nullable: true, emptyAsNull: true })
  }
  return result
}

const validateCategory = (value) => {
  if (value === null) return null
  const category = readDataProperties(value, CATEGORY_KEYS, ['id', 'category_name'])
  const result = {
    id: validateStableId(category.id),
    category_name: validateText(category.category_name, { required: true })
  }
  if (Object.hasOwn(category, 'parent_id')) {
    result.parent_id = validateStableId(category.parent_id, { nullable: true, emptyAsNull: true })
  }
  return result
}

const validateProduct = (value, { detail = false } = {}) => {
  const product = readDataProperties(
    value,
    detail ? DETAIL_KEYS : PRODUCT_KEYS,
    ['id', 'product_name', 'producer', 'category', ...(detail ? ['ratingSummary'] : [])]
  )
  const result = {
    id: validateStableId(product.id),
    product_name: validateText(product.product_name, { required: true })
  }

  if (Object.hasOwn(product, 'product_category_id')) {
    result.product_category_id = validateStableId(product.product_category_id, { nullable: true, emptyAsNull: true })
  }
  if (Object.hasOwn(product, 'producer_id')) {
    result.producer_id = validateStableId(product.producer_id, { nullable: true, emptyAsNull: true })
  }
  if (Object.hasOwn(product, 'abv')) result.abv = validateOptionalNumber(product.abv, { max: 80 })
  if (Object.hasOwn(product, 'ibu')) result.ibu = validateOptionalNumber(product.ibu, { max: 10_000 })
  if (Object.hasOwn(product, 'declared_category')) result.declared_category = validateText(product.declared_category)
  if (Object.hasOwn(product, 'edition')) result.edition = validateText(product.edition)
  if (Object.hasOwn(product, 'collaboration')) {
    result.collaboration = validateOptionalDisplayScalar(product.collaboration)
  }
  if (Object.hasOwn(product, 'product_image')) result.product_image = validateImageUrl(product.product_image)

  result.producer = validateProducer(product.producer)
  result.category = validateCategory(product.category)
  if (result.producer && (!Object.hasOwn(result, 'producer_id') || result.producer_id === null ||
      !sameId(result.producer.id, result.producer_id))) invalid()
  if (result.category && (!Object.hasOwn(result, 'product_category_id') || result.product_category_id === null ||
      !sameId(result.category.id, result.product_category_id))) invalid()

  if (detail) {
    const summary = readDataProperties(product.ratingSummary, RATING_SUMMARY_KEYS, ['count', 'average'])
    if (!Number.isSafeInteger(summary.count) || summary.count < 0) invalid()
    if (summary.count === 0) {
      if (summary.average !== null) invalid()
    } else if (typeof summary.average !== 'number' || !Number.isFinite(summary.average) ||
        summary.average < 1 || summary.average > 7) invalid()
    result.ratingSummary = { count: summary.count, average: summary.average }

    if (Object.hasOwn(product, 'ratings') && (!Array.isArray(product.ratings) || product.ratings.length > 0)) invalid()
    result.ratings = []
  }

  return result
}

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const validate = (validator) => {
  try {
    return deepFreeze(validator())
  } catch {
    throw new ApiError(INVALID_CATALOGUE_MESSAGE, {
      status: 502,
      code: INVALID_CATALOGUE_CODE
    })
  }
}

export const validateCataloguePage = (payload, { expectedPage, expectedPageSize } = {}) => validate(() => {
  const page = readDataProperties(payload, PAGE_KEYS, ['items', 'page', 'pageSize', 'total', 'totalPages'])
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

  const items = page.items.map((item) => validateProduct(item))
  const identifiers = new Set(items.map((item) => String(item.id)))
  if (identifiers.size !== items.length) invalid()

  return {
    items,
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
    totalPages: page.totalPages
  }
})

export const validateCatalogueProduct = (payload, { expectedProductId } = {}) => validate(() => {
  const product = validateProduct(payload, { detail: true })
  if (expectedProductId !== undefined && !sameId(product.id, validateStableId(expectedProductId))) invalid()
  return product
})

export const CATALOGUE_RESPONSE_ERROR = Object.freeze({
  message: INVALID_CATALOGUE_MESSAGE,
  code: INVALID_CATALOGUE_CODE
})