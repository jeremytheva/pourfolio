import { nocodeBackend } from '../lib/nocodeBackend'

const BEVERAGES = 'beverages_pf2025'
const PRODUCERS = 'producers_pf2025'
const RATINGS = 'ratings_pf2025'
const PROFILES = 'profiles'

const attachProducer = async (beverage) => {
  if (!beverage?.producer_id) return beverage
  const { data: producer } = await nocodeBackend.get(PRODUCERS, beverage.producer_id)
  return { ...beverage, producers_pf2025: producer ? { name: producer.name, location: producer.location, type: producer.type } : null }
}

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
    return { data: await Promise.all(data.map(attachProducer)), error: null }
  },

  async getBeverage(id) {
    const { data, error } = await nocodeBackend.get(BEVERAGES, id)
    if (error || !data) return { data, error }

    const beverage = await attachProducer(data)
    const { data: ratings } = await nocodeBackend.list(RATINGS, {
      filters: { beverage_id: id },
      orderBy: 'created_at',
      ascending: false
    })

    const hydratedRatings = await Promise.all((ratings || []).map(async (rating) => {
      const { data: profile } = await nocodeBackend.get(PROFILES, rating.user_id)
      return { ...rating, profiles: profile ? { name: profile.name, avatar_url: profile.avatar_url } : null }
    }))

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
