import { supabase } from '../lib/supabase'

export const producerService = {
  // Get all producers
  async getProducers(filters = {}) {
    let query = supabase
      .from('producers_pf2025')
      .select(`
        *,
        beverages_pf2025(id, name, style, average_rating)
      `)
      .order('name')

    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  // Get single producer
  async getProducer(id) {
    const { data, error } = await supabase
      .from('producers_pf2025')
      .select(`
        *,
        beverages_pf2025!beverages_pf2025_producer_id_fkey(*)
      `)
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  // Add new producer
  async addProducer(producerData) {
    const { data, error } = await supabase
      .from('producers_pf2025')
      .insert([producerData])
      .select()
      .single()
    
    return { data, error }
  },

  // Update producer
  async updateProducer(id, updates) {
    const { data, error } = await supabase
      .from('producers_pf2025')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  }
}