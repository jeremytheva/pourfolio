import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { validateCatalogueProducer } from './catalogueResponse.js'
import { validateCatalogueProducerPage, validateProducerRankingPage } from './producerPageResponse.js'

const INVALID_PRODUCER_ID_MESSAGE = 'Producer identifier is invalid.'
const INVALID_PRODUCER_ID_CODE = 'invalid_producer_identifier'
const VERIFIED_PRODUCER_PAGE_SIZE = 50

export const normaliseCatalogueProducerId = (value) => {
  const identifier = typeof value === 'number'
    ? Number.isSafeInteger(value) && value > 0 ? String(value) : ''
    : value
  if (typeof identifier !== 'string' || identifier.length > 128 || !/^[1-9]\d*$/u.test(identifier)) {
    throw new ApiError(INVALID_PRODUCER_ID_MESSAGE, { status: 400, code: INVALID_PRODUCER_ID_CODE })
  }
  return identifier
}

const canonicalProducerRows = (producers) => Object.freeze(producers
  .map((producer) => Object.freeze({ producer }))
  .sort((left, right) => {
    const byName = left.producer.producer_name.localeCompare(right.producer.producer_name)
    return byName || Number(left.producer.id) - Number(right.producer.id)
  }))

export const producerService = {
  async getProducer(producerId) {
    const identifier = normaliseCatalogueProducerId(producerId)
    return validateCatalogueProducer(await apiRequest(`/catalog/producers/${identifier}`), {
      expectedProducerId: identifier
    })
  },

  async listCanonicalProducers() {
    const producers = []
    let page = 1
    while (true) {
      const catalogue = validateCatalogueProducerPage(
        await apiRequest(`/catalog/producers?page=${page}&limit=${VERIFIED_PRODUCER_PAGE_SIZE}`),
        { expectedPage: page, expectedPageSize: VERIFIED_PRODUCER_PAGE_SIZE }
      )
      producers.push(...catalogue.items)
      if (page >= catalogue.totalPages) break
      page += 1
    }
    return canonicalProducerRows(producers)
  },

  async listVerifiedProducerPage({ search = '', page = 1, limit = VERIFIED_PRODUCER_PAGE_SIZE } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      hasProducts: 'true'
    })
    if (String(search).trim()) params.set('q', String(search).trim())
    return validateCatalogueProducerPage(
      await apiRequest(`/catalog/producers?${params}`),
      { expectedPage: page, expectedPageSize: limit, includeProductCount: true }
    )
  },

  async listProducerRankingPage({ page = 1, limit = 24 } = {}) {
    return validateProducerRankingPage(
      await apiRequest(`/catalog/producers/rankings?page=${page}&limit=${limit}`),
      { expectedPage: page, expectedPageSize: limit }
    )
  },

  async listVerifiedProducers({ search = '' } = {}) {
    const producers = []
    let page = 1
    while (true) {
      const catalogue = await producerService.listVerifiedProducerPage({
        search,
        page,
        limit: VERIFIED_PRODUCER_PAGE_SIZE
      })
      producers.push(...catalogue.items)
      if (page >= catalogue.totalPages) break
      page += 1
    }
    return Object.freeze(producers)
  }
}

export const CATALOGUE_PRODUCER_ID_ERROR = Object.freeze({
  message: INVALID_PRODUCER_ID_MESSAGE,
  code: INVALID_PRODUCER_ID_CODE
})

export const __testables = {
  canonicalProducerRows,
  VERIFIED_PRODUCER_PAGE_SIZE
}
