import Link from 'next/link'
import { ArrowLeft, Flag, Users, Search, Star } from 'lucide-react'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getClubs } from '@/features/clubs/queries'
import { AppShell } from '@/shared/ui/app-shell'
import { ClubDirectoryClient } from './ClubDirectoryClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clubs — Campus App',
  description: 'Browse and join campus clubs. From coding and robotics to literary society and entrepreneurship.',
}

export default async function ClubsPage() {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()

  const clubs = await getClubs()
  const myClubs = clubs.filter((c) => c.user_status === 'member')

  return (
    <AppShell
      initialRole={profile?.role_primary ?? 'student'}
      userName={profile?.full_name ?? 'Student'}
      identifier={profile?.college_id ?? '23BCE1001'}
      department={profile?.branch ? `${profile.branch} (Year ${profile.year ?? 2})` : 'Computer Science'}
      userEmail={profile?.college_email ?? 'student@campus.edu'}
      activePath="/clubs"
    >
      <main className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-border bg-surface hover:bg-surface-sunken text-ink transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Return to Homepage</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-ink-muted flex items-center gap-1.5">
              <Flag size={13} />
              Campus Clubs
            </span>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
            {myClubs.length} {myClubs.length === 1 ? 'Club Joined' : 'Clubs Joined'}
          </span>
        </div>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-ink flex items-center gap-2.5 mb-2">
            <Flag size={28} className="text-primary" />
            Campus Clubs
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl">
            Join clubs that match your interests — coding, photography, robotics, writing, and more.
            Free clubs require lead approval. Paid clubs activate membership only after verified payment.
          </p>
        </div>

        {/* My Clubs quick section */}
        {myClubs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star size={14} className="text-amber-500" />
              My Clubs
            </h2>
            <div className="flex flex-wrap gap-2">
              {myClubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/clubs/${club.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Flag size={11} />
                  {club.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Client-side directory with search and filters */}
        <ClubDirectoryClient clubs={clubs} currentUserId={user.id} />
      </main>
    </AppShell>
  )
}
