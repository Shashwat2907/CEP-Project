import * as React from 'react'
import { requireAuth } from '@/shared/auth/guards'
import { AppShell } from '@/shared/ui/app-shell'
import { isSupabaseOnline } from '@/lib/supabase/status'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAuth()
  const isOnline = await isSupabaseOnline()

  return (
    <AppShell
      initialRole={profile.role_primary as 'student' | 'teacher' | 'admin' | 'overseer'}
      userName={profile.full_name}
      identifier={profile.college_id}
      department={profile.branch ? `${profile.branch} (Year ${profile.year ?? 2})` : 'Computer Science'}
      userEmail={profile.college_email}
      isOffline={!isOnline}
    >
      {children}
    </AppShell>
  )
}
