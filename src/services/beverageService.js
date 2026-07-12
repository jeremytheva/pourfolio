import { supabase } from '../lib/supabase'

export const beverageService = {
  // Get all beverages with optional filtering
  async getBeverages(filters = {}) {
    let query = supabase
      .from('beverages_pf2025')
      .select(`
        *,
        producers_pf2025!beverages_pf2025_producer_id_fkey(name, location, type)
      `)
      .order('created_at', { ascending: false })

    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    
    if (filters.producer_id) {
      query = query.eq('producer_id', filters.producer_id)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,style.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  // Get single beverage by ID
  async getBeverage(id) {
    const { data, error } = await supabase
      .from('beverages_pf2025')
      .select(`
        *,
        producers_pf2025!beverages_pf2025_producer_id_fkey(name, location, type),
        ratings_pf2025!ratings_pf2025_beverage_id_fkey(
          id, rating, review, created_at,
          profiles(name, avatar_url)
        )
      `)
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  // Add new beverage
  async addBeverage(beverageData) {
    const { data, error } = await supabase
      .from('beverages_pf2025')
      .insert([beverageData])
      .select()
      .single()
    
    return { data, error }
  },

  // Update beverage
  async updateBeverage(id, updates) {
    const { data, error } = await supabase
      .from('beverages_pf2025')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  },

  // Delete beverage
  async deleteBeverage(id) {
    const { data, error } = await supabase
      .from('beverages_pf2025')
      .delete()
      .eq('id', id)
    
    return { data, error }
  }
}