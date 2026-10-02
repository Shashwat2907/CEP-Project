import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase browser client — safe to import in client components.
 * Uses the anon key; Row Level Security policies enforce permissions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
