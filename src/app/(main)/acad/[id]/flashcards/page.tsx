import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getResourceWithSignedUrl, getFlashcardDeck } from '@/features/acad/queries'
import { FlashcardStudyView } from '@/features/acad/components/FlashcardStudyView'
import { MOCK_RESOURCES, MOCK_FLASHCARDS } from '@/features/acad/mock-acad-data'
import type { Metadata } from 'next'

interface FlashcardsPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: FlashcardsPageProps): Promise<Metadata> {
  const { id } = await params
  if (id === 'flashcards') {
    return { title: 'Flashcards — Campus Super-App' }
  }
  const data = await getResourceWithSignedUrl(id)
  if (!data?.resource) {
    return { title: 'Flashcards — Campus Super-App' }
  }
  return {
    title: `Flashcards: ${data.resource.title} — Campus App`,
    description: `Interactive AI study flashcards with SM-2 spaced repetition for ${data.resource.title}.`,
  }
}

export default async function FlashcardsPage({ params }: FlashcardsPageProps) {
  await requireAuth()
  const { id } = await params

  if (id === 'flashcards') {
    redirect('/flashcards')
  }

  const profile = await getCurrentProfile()

  let [data, deckData] = await Promise.all([
    getResourceWithSignedUrl(id),
    getFlashcardDeck(id),
  ])

  if (!data || !data.resource) {
    const fallbackRes = MOCK_RESOURCES.find((r) => r.id === id) || MOCK_RESOURCES[0]
    if (fallbackRes) {
      data = {
        resource: fallbackRes,
        signedUrl: `/api/acad/download?id=${encodeURIComponent(fallbackRes.id)}`,
      }
    } else {
      notFound()
    }
  }

  // Ensure initial cards exist so the study view never loads empty
  const cardsToStudy =
    deckData.cards && deckData.cards.length > 0
      ? deckData.cards
      : MOCK_FLASHCARDS

  return (
    <>

<main className="p-4 md:p-6 max-w-5xl mx-auto w-full">
  <FlashcardStudyView
    resourceId={data.resource.id}
    resourceTitle={data.resource.title}
    initialCards={cardsToStudy}
  />
</main>
    </>
  )
}
