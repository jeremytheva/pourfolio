import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { validateCatalogueProducer } from './catalogueResponse.js'

const INVALID_PRODUCER_ID_MESSAGE = 'Producer identifier is invalid.'
const INVALID_PRODUCER_ID_CODE = 'invalid_producer_identifier'

export const normaliseCatalogueProducerId = (value) => {
  const identifier = typeof value === 'number'
    ? Number.isSafeInteger(value) && value > 0 ? String(value) : ''
    : value
  if (typeof identifier !== 'string' || identifier.length > 128 || !/^[1-9]\d*$/u.test(identifier)) {
    throw new ApiError(INVALID_PRODUCER_ID_MESSAGE, { status: 400, code: INVALID_PRODUCER_ID_CODE })
  }
  return identifier
}

export const producerService = {
  async getProducer(producerId) {
    const identifier = normaliseCatalogueProducerId(producerId)
    return validateCatalogueProducer(await apiRequest(`/catalog/producers/${identifier}`), {
      expectedProducerId: identifier
    })
  }
}

export const CATALOGUE_PRODUCER_ID_ERROR = Object.freeze({
  message: INVALID_PRODUCER_ID_MESSAGE,
  code: INVALID_PRODUCER_ID_CODE
})
