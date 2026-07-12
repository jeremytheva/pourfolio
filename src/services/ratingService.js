import { supabase } from '../lib/supabase'

export const ratingService = {
  // Add new rating
  async addRating(ratingData) {
    const { data, error } = await supabase
      .from('ratings_pf2025')
      .insert([ratingData])
      .select(`
        *,
        beverages_pf2025!ratings_pf2025_beverage_id_fkey(name, producer_id),
        profiles(name, avatar_url)
      `)
      .single()
    
    return { data, error }
  },

  // Get user's ratings
  async getUserRatings(userId) {
    const { data, error } = await supabase
      .from('ratings_pf2025')
      .select(`
        *,
        beverages_pf2025!ratings_pf2025_beverage_id_fkey(
          name, style, type,
          producers_pf2025!beverages_pf2025_producer_id_fkey(name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Get ratings for a specific beverage
  async getBeverageRatings(beverageId) {
    const { data, error } = await supabase
      .from('ratings_pf2025')
      .select(`
        *,
        profiles(name, avatar_url)
      `)
      .eq('beverage_id', beverageId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Update rating
  async updateRating(id, updates) {
    const { data, error } = await supabase
      .from('ratings_pf2025')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  },

  // Delete rating
  async deleteRating(id) {
    const { data, error } = await supabase
      .from('ratings_pf2025')
      .delete()
      .eq('id', id)
    
    return { data, error }
  }
}