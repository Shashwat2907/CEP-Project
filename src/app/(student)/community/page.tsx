import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Sparkles, Search, BookOpen, Layers } from 'lucide-react'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getCommunities } from '@/features/community/queries'
import { CommunityCard } from '@/features/community/components/CommunityCard'
import { CreateCommunityModal } from '@/features/community/components/CreateCommunityModal'
import { AppShell } from '@/shared/ui/app-shell'
import type { Metadata } from 'next'
import type { CommunityKind } from '@/features/community/schema'

export const metadata: Metadata = {
  title: 'Campus Communities',
  description: 'Join official academic communities and student interest groups, resolve doubts, and earn reputation badges.',
}

interface CommunityPageProps {
  searchParams: Promise<{
    tab?: string
    q?: string
    kind?: string
  }>
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  await requireAuth()
  const profile = await getCurrentProfile()
  const sp = await searchParams

  const activeTab = sp.tab || 'all'
  const searchQuery = sp.q || ''
  const kindFilter = sp.kind as CommunityKind | undefined

  const communities = await getCommunities({
    kind: kindFilter,
    search: searchQuery || undefined,
    myOnly: activeTab === 'my',
  })

  // Filter tab logic
  let filteredCommunities = communities
  if (activeTab === 'official') {
    filteredCommunities = communities.filter((c) => c.official)
  } else if (activeTab === 'unofficial') {
    filteredCommunities = communities.filter((c) => !c.official)
  }

  const myJoinedCount = communities.filter((c) => c.is_member).length

  return (
    <AppShell
      initialRole={profile?.role_primary ?? 'student'}
      userName={profile?.full_name ?? 'Aarav Mehta'}
      identifier={profile?.college_id ?? '23BCE1001'}
      department={profile?.branch ? `${profile.branch} (Year ${profile.year ?? 2})` : 'Computer Science'}
      userEmail={profile?.college_email ?? 'student@campus.edu'}
      activePath="/community"
    >
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
            <span className="text-xs text-ink-muted">Campus Communities & Groups</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              {myJoinedCount} {myJoinedCount === 1 ? 'Community Joined' : 'Communities Joined'}
            </span>
          </div>
        </div>

        {/* Page Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-ink flex items-center gap-2.5">
              <span>Campus Communities</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Peer Doubts & Discussions
              </span>
            </h1>
            <p className="text-xs md:text-sm text-ink-muted mt-1 max-w-2xl">
              Connect with classmates, course cohorts, and student study groups. Post questions, answer doubts, and earn community recognition badges like <strong>Helper</strong> and <strong>Doubt Solver</strong>.
            </p>
          </div>

          <div className="shrink-0">
            <CreateCommunityModal />
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-lg overflow-x-auto text-xs">
            <Link
              href="/community?tab=all"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-ink text-on-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              All Rooms
            </Link>
            <Link
              href="/community?tab=official"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeTab === 'official'
                  ? 'bg-ink text-on-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Official (Classes & Subjects)
            </Link>
            <Link
              href="/community?tab=unofficial"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeTab === 'unofficial'
                  ? 'bg-ink text-on-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Student Groups
            </Link>
            <Link
              href="/community?tab=my"
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeTab === 'my'
                  ? 'bg-ink text-on-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              My Communities
            </Link>
          </div>

          {/* Search Bar */}
          <form method="GET" action="/community" className="relative w-full sm:w-64">
            {activeTab !== 'all' && <input type="hidden" name="tab" value={activeTab} />}
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search rooms..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

        {/* Communities Grid */}
        {filteredCommunities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-3 text-ink-muted">
              <Users size={24} />
            </div>
            <h3 className="font-semibold text-base text-ink mb-1">No communities found</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto mb-4">
              {searchQuery
                ? `No communities matching "${searchQuery}". Try a different keyword.`
                : activeTab === 'my'
                ? 'You have not joined any student communities yet. Explore the All Rooms tab to join!'
                : 'No communities available in this category.'}
            </p>
            <Link
              href="/community"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-ink hover:bg-surface-sunken transition-colors"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}
