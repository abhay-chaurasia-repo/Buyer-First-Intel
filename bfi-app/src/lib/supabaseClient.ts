import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured() {
  return Boolean(url?.startsWith('http') && anonKey && anonKey.length > 20)
}

export function getSupabaseUrl() {
  return url
}

export function getSupabaseAnonKey() {
  return anonKey
}

let client: SupabaseClient | null = null

/** Browser Supabase client — null until URL + anon key are set in env. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
