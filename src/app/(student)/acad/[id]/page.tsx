import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { AppShell } from '@/shared/ui/app-shell'
import {
  getResourceWithSignedUrl,
  getResourceChunkCount,
  getDeckDueStatus,
  getOrCreateDoubtThread,
} from '@/features/acad/queries'
import { MOCK_RESOURCES } from '@/features/acad/mock-acad-data'
import { ResourceDetailView } from '@/features/acad/components/ResourceDetailView'
import type { Metadata } from 'next'

interface ResourceDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: ResourceDetailPageProps): Promise<Metadata> {
  const { id } = await params
  if (id === 'flashcards') {
    return { title: 'Flashcards — Academic Resources' }
  }
  const data = await getResourceWithSignedUrl(id)
  if (!data?.resource) {
    return { title: 'Resource Not Found — Campus App' }
  }
  return {
    title: `${data.resource.title} — Academic Resources`,
    description: `Download and view ${data.resource.title} (${data.resource.type}) for ${data.resource.branch} Year ${data.resource.year}.`,
  }
}

export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  await requireAuth()
  const { id } = await params

  if (id === 'flashcards') {
    redirect('/flashcards')
  }

  const profile = await getCurrentProfile()

  let [data, chunkCount, deckStatus, doubtData] = await Promise.all([
    getResourceWithSignedUrl(id),
    getResourceChunkCount(id),
    getDeckDueStatus(id),
    getOrCreateDoubtThread(id).catch(() => ({ thread: null, messages: [] })),
  ])

  if (!data || !data.resource) {
    const mock = MOCK_RESOURCES.find((r) => r.id === id)
    if (mock) {
      data = {
        resource: mock,
        signedUrl: `/api/acad/download?id=${encodeURIComponent(mock.id)}`,
      }
    } else {
      notFound()
    }
  }

  return (
    <AppShell
      initialRole={profile?.role_primary ?? 'student'}
      userName={profile?.full_name ?? 'Shashwat Choudhary'}
      identifier={profile?.college_id ?? '23BCE1042'}
      department={profile?.branch ? `${profile.branch} (Year ${profile.year ?? 2})` : 'Computer Science'}
      userEmail={profile?.college_email ?? 'student@campus.edu'}
      activePath="/acad"
    >
      <main className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        <ResourceDetailView
          resource={data.resource}
          signedUrl={data.signedUrl}
          chunkCount={chunkCount}
          hasDeck={deckStatus.hasDeck}
          cardCount={deckStatus.totalCards}
          dueCount={deckStatus.dueCards}
          doubtThreadId={doubtData?.thread?.id}
          initialDoubtMessages={doubtData?.messages || []}
        />
      </main>
    </AppShell>
  )
}
