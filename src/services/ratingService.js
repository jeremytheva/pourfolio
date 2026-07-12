import { nocodeBackend } from '../lib/nocodeBackend'

const RATINGS = 'ratings_pf2025'
const BEVERAGES = 'beverages_pf2025'
const PRODUCERS = 'producers_pf2025'
const PROFILES = 'profiles'

const attachBeverage = async (rating) => {
  if (!rating?.beverage_id) return rating
  const { data: beverage } = await nocodeBackend.get(BEVERAGES, rating.beverage_id)
  if (!beverage) return { ...rating, beverages_pf2025: null }

  let producer = null
  if (beverage.producer_id) {
    const { data } = await nocodeBackend.get(PRODUCERS, beverage.producer_id)
    producer = data ? { name: data.name } : null
  }

  return {
    ...rating,
    beverages_pf2025: {
      name: beverage.name,
      style: beverage.style,
      type: beverage.type,
      producer_id: beverage.producer_id,
      producers_pf2025: producer
    }
  }
}

const attachProfile = async (rating) => {
  const { data: profile } = await nocodeBackend.get(PROFILES, rating.user_id)
  return { ...rating, profiles: profile ? { name: profile.name, avatar_url: profile.avatar_url } : null }
}

export const ratingService = {
  // NoCodeBackend cannot perform Supabase relational selects in one call; beverage,
  // producer, and profile objects are composed with separate collection requests.
  async addRating(ratingData) {
    const { data, error } = await nocodeBackend.create(RATINGS, ratingData)
    if (error || !data) return { data, error }
    return { data: await attachProfile(await attachBeverage(data)), error: null }
  },

  async getUserRatings(userId) {
    const { data, error } = await nocodeBackend.list(RATINGS, {
      filters: { user_id: userId },
      orderBy: 'created_at',
      ascending: false
    })
    if (error) return { data, error }
    return { data: await Promise.all(data.map(attachBeverage)), error: null }
  },

  async getBeverageRatings(beverageId) {
    const { data, error } = await nocodeBackend.list(RATINGS, {
      filters: { beverage_id: beverageId },
      orderBy: 'created_at',
      ascending: false
    })
    if (error) return { data, error }
    return { data: await Promise.all(data.map(attachProfile)), error: null }
  },

  async updateRating(id, updates) {
    return nocodeBackend.update(RATINGS, id, updates)
  },

  async deleteRating(id) {
    return nocodeBackend.remove(RATINGS, id)
  }
}
