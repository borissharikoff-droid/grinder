import { createClient, type User } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  level: number
  xp: number
  current_activity: string | null
  is_online: boolean
  streak_count: number
  updated_at: string
}

export function useSupabase(): { supabase: ReturnType<typeof createClient> | null; user: User | null } {
  return { supabase, user: null }
}
