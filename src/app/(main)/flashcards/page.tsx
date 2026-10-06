import Link from 'next/link'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { MOCK_RESOURCES, MOCK_DECKS_STORE, MOCK_CARDS_STORE } from '@/features/acad/mock-acad-data'
import { getFlashcardDeck } from '@/features/acad/queries'
import { Sparkles, Layers, BookOpen, Clock, ArrowRight, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Flashcards — Campus Super-App',
  description: 'AI-generated study flashcards with SM-2 spaced repetition for your courses.',
}

export default async function FlashcardsHubPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  // Collect all active decks
  const decksWithStats = await Promise.all(
    MOCK_RESOURCES.slice(0, 6).map(async (res) => {
      const { deck, cards } = await getFlashcardDeck(res.id)
      const dueCards = cards.filter((c) => !c.review?.due_at || new Date(c.review.due_at) <= new Date()).length
      return {
        resource: res,
        deck,
        cardCount: cards.length,
        dueCount: dueCards,
      }
    })
  )

  const activeDecks = decksWithStats.filter((d) => d.cardCount > 0)
  const totalCards = activeDecks.reduce((sum, d) => sum + d.cardCount, 0)
  const totalDue = activeDecks.reduce((sum, d) => sum + d.dueCount, 0)

  return (
    <>

<main className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
  {/* Navigation Breadcrumb */}
  <div className="flex items-center justify-between pb-4 border-b border-border">
    <div className="flex items-center gap-3">
      <Link
        href="/acad"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-border bg-surface hover:bg-surface-sunken text-ink transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back to Academics</span>
      </Link>
      <div className="h-4 w-px bg-border" />
      <span className="text-xs text-ink-muted">AI Flashcard Decks</span>
    </div>
    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1">
      <Sparkles size={12} />
      <span>SM-2 Spaced Repetition</span>
    </span>
  </div>

  {/* Page Header */}
  <div>
    <h1 className="text-2xl font-bold font-display text-ink flex items-center gap-2">
      <Layers className="text-primary" size={24} />
      <span>Course Study Flashcards</span>
    </h1>
    <p className="text-sm text-ink-muted mt-1 leading-relaxed">
      High-yield active recall cards synthesized by Gemini AI directly from your verified lecture notes and past year questions.
    </p>
  </div>

  {/* Stats Summary Bar */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
      <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Active Decks</p>
      <p className="text-2xl font-bold text-ink mt-1">{activeDecks.length}</p>
    </div>
    <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
      <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Total Flashcards</p>
      <p className="text-2xl font-bold text-ink mt-1">{totalCards}</p>
    </div>
    <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
      <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Cards Due for Review</p>
      <p className="text-2xl font-bold text-primary mt-1 flex items-center gap-1.5">
        <span>{totalDue}</span>
        {totalDue > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            Ready
          </span>
        )}
      </p>
    </div>
  </div>

  {/* Decks Grid */}
  <section className="space-y-4">
    <h2 className="text-base font-bold text-ink font-display flex items-center gap-2">
      <span>Your Study Decks</span>
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {activeDecks.map(({ resource, cardCount, dueCount }) => (
        <div
          key={resource.id}
          className="p-5 rounded-xl border border-border bg-surface hover:border-primary/40 transition-all flex flex-col justify-between shadow-xs"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {resource.subject?.code || 'CS201'}
              </span>
              {dueCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Clock size={11} />
                  <span>{dueCount} due</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Up to date
                </span>
              )}
            </div>

            <h3 className="font-bold text-base text-ink line-clamp-2 mb-1">
              {resource.title}
            </h3>
            <p className="text-xs text-ink-muted">
              {resource.subject?.name || resource.branch} · Year {resource.year}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-ink-muted flex items-center gap-1">
              <BookOpen size={14} />
              <span>{cardCount} cards in deck</span>
            </span>

            <Link
              href={`/acad/${resource.id}/flashcards`}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-primary/90 transition-colors shadow-xs"
            >
              <span>Study Now</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  </section>

  {/* Generate More Decks Prompt */}
  <div className="p-6 rounded-xl border border-border bg-surface-sunken flex flex-col sm:flex-row items-center justify-between gap-4">
    <div>
      <h3 className="text-sm font-bold text-ink font-display">Need flashcards for another subject?</h3>
      <p className="text-xs text-ink-muted mt-0.5">
        Open any course resource in Academics and click "Generate Flashcards" to create new study decks in seconds.
      </p>
    </div>
    <Link
      href="/acad"
      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-sm border border-border bg-surface hover:bg-surface-sunken text-ink transition-colors shadow-xs"
    >
      <span>Explore All Resources</span>
      <ArrowRight size={13} />
    </Link>
  </div>
</main>
    </>
  )
}
