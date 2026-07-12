import { supabase } from '../lib/supabase'

export const cellarService = {
  // Get user's cellar items
  async getCellarItems(userId) {
    const { data, error } = await supabase
      .from('cellar_items_pf2025')
      .select(`
        *,
        beverages_pf2025!cellar_items_pf2025_beverage_id_fkey(
          name, style, type,
          producers_pf2025!beverages_pf2025_producer_id_fkey(name)
        )
      `)
      .eq('user_id', userId)
      .order('added_date', { ascending: false })
    
    return { data, error }
  },

  // Add item to cellar
  async addCellarItem(cellarData) {
    const { data, error } = await supabase
      .from('cellar_items_pf2025')
      .insert([cellarData])
      .select(`
        *,
        beverages_pf2025!cellar_items_pf2025_beverage_id_fkey(
          name, style, type,
          producers_pf2025!beverages_pf2025_producer_id_fkey(name)
        )
      `)
      .single()
    
    return { data, error }
  },

  // Update cellar item
  async updateCellarItem(id, updates) {
    const { data, error } = await supabase
      .from('cellar_items_pf2025')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  },

  // Delete cellar item
  async deleteCellarItem(id) {
    const { data, error } = await supabase
      .from('cellar_items_pf2025')
      .delete()
      .eq('id', id)
    
    return { data, error }
  }
}