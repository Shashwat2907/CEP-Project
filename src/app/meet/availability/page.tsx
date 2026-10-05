import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { redirect } from 'next/navigation'
import {
  getTeacherAvailabilityRules,
  getTeacherExceptions,
} from '@/features/meet/queries'
import { TeacherAvailabilityManager } from '@/features/meet/components/TeacherAvailabilityManager'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manage Availability — Campus Meet',
  description: 'Configure your weekly office hours, slot durations, and holiday overrides.',
}

export default async function TeacherAvailabilityPage() {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  if (profile?.role_primary !== 'teacher' && profile?.role_primary !== 'admin') {
    redirect('/meet')
  }

  const [rules, exceptions] = await Promise.all([
    getTeacherAvailabilityRules(user.id),
    getTeacherExceptions(user.id),
  ])

  return (
    <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/meet"
          className="inline-flex items-center gap-1.5 text-small text-ink-muted hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Meet Directory
        </Link>
      </div>

      <div>
        <h1 className="font-display text-h2 font-bold text-ink">
          Manage Office Hours & Availability
        </h1>
        <p className="text-small text-ink-muted mt-1">
          Set up your recurring weekly consultation windows and manage specific holiday or leave overrides.
        </p>
      </div>

      <TeacherAvailabilityManager
        initialRules={rules}
        initialExceptions={exceptions}
      />
    </main>
  )
}
