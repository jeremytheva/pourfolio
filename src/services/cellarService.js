import { apiRequest } from '../lib/nocodeBackend.js'
import { projectCellarWrite } from './cellarWriteContract.js'

export const cellarService = {
  getCellarItems() {
    return apiRequest('/cellar')
  },

  addCellarItem(item) {
    return apiRequest('/cellar', {
      method: 'POST',
      body: projectCellarWrite(item, { requireProduct: true })
    })
  },

  updateCellarItem(id, updates) {
    return apiRequest(`/cellar/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: projectCellarWrite(updates, { requireAtLeastOne: true })
    })
  },

  deleteCellarItem(id) {
    return apiRequest(`/cellar/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}
