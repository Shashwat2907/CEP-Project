import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-project.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Server-only Supabase admin client using the service role key.
 * Used exclusively for server actions that need to verify roster status
 * or perform profile provisioning during authentication.
 */
export function createAdminClient() {
  if (!SERVICE_ROLE_KEY || !SUPABASE_URL || SUPABASE_URL.includes('demo-project')) {
    return null
  }
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
