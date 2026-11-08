import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseConfigurationError = Boolean(url) !== Boolean(anonKey)
  ? 'Supabase URL va anon key ikkalasi ham sozlanishi kerak.'
  : null;
export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
