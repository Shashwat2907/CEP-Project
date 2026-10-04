import { notFound } from 'next/navigation'
import { requireAuth } from '@/shared/auth/guards'
import {
  getResourceWithSignedUrl,
  getResourceChunkCount,
  getDeckDueStatus,
  getOrCreateDoubtThread,
} from '@/features/acad/queries'
import { ResourceDetailView } from '@/features/acad/components/ResourceDetailView'
import type { Metadata } from 'next'

interface ResourceDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: ResourceDetailPageProps): Promise<Metadata> {
  const { id } = await params
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

  const [data, chunkCount, deckStatus, doubtData] = await Promise.all([
    getResourceWithSignedUrl(id),
    getResourceChunkCount(id),
    getDeckDueStatus(id),
    getOrCreateDoubtThread(id).catch(() => ({ thread: null, messages: [] })),
  ])

  if (!data || !data.resource) {
    notFound()
  }

  return (
    <main>
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
  )
}

