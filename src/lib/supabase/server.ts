import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const DEFAULT_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-project.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'

/**
 * Supabase server client — use in server components, server actions, and route handlers.
 * Reads the session cookie; uses the anon key so RLS still applies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    DEFAULT_SUPABASE_URL,
    DEFAULT_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a server component — safe to ignore
          }
        },
      },
    }
  )
}
