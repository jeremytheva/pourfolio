import { supabase } from '../lib/supabase'

export const eventService = {
  // Get all events
  async getEvents(filters = {}) {
    let query = supabase
      .from('events_pf2025')
      .select('*')
      .order('start_date', { ascending: true })

    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    if (filters.beverage_category) {
      query = query.eq('beverage_category', filters.beverage_category)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  // Get single event
  async getEvent(id) {
    const { data, error } = await supabase
      .from('events_pf2025')
      .select('*')
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  // Add new event
  async addEvent(eventData) {
    const { data, error } = await supabase
      .from('events_pf2025')
      .insert([eventData])
      .select()
      .single()
    
    return { data, error }
  },

  // Update event
  async updateEvent(id, updates) {
    const { data, error } = await supabase
      .from('events_pf2025')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  }
}