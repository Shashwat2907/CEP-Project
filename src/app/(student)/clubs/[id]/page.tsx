import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flag } from 'lucide-react'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import {
  getClubById,
  getClubNotices,
  getPendingClubRequests,
} from '@/features/clubs/queries'
import { AppShell } from '@/shared/ui/app-shell'
import { ClubDetailView } from './ClubDetailView'
import type { Metadata } from 'next'

interface ClubDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ClubDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const club = await getClubById(id)
  return {
    title: club ? `${club.name} — Clubs` : 'Club Not Found — Campus App',
    description: club?.description || 'Campus club details and join information.',
  }
}

export default async function ClubDetailPage({ params }: ClubDetailPageProps) {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()
  const { id } = await params

  const [club, notices, pendingRequests] = await Promise.all([
    getClubById(id),
    getClubNotices(id),
    getPendingClubRequests(id),
  ])

  if (!club) notFound()

  const isLead = club.lead_id === user.id

  return (
    <AppShell
      initialRole={profile?.role_primary ?? 'student'}
      userName={profile?.full_name ?? 'Student'}
      identifier={profile?.college_id ?? '23BCE1001'}
      department={profile?.branch ? `${profile.branch} (Year ${profile.year ?? 2})` : 'Computer Science'}
      userEmail={profile?.college_email ?? 'student@campus.edu'}
      activePath="/clubs"
    >
      <main className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-border bg-surface hover:bg-surface-sunken text-ink transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Homepage</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <Link
            href="/clubs"
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <Flag size={13} />
            <span>Back to Clubs</span>
          </Link>
        </div>

        <ClubDetailView
          club={club}
          notices={notices}
          pendingRequests={isLead ? pendingRequests : []}
          currentUserId={user.id}
          isLead={isLead}
        />
      </main>
    </AppShell>
  )
}
