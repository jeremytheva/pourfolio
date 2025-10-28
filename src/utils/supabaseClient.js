import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.warn('Supabase environment variables are not configured. Authentication will fall back to demo credentials.');
}

export const isSupabaseConfigured = Boolean(supabase);
export { supabase };

export const demoCredentials = {
  email: 'demo@pourfolio.app',
  password: 'pourfolio-demo'
};
