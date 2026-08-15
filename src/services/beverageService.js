import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { validateCataloguePage, validateCatalogueProduct } from './catalogueResponse.js'

const INVALID_PRODUCT_ID_MESSAGE = 'Product identifier is invalid.'
const INVALID_PRODUCT_ID_CODE = 'invalid_product_identifier'

export const normaliseCatalogueProductId = (value) => {
  const identifier = typeof value === 'number'
    ? Number.isSafeInteger(value) && value > 0 ? String(value) : ''
    : value
  if (typeof identifier !== 'string' || identifier.length > 128 || !/^[1-9]\d*$/u.test(identifier)) {
    throw new ApiError(INVALID_PRODUCT_ID_MESSAGE, { status: 400, code: INVALID_PRODUCT_ID_CODE })
  }
  return identifier
}

export const beverageService = {
  async getProducts({ search = '', page = 1, limit = 24 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    })
    if (search.trim()) params.set('q', search.trim())
    return validateCataloguePage(await apiRequest(`/catalog/products?${params}`), {
      expectedPage: page,
      expectedPageSize: limit
    })
  },

  async getProduct(productId) {
    const identifier = normaliseCatalogueProductId(productId)
    return validateCatalogueProduct(await apiRequest(`/catalog/products/${identifier}`), {
      expectedProductId: identifier
    })
  }
}

export const CATALOGUE_PRODUCT_ID_ERROR = Object.freeze({
  message: INVALID_PRODUCT_ID_MESSAGE,
  code: INVALID_PRODUCT_ID_CODE
})
