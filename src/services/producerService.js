import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { validateCataloguePage, validateCatalogueProducer } from './catalogueResponse.js'

const INVALID_PRODUCER_ID_MESSAGE = 'Producer identifier is invalid.'
const INVALID_PRODUCER_ID_CODE = 'invalid_producer_identifier'
const VERIFIED_PRODUCER_PAGE_SIZE = 100

export const normaliseCatalogueProducerId = (value) => {
  const identifier = typeof value === 'number'
    ? Number.isSafeInteger(value) && value > 0 ? String(value) : ''
    : value
  if (typeof identifier !== 'string' || identifier.length > 128 || !/^[1-9]\d*$/u.test(identifier)) {
    throw new ApiError(INVALID_PRODUCER_ID_MESSAGE, { status: 400, code: INVALID_PRODUCER_ID_CODE })
  }
  return identifier
}

const verifiedProducerIndexFromProducts = (products) => {
  const producers = new Map()
  for (const product of products) {
    if (!product.producer || product.producer_id === null || product.producer_id === undefined) continue
    if (String(product.producer.id) !== String(product.producer_id)) continue
    const key = String(product.producer.id)
    const current = producers.get(key)
    if (current) {
      producers.set(key, Object.freeze({ ...current, productCount: current.productCount + 1 }))
      continue
    }
    producers.set(key, Object.freeze({ producer: product.producer, productCount: 1 }))
  }
  return Object.freeze([...producers.values()].sort((left, right) => {
    const byName = left.producer.producer_name.localeCompare(right.producer.producer_name)
    return byName || Number(left.producer.id) - Number(right.producer.id)
  }))
}

export const producerService = {
  async getProducer(producerId) {
    const identifier = normaliseCatalogueProducerId(producerId)
    return validateCatalogueProducer(await apiRequest(`/catalog/producers/${identifier}`), {
      expectedProducerId: identifier
    })
  },

  async listVerifiedProducers() {
    const products = []
    let page = 1
    let totalPages = 1
    do {
      const catalogue = validateCataloguePage(
        await apiRequest(`/catalog/products?page=${page}&limit=${VERIFIED_PRODUCER_PAGE_SIZE}`),
        { expectedPage: page, expectedPageSize: VERIFIED_PRODUCER_PAGE_SIZE }
      )
      products.push(...catalogue.items)
      totalPages = catalogue.totalPages
      page += 1
    } while (page <= totalPages)
    return verifiedProducerIndexFromProducts(products)
  }
}

export const CATALOGUE_PRODUCER_ID_ERROR = Object.freeze({
  message: INVALID_PRODUCER_ID_MESSAGE,
  code: INVALID_PRODUCER_ID_CODE
})

export const __testables = { verifiedProducerIndexFromProducts, VERIFIED_PRODUCER_PAGE_SIZE }
