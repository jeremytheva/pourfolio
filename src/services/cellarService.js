import { apiRequest } from '../lib/nocodeBackend.js'

export const cellarService = {
  async getCellarItems() {
    const payload = await apiRequest('/read/cellar_items_pf2025')
    return { items: payload?.data || [] }
  },

  async addCellarItem(item) {
    const payload = await apiRequest('/create/cellar_items_pf2025', {
      method: 'POST',
      body: item
    })
    return { item: payload?.data || null }
  },

  async updateCellarItem(id, updates) {
    const payload = await apiRequest(`/update/cellar_items_pf2025/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates
    })
    return { item: payload?.data || null }
  },

  async deleteCellarItem(id) {
    await apiRequest(`/delete/cellar_items_pf2025/${encodeURIComponent(id)}`, { 
      method: 'DELETE' 
    })
    return { success: true }
  }
}