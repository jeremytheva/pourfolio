import { nocodeBackend } from '../lib/nocodeBackend'

const PRODUCERS = 'producers_pf2025'
const BEVERAGES = 'beverages_pf2025'

const attachBeverages = async (producer) => {
  const { data: beverages } = await nocodeBackend.list(BEVERAGES, { filters: { producer_id: producer.id } })
  return { ...producer, beverages_pf2025: beverages || [] }
}

export const producerService = {
  // NoCodeBackend cannot express the previous Supabase relational beverage select in one call;
  // beverages are loaded from the beverages collection after producer reads.
  async getProducers(filters = {}) {
    const { data, error } = await nocodeBackend.list(PRODUCERS, {
      filters: { type: filters.type },
      search: filters.search ? { term: filters.search, fields: ['name', 'location'] } : undefined,
      orderBy: 'name',
      ascending: true
    })
    if (error) return { data, error }
    return { data: await Promise.all(data.map(attachBeverages)), error: null }
  },

  async getProducer(id) {
    const { data, error } = await nocodeBackend.get(PRODUCERS, id)
    if (error || !data) return { data, error }
    return { data: await attachBeverages(data), error: null }
  },

  async addProducer(producerData) {
    return nocodeBackend.create(PRODUCERS, producerData)
  },

  async updateProducer(id, updates) {
    return nocodeBackend.update(PRODUCERS, id, updates)
  }
}
