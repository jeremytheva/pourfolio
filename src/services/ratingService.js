import { nocodeBackend } from '../lib/nocodeBackend'
import { attachBeverageToRating, attachBeveragesToRatings, attachProfileToRecord, attachProfilesToRecords, COLLECTIONS } from './relationshipHelpers'

const RATINGS = COLLECTIONS.ratings

export const ratingService = {
  // NoCodeBackend cannot perform multi-relation selects in one call; beverage,
  // producer, and profile objects are composed with separate collection requests.
  async addRating(ratingData) {
    const { data, error } = await nocodeBackend.create(RATINGS, ratingData)
    if (error || !data) return { data, error }
    return { data: await attachProfileToRecord(await attachBeverageToRating(data)), error: null }
  },

  async getUserRatings(userId) {
    const { data, error } = await nocodeBackend.list(RATINGS, {
      filters: { user_id: userId },
      orderBy: 'created_at',
      ascending: false
    })
    if (error) return { data, error }
    return { data: await attachBeveragesToRatings(data), error: null }
  },

  async getBeverageRatings(beverageId) {
    const { data, error } = await nocodeBackend.list(RATINGS, {
      filters: { beverage_id: beverageId },
      orderBy: 'created_at',
      ascending: false
    })
    if (error) return { data, error }
    return { data: await attachProfilesToRecords(data), error: null }
  },

  async updateRating(id, updates) {
    return nocodeBackend.update(RATINGS, id, updates)
  },

  async deleteRating(id) {
    return nocodeBackend.remove(RATINGS, id)
  }
}
