import { createClient } from '@/lib/supabase/server'
import { isSupabaseOnline } from '@/lib/supabase/status'
import { cookies } from 'next/headers'
import { MOCK_ROSTER } from './mock-roster'
import type { UserProfile, UserRole, UserRoleType } from './schema'
import type { User } from '@supabase/supabase-js'

/**
 * Server session and profile resolution helpers.
 * Source of truth: documents/PLAN.MD §4, §4.1
 */

export async function getSession() {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) return session
    } catch {
      // Offline / Supabase unreachable
    }
  }
  return null
}

export async function getCurrentUser(): Promise<User | null> {
  // 1. Dev mock session fallback (local role and user switching)
  if (process.env.DEV_PRINT_OTP_TO_CONSOLE === 'true' || process.env.NODE_ENV !== 'production') {
    try {
      const cookieStore = await cookies()
      const mockEmail = cookieStore.get('dev_mock_user_email')?.value
      if (mockEmail) {
        const roster = MOCK_ROSTER.find(
          (r) => r.college_email.toLowerCase() === mockEmail.toLowerCase()
        )
        if (roster && roster.status !== 'inactive') {
          return {
            id: roster.id,
            email: roster.college_email,
            app_metadata: {},
            user_metadata: { full_name: roster.full_name },
            aud: 'authenticated',
            created_at: '2026-10-02T00:00:00Z',
          } as unknown as User
        }
      }
    } catch {
      // Cookies not accessible
    }
  }

  // 2. Real Supabase Auth session
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) return user
    } catch {
      // Offline / Supabase unreachable
    }
  }

  return null
}

/**
 * CONTRACT.md §5.2 specification alias for server-side user resolution
 */
export const getSessionUser = getCurrentUser

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  // 1. Dev mock profile fallback (when using role switcher or local roster)
  if (process.env.DEV_PRINT_OTP_TO_CONSOLE === 'true' || process.env.NODE_ENV !== 'production') {
    const roster = MOCK_ROSTER.find(
      (r) =>
        r.college_email.toLowerCase() === user.email?.toLowerCase() ||
        r.id === user.id
    )
    if (roster) {
      return {
        id: roster.id,
        full_name: roster.full_name,
        college_email: roster.college_email,
        college_id: roster.college_id,
        branch: roster.branch,
        year: roster.year ?? undefined,
        division: roster.division ?? undefined,
        batch: roster.batch ?? undefined,
        role_primary: roster.role as 'student' | 'teacher' | 'admin',
        status: roster.status === 'inactive' ? 'inactive' : 'active',
        photo_url: null,
        created_at: '2026-10-02T00:00:00Z',
        updated_at: '2026-10-02T00:00:00Z',
      }
    }
  }

  // 2. Real Supabase profile table
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) return profile as UserProfile
    } catch {
      // Offline / Supabase unreachable
    }
  }

  return null
}

export async function getCurrentRoles(): Promise<UserRole[]> {
  const user = await getCurrentUser()
  if (!user) return []

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)

      if (roles && roles.length > 0) return roles as UserRole[]
    } catch {
      // Offline / Supabase unreachable
    }
  }

  // Dev mock roles fallback
  if (process.env.DEV_PRINT_OTP_TO_CONSOLE === 'true' || process.env.NODE_ENV !== 'production') {
    const roster = MOCK_ROSTER.find(
      (r) =>
        r.college_email.toLowerCase() === user.email?.toLowerCase() ||
        r.id === user.id
    )
    if (roster) {
      return [
        {
          id: `role-${roster.id}`,
          user_id: roster.id,
          role: roster.role as UserRoleType,
          scope: null,
          created_at: '2026-10-02T00:00:00Z',
        },
      ]
    }
  }

  return []
}

/**
 * Checks if current user has a specific role or scope
 */
export async function hasRole(role: string, scope?: string): Promise<boolean> {
  const roles = await getCurrentRoles()
  return roles.some((r) => {
    if (r.role !== role) return false
    if (scope && r.scope !== scope) return false
    return true
  })
}
