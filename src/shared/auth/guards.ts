import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile, getCurrentRoles } from './session'
import { createClient } from '@/lib/supabase/server'
import type { UserRoleType, UserProfile } from './schema'

/**
 * Route and Server Action Guards.
 * Source of truth: documents/PLAN.MD §4, §4.1 and documents/TEAM_TASKS.MD
 */

export async function requireAuth(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
  profile: UserProfile
}> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in')
  }

  const profile = await getCurrentProfile()
  if (!profile || profile.status === 'inactive') {
    // Inactive accounts cannot access campus features per PLAN.MD §4.1
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: 'global' })
    redirect('/sign-in?error=inactive')
  }

  return { user, profile }
}

export async function requireRole(allowedRoles: UserRoleType[]): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
  profile: UserProfile
}> {
  const { user, profile } = await requireAuth()
  const roles = await getCurrentRoles()

  const hasAllowedRole =
    allowedRoles.includes(profile.role_primary as UserRoleType) ||
    roles.some((r) => allowedRoles.includes(r.role as UserRoleType))

  if (!hasAllowedRole) {
    redirect('/unauthorized')
  }

  return { user, profile }
}

/**
 * Signs the user out of all devices by invalidating all active sessions.
 */
export async function signOutAllDevices() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'global' })
  redirect('/sign-in')
}
