import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import {
  getCommunityById,
  getCommunityMessages,
  getCommunityMembers,
} from '@/features/community/queries'
import { CommunityRoomView } from './CommunityRoomView'
import type { Metadata } from 'next'

interface CommunityDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: CommunityDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const community = await getCommunityById(id)
  return {
    title: community ? `${community.name} — Community` : 'Community Room',
    description: community?.description || 'Campus peer doubt resolution and academic room.',
  }
}

export default async function CommunityDetailPage({ params }: CommunityDetailPageProps) {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()
  const { id } = await params

  const [community, messages, members] = await Promise.all([
    getCommunityById(id),
    getCommunityMessages(id),
    getCommunityMembers(id),
  ])

  if (!community) {
    notFound()
  }

  return (
    <>

<main className="p-4 md:p-6 max-w-6xl mx-auto w-full">
  {/* Navigation Breadcrumb / Return to Homepage */}
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
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
      >
        <MessageSquare size={13} />
        <span>Back to Communities</span>
      </Link>
    </div>

    <div className="flex items-center gap-2">
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
        {community.official ? 'Official Channel' : 'Student Group'}
      </span>
    </div>
  </div>

  {/* Community Room View */}
  <CommunityRoomView
    community={community}
    initialMessages={messages}
    members={members}
    currentUserId={user.id}
    currentUserRole={community.user_role}
  />
</main>
    </>
  )
}
