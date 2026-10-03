import { notFound } from 'next/navigation'
import { requireAuth } from '@/shared/auth/guards'
import { getResourceWithSignedUrl, getFlashcardDeck } from '@/features/acad/queries'
import { FlashcardStudyView } from '@/features/acad/components/FlashcardStudyView'
import type { Metadata } from 'next'

interface FlashcardsPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: FlashcardsPageProps): Promise<Metadata> {
  const { id } = await params
  const data = await getResourceWithSignedUrl(id)
  if (!data?.resource) {
    return { title: 'Flashcards Not Found — Campus App' }
  }
  return {
    title: `Flashcards: ${data.resource.title} — Campus App`,
    description: `Interactive AI study flashcards with SM-2 spaced repetition for ${data.resource.title}.`,
  }
}

export default async function FlashcardsPage({ params }: FlashcardsPageProps) {
  await requireAuth()
  const { id } = await params

  const [data, deckData] = await Promise.all([
    getResourceWithSignedUrl(id),
    getFlashcardDeck(id),
  ])

  if (!data || !data.resource) {
    notFound()
  }

  return (
    <main>
      <FlashcardStudyView
        resourceId={data.resource.id}
        resourceTitle={data.resource.title}
        initialCards={deckData.cards}
      />
    </main>
  )
}
