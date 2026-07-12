import { createClient } from '@supabase/supabase-js'

    const SUPABASE_URL = 'https://xgphylnsohzublfnaoog.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncGh5bG5zb2h6dWJsZm5hb29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjQ2MTEsImV4cCI6MjA3NjEwMDYxMX0.ayBUJdBtBHtonJ9k7_EKLzX64fsy51TsO5CydGztOYM'

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase variables');
    }

    export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })

    export default supabase