import { nocodeBackend } from '../lib/nocodeBackend'

const VENUES = 'venues_pf2025'

export const venueService = {
  async getVenues(filters = {}) {
    return nocodeBackend.list(VENUES, {
      filters: { type: filters.type },
      search: filters.search ? { term: filters.search, fields: ['name', 'city'] } : undefined,
      orderBy: 'name',
      ascending: true
    })
  },

  async getVenue(id) {
    return nocodeBackend.get(VENUES, id)
  },

  async addVenue(venueData) {
    return nocodeBackend.create(VENUES, venueData)
  },

  async updateVenue(id, updates) {
    return nocodeBackend.update(VENUES, id, updates)
  }
}
