import { nocodeBackend } from '../lib/nocodeBackend'
import { attachProducerToBeverage, attachProducersToBeverages, attachProfilesToRecords, COLLECTIONS } from './relationshipHelpers'

const BEVERAGES = COLLECTIONS.beverages
const RATINGS = COLLECTIONS.ratings

export const beverageService = {
  // NoCodeBackend does not support Supabase relational selects in a single collection call;
  // producer/rating/profile relationships are hydrated with follow-up collection requests.
  async getBeverages(filters = {}) {
    const { data, error } = await nocodeBackend.list(BEVERAGES, {
      filters: { type: filters.type, producer_id: filters.producer_id },
      search: filters.search ? { term: filters.search, fields: ['name', 'style'] } : undefined,
      orderBy: 'created_at',
      ascending: false
    })
    if (error) return { data, error }
    return { data: await attachProducersToBeverages(data), error: null }
  },

  async getBeverage(id) {
    const { data, error } = await nocodeBackend.get(BEVERAGES, id)
    if (error || !data) return { data, error }

    const beverage = await attachProducerToBeverage(data)
    const { data: ratings } = await nocodeBackend.list(RATINGS, {
      filters: { beverage_id: id },
      orderBy: 'created_at',
      ascending: false
    })

    const hydratedRatings = await attachProfilesToRecords(ratings || [])

    return { data: { ...beverage, ratings_pf2025: hydratedRatings }, error: null }
  },

  async addBeverage(beverageData) {
    return nocodeBackend.create(BEVERAGES, beverageData)
  },

  async updateBeverage(id, updates) {
    return nocodeBackend.update(BEVERAGES, id, updates)
  },

  async deleteBeverage(id) {
    return nocodeBackend.remove(BEVERAGES, id)
  }
}
