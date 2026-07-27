import { apiRequest } from '../lib/nocodeBackend.js'

export const cellarService = {
  getCellarItems() {
    return apiRequest('/cellar')
  },

  addCellarItem(item) {
    return apiRequest('/cellar', {
      method: 'POST',
      body: item
    })
  },

  updateCellarItem(id, updates) {
    return apiRequest(`/cellar/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates
    })
  },

  deleteCellarItem(id) {
    return apiRequest(`/cellar/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}
