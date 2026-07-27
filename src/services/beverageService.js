import { apiRequest } from '../lib/nocodeBackend.js'

export const beverageService = {
  getProducts({ search = '', page = 1, limit = 24 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    })
    if (search.trim()) params.set('q', search.trim())
    return apiRequest(`/catalog/products?${params}`)
  },

  getProduct(productId) {
    return apiRequest(`/catalog/products/${encodeURIComponent(productId)}`)
  }
}
