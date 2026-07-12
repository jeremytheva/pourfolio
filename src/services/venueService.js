import { supabase } from '../lib/supabase'

export const venueService = {
  // Get all venues
  async getVenues(filters = {}) {
    let query = supabase
      .from('venues_pf2025')
      .select('*')
      .order('name')

    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  // Get single venue
  async getVenue(id) {
    const { data, error } = await supabase
      .from('venues_pf2025')
      .select('*')
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  // Add new venue
  async addVenue(venueData) {
    const { data, error } = await supabase
      .from('venues_pf2025')
      .insert([venueData])
      .select()
      .single()
    
    return { data, error }
  },

  // Update venue
  async updateVenue(id, updates) {
    const { data, error } = await supabase
      .from('venues_pf2025')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  }
}