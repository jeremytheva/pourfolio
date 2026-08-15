import { apiRequest } from '../lib/nocodeBackend.js'
import { validateCataloguePage, validateCatalogueProduct } from './catalogueResponse.js'

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
    return validateCatalogueProduct(await apiRequest(`/catalog/products/${encodeURIComponent(productId)}`))
  }
}
