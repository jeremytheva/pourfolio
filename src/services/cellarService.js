import { nocodeBackend } from '../lib/nocodeBackend'
import { attachProducerToBeverage, COLLECTIONS, pickBeverageSummary } from './relationshipHelpers'

const CELLAR_ITEMS = 'cellar_items_pf2025'

const attachBeverageToCellarItem = async (cellarItem) => {
  if (!cellarItem?.beverage_id) return cellarItem

  const { data: beverage } = await nocodeBackend.get(COLLECTIONS.beverages, cellarItem.beverage_id)
  if (!beverage) return { ...cellarItem, beverages_pf2025: null }

  const beverageWithProducer = await attachProducerToBeverage(beverage, ['name'])
  return { ...cellarItem, beverages_pf2025: pickBeverageSummary(beverageWithProducer) }
}

export const cellarService = {
  // NoCodeBackend does not support Supabase relational selects in one collection call;
  // beverage and producer relationship shapes are composed from follow-up requests.
  async getCellarItems(userId) {
    const { data, error } = await nocodeBackend.list(CELLAR_ITEMS, {
      filters: { user_id: userId },
      orderBy: 'added_date',
      ascending: false
    })
    if (error) return { data, error }

    return { data: await Promise.all((data || []).map(attachBeverageToCellarItem)), error: null }
  },

  async addCellarItem(cellarData) {
    const { data, error } = await nocodeBackend.create(CELLAR_ITEMS, cellarData)
    if (error || !data) return { data, error }

    return { data: await attachBeverageToCellarItem(data), error: null }
  },

  async updateCellarItem(id, updates) {
    return nocodeBackend.update(CELLAR_ITEMS, id, updates)
  },

  async deleteCellarItem(id) {
    return nocodeBackend.remove(CELLAR_ITEMS, id)
  }
}
