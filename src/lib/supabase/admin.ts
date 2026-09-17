import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Uploads to Supabase Storage will be disabled.');
}

/**
 * Server-side Supabase client with elevated (service-role) privileges.
 * Session persistence is disabled because this client is shared across
 * requests — never expose it to the browser.
 *
 * Returns null when Supabase credentials are not configured so the rest of
 * the app can still run without Supabase Storage.
 */
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null