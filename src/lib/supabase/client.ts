import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/**
 * Browser-safe Supabase client using the public publishable (anon) key.
 * Subject to Row Level Security — use `supabaseAdmin` for privileged work.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)