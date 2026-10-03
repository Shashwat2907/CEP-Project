'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RotateCw,
  Edit2,
  Trash2,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import type { FlashcardWithReview } from '../schema'
import { rateFlashcardReview, updateFlashcard, deleteFlashcard, generateFlashcardsDeck } from '../actions'

interface FlashcardStudyViewProps {
  resourceId: string
  resourceTitle: string
  initialCards: FlashcardWithReview[]
}

export function FlashcardStudyView({
  resourceId,
  resourceTitle,
  initialCards,
}: FlashcardStudyViewProps) {
  const [cards, setCards] = useState<FlashcardWithReview[]>(initialCards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [studyStats, setStudyStats] = useState({ reviewedCount: 0, passedCount: 0 })

  const currentCard = cards[currentIndex]

  const handleOpenEdit = useCallback(() => {
    if (currentCard) {
      setEditFront(currentCard.front)
      setEditBack(currentCard.back)
      setIsEditing(true)
    }
  }, [currentCard])

  const handleFlip = useCallback(() => {
    if (!isEditing) {
      setIsFlipped((prev) => !prev)
    }
  }, [isEditing])

  const handleRate = useCallback((quality: number) => {
    if (!currentCard) return
    setErrorMsg(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('card_id', currentCard.id)
      formData.append('quality', quality.toString())

      const res = await rateFlashcardReview(formData)
      if (res.ok) {
        setStudyStats((prev) => ({
          reviewedCount: prev.reviewedCount + 1,
          passedCount: quality >= 3 ? prev.passedCount + 1 : prev.passedCount,
        }))

        // Move to next card or complete
        if (currentIndex + 1 < cards.length) {
          setIsFlipped(false)
          setCurrentIndex((prev) => prev + 1)
        } else {
          setCompleted(true)
        }
      } else {
        setErrorMsg(res.error.message)
      }
    })
  }, [currentCard, currentIndex, cards.length])

  const handleSaveEdit = () => {
    if (!currentCard) return
    setErrorMsg(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('card_id', currentCard.id)
      formData.append('front', editFront)
      formData.append('back', editBack)

      const res = await updateFlashcard(formData)
      if (res.ok) {
        setCards((prev) =>
          prev.map((c, i) =>
            i === currentIndex ? { ...c, front: editFront, back: editBack } : c
          )
        )
        setIsEditing(false)
      } else {
        setErrorMsg(res.error.message)
      }
    })
  }

  const handleDeleteCard = () => {
    if (!currentCard) return
    if (!confirm('Are you sure you want to delete this flashcard?')) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append('card_id', currentCard.id)

      const res = await deleteFlashcard(formData)
      if (res.ok) {
        const nextCards = cards.filter((_, idx) => idx !== currentIndex)
        setCards(nextCards)
        setIsFlipped(false)
        if (nextCards.length === 0) {
          setCompleted(true)
        } else if (currentIndex >= nextCards.length) {
          setCurrentIndex(nextCards.length - 1)
        }
      } else {
        setErrorMsg(res.error.message)
      }
    })
  }

  const handleRegenerate = () => {
    if (!confirm('Regenerating will replace all flashcards with newly generated cards. Continue?')) return
    setErrorMsg(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('resource_id', resourceId)

      const res = await generateFlashcardsDeck(formData)
      if (res.ok) {
        window.location.reload()
      } else {
        setErrorMsg(res.error.message)
      }
    })
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        handleFlip()
      } else if (isFlipped && !isPending && !completed) {
        if (e.key === '1') handleRate(1)
        else if (e.key === '2') handleRate(2)
        else if (e.key === '3') handleRate(3)
        else if (e.key === '4' || e.key === '5') handleRate(5)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFlipped, isPending, completed, isEditing, handleFlip, handleRate])

  // Empty deck state
  if (!cards || cards.length === 0) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href={`/acad/${resourceId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Resource</span>
          </Link>
        </div>

        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <HelpCircle size={40} style={{ color: 'var(--muted-foreground)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>No Flashcards in this Deck</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', maxWidth: '400px' }}>
            Generate flashcards with AI from this resource to start practicing spaced repetition.
          </p>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'var(--primary)',
              color: 'var(--primary-foreground, #fff)',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Generate Deck with Gemini</span>
          </button>
        </div>
      </div>
    )
  }

  // Completion session state
  if (completed) {
    const accuracy = studyStats.reviewedCount > 0
      ? Math.round((studyStats.passedCount / studyStats.reviewedCount) * 100)
      : 100

    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success, #22c55e)',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Study Session Complete!
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>
              You reviewed {studyStats.reviewedCount || cards.length} cards from &ldquo;{resourceTitle}&rdquo;.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              width: '100%',
              maxWidth: '360px',
              padding: '1rem',
              background: 'var(--muted, #f9fafb)',
              borderRadius: '0.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                {studyStats.reviewedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Reviewed</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success, #22c55e)' }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Retention</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0)
                setIsFlipped(false)
                setCompleted(false)
                setStudyStats({ reviewedCount: 0, passedCount: 0 })
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <RotateCw size={15} />
              <span>Review Again</span>
            </button>

            <Link
              href={`/acad/${resourceId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                background: 'var(--primary)',
                color: 'var(--primary-foreground, #fff)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to Resource</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Header & Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <Link
          href={`/acad/${resourceId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>{resourceTitle}</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending}
            title="Regenerate all cards with AI"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
            }}
          >
            <Sparkles size={13} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Counter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem', color: 'var(--muted-foreground)' }}>
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span>{Math.round(((currentIndex) / cards.length) * 100)}% Completed</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'var(--border, #e5e7eb)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
              background: 'var(--primary)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 0.875rem',
            borderRadius: '0.5rem',
            background: 'var(--destructive-subtle, rgba(239, 68, 68, 0.08))',
            color: 'var(--destructive, #ef4444)',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}
        >
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Flashcard View */}
      {isEditing ? (
        // Inline Edit Card Form
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Edit Flashcard</h3>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Front (Question):
            </label>
            <textarea
              value={editFront}
              onChange={(e) => setEditFront(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Back (Answer):
            </label>
            <textarea
              value={editBack}
              onChange={(e) => setEditBack(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isPending || !editFront.trim() || !editBack.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background: 'var(--primary)',
                color: 'var(--primary-foreground, #fff)',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      ) : (
        // Standard Flip Card
        <div style={{ perspective: '1000px', width: '100%' }}>
          <div
            onClick={handleFlip}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? 'Card flipped to answer. Press space to flip back.' : 'Card showing question. Press space to flip.'}
            style={{
              minHeight: '260px',
              width: '100%',
              borderRadius: '0.75rem',
              border: `2px solid ${isFlipped ? 'var(--primary)' : 'var(--border)'}`,
              background: 'var(--card)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              padding: '1.75rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'border-color 0.2s ease, transform 0.2s ease',
              position: 'relative',
              userSelect: 'none',
            }}
          >
            {/* Top Bar on Card: Citation & Card Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <BookOpen size={14} />
                <span>
                  {currentCard.source_page
                    ? `Source: Page ${currentCard.source_page}`
                    : 'Course Resource Citation'}
                </span>
              </div>

              {/* Action buttons (Edit & Delete) */}
              <div
                style={{ display: 'flex', gap: '0.25rem' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  title="Edit card"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted-foreground)',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCard}
                  title="Delete card"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted-foreground)',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Center Content: Question (Front) or Answer (Back) */}
            <div style={{ padding: '1.25rem 0', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 700,
                  color: isFlipped ? 'var(--primary)' : 'var(--muted-foreground)',
                  marginBottom: '0.5rem',
                }}
              >
                {isFlipped ? 'Answer' : 'Question'}
              </div>
              <p
                style={{
                  fontSize: isFlipped ? '1.0625rem' : '1.1875rem',
                  fontWeight: isFlipped ? 500 : 600,
                  lineHeight: 1.5,
                  margin: 0,
                  color: 'var(--foreground)',
                }}
              >
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Bottom prompt */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
              }}
            >
              <RotateCw size={12} />
              <span>{isFlipped ? 'Click or press Space to see question' : 'Click or press Space to flip'}</span>
            </div>
          </div>
        </div>
      )}

      {/* SM-2 Rating Controls (Revealed when card is flipped) */}
      {isFlipped && !isEditing && (
        <div style={{ marginTop: '1.25rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--muted-foreground)',
              textAlign: 'center',
              marginBottom: '0.5rem',
            }}
          >
            How well did you know this? (SM-2 Interval Scheduling)
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem',
            }}
          >
            {/* Again (1) */}
            <button
              type="button"
              onClick={() => handleRate(1)}
              disabled={isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 0.375rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'transform 0.1s ease',
              }}
            >
              <span>Again [1]</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>1 day</span>
            </button>

            {/* Hard (2) */}
            <button
              type="button"
              onClick={() => handleRate(2)}
              disabled={isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 0.375rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                background: 'rgba(245, 158, 11, 0.08)',
                color: '#d97706',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'transform 0.1s ease',
              }}
            >
              <span>Hard [2]</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>1 day</span>
            </button>

            {/* Good (3) */}
            <button
              type="button"
              onClick={() => handleRate(3)}
              disabled={isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 0.375rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                background: 'rgba(34, 197, 94, 0.08)',
                color: '#16a34a',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'transform 0.1s ease',
              }}
            >
              <span>Good [3]</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>
                {currentCard.review?.repetitions ? `${Math.round((currentCard.review.interval || 1) * (currentCard.review.ease || 2.5))}d` : '1-6d'}
              </span>
            </button>

            {/* Easy (5) */}
            <button
              type="button"
              onClick={() => handleRate(5)}
              disabled={isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 0.375rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                background: 'rgba(59, 130, 246, 0.08)',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'transform 0.1s ease',
              }}
            >
              <span>Easy [4]</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>+ease</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
