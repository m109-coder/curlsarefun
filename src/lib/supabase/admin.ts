import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Prefer the service-role key (bypasses RLS); fall back to the publishable
// key so local dev still works when only public env vars are set.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/**
 * Server-side Supabase client with elevated (service-role) privileges.
 * Session persistence is disabled because this client is shared across
 * requests — never expose it to the browser.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})