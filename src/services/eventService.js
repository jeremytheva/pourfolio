import { nocodeBackend } from '../lib/nocodeBackend'

const EVENTS = 'events_pf2025'

export const eventService = {
  async getEvents(filters = {}) {
    return nocodeBackend.list(EVENTS, {
      filters: { type: filters.type, beverage_category: filters.beverage_category },
      search: filters.search ? { term: filters.search, fields: ['name', 'description'] } : undefined,
      orderBy: 'start_date',
      ascending: true
    })
  },

  async getEvent(id) {
    return nocodeBackend.get(EVENTS, id)
  },

  async addEvent(eventData) {
    return nocodeBackend.create(EVENTS, eventData)
  },

  async updateEvent(id, updates) {
    return nocodeBackend.update(EVENTS, id, updates)
  }
}
