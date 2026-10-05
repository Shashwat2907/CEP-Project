import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-project.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'

/**
 * Supabase browser client — safe to import in client components.
 * Uses the anon key; Row Level Security policies enforce permissions.
 */
export function createClient() {
  return createBrowserClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY)
}
