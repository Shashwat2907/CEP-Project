import { createClient } from '@/lib/supabase/server'
import type { UserProfile, UserRole } from './schema'

/**
 * Server session and profile resolution helpers.
 * Source of truth: documents/PLAN.MD §4, §4.1
 */

export async function getSession() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (profile as UserProfile) || null
}

export async function getCurrentRoles(): Promise<UserRole[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)

  return (roles as UserRole[]) || []
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
