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
  const [wrongCards, setWrongCards] = useState<FlashcardWithReview[]>([])
  const [retryRound, setRetryRound] = useState(0)
  const [showAdvancedSm2, setShowAdvancedSm2] = useState(false)

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

    const isPassed = quality >= 3
    if (!isPassed) {
      setWrongCards((prev) => {
        if (prev.some((c) => c.id === currentCard.id)) return prev
        return [...prev, currentCard]
      })
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('card_id', currentCard.id)
      formData.append('quality', quality.toString())

      const res = await rateFlashcardReview(formData)
      if (res.ok) {
        setStudyStats((prev) => ({
          reviewedCount: prev.reviewedCount + 1,
          passedCount: isPassed ? prev.passedCount + 1 : prev.passedCount,
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

  const handleMarkIncorrect = useCallback(() => {
    handleRate(1)
  }, [handleRate])

  const handleMarkCorrect = useCallback(() => {
    handleRate(4)
  }, [handleRate])

  const handleRetryWrongCards = useCallback(() => {
    if (wrongCards.length === 0) return
    setCards([...wrongCards])
    setWrongCards([])
    setCurrentIndex(0)
    setIsFlipped(false)
    setCompleted(false)
    setRetryRound((r) => r + 1)
    setStudyStats({ reviewedCount: 0, passedCount: 0 })
  }, [wrongCards])

  const handleRestartFullDeck = useCallback(() => {
    setCards(initialCards)
    setWrongCards([])
    setCurrentIndex(0)
    setIsFlipped(false)
    setCompleted(false)
    setRetryRound(0)
    setStudyStats({ reviewedCount: 0, passedCount: 0 })
  }, [initialCards])

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
        if (e.key === '1' || e.key.toLowerCase() === 'x' || e.key === 'ArrowLeft') {
          handleMarkIncorrect()
        } else if (e.key === '2' || e.key.toLowerCase() === 'c' || e.key === 'ArrowRight') {
          handleMarkCorrect()
        } else if (e.key === '3') {
          handleRate(3)
        } else if (e.key === '4' || e.key === '5') {
          handleRate(5)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFlipped, isPending, completed, isEditing, handleFlip, handleMarkIncorrect, handleMarkCorrect, handleRate])

  // Empty deck state
  if (!cards || cards.length === 0) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <Link
            href="/"
            style={{
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Return to Homepage
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link
            href={`/acad/${resourceId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
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
    const missedCount = wrongCards.length

    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>
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
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: missedCount === 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: missedCount === 0 ? 'var(--success, #22c55e)' : '#d97706',
            }}
          >
            {missedCount === 0 ? <CheckCircle2 size={36} /> : <RotateCw size={36} />}
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              {retryRound > 0 ? `Targeted Practice Round #${retryRound} Complete!` : 'Study Session Complete!'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>
              You reviewed {studyStats.reviewedCount || cards.length} cards from &ldquo;{resourceTitle}&rdquo;.
            </p>
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              width: '100%',
              maxWidth: '440px',
              padding: '1rem',
              background: 'var(--muted, #f9fafb)',
              borderRadius: '0.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--primary)' }}>
                {studyStats.reviewedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Reviewed</div>
            </div>
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#16a34a' }}>
                {studyStats.passedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Correct</div>
            </div>
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, color: missedCount > 0 ? '#dc2626' : '#16a34a' }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Retention</div>
            </div>
          </div>

          {/* Targeted Retry Prompt if any cards were marked incorrect */}
          {missedCount > 0 ? (
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                padding: '1.25rem',
                borderRadius: '0.625rem',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.04)',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <AlertCircle size={18} style={{ color: '#dc2626' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#dc2626' }}>
                  {missedCount} Flashcard{missedCount > 1 ? 's' : ''} Need Review
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                Solidify your retention by attempting only the cards you marked as incorrect:
              </p>
              <ul style={{ margin: '0 0 1rem 1.25rem', padding: 0, fontSize: '0.8125rem', color: 'var(--foreground)' }}>
                {wrongCards.slice(0, 4).map((c) => (
                  <li key={c.id} style={{ marginBottom: '0.25rem' }}>
                    {c.front}
                  </li>
                ))}
                {wrongCards.length > 4 && (
                  <li style={{ color: 'var(--muted-foreground)' }}>
                    + {wrongCards.length - 4} more missed questions
                  </li>
                )}
              </ul>

              <button
                type="button"
                onClick={handleRetryWrongCards}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.5rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                }}
              >
                <RotateCw size={16} />
                <span>Attempt Wrong Cards Again ({missedCount})</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                color: '#15803d',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              🎉 Outstanding! You mastered all cards in this session.
            </div>
          )}

          {/* Action Navigation Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleRestartFullDeck}
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
              <span>Restart Full Deck</span>
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
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <Link
            href="/"
            style={{
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Return to Homepage
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link
            href={`/acad/${resourceId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            <span>{resourceTitle}</span>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {retryRound > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              Retry Mode ({cards.length} cards)
            </span>
          )}
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
          <span>
            Card {currentIndex + 1} of {cards.length}
            {wrongCards.length > 0 && (
              <span style={{ marginLeft: '0.5rem', color: '#dc2626' }}>
                ({wrongCards.length} missed)
              </span>
            )}
          </span>
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
              background: retryRound > 0 ? '#dc2626' : 'var(--primary)',
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
        // Standard Flip Card with Clear Question / Answer Distinction
        <div style={{ perspective: '1000px', width: '100%' }}>
          <div
            onClick={handleFlip}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? 'Card flipped to answer. Press space to flip back.' : 'Card showing question. Press space to flip.'}
            style={{
              minHeight: '280px',
              width: '100%',
              borderRadius: '0.875rem',
              border: `2px solid ${isFlipped ? 'var(--primary)' : 'var(--border)'}`,
              background: 'var(--card)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <BookOpen size={14} />
                  <span>
                    {currentCard.source_page
                      ? `Source: Page ${currentCard.source_page}`
                      : 'Course Resource Citation'}
                  </span>
                </div>

                {isFlipped && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(34, 197, 94, 0.12)',
                      color: '#16a34a',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  >
                    <CheckCircle2 size={11} />
                    Answer Revealed
                  </span>
                )}
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
            <div style={{ padding: '1.25rem 0', textAlign: 'left' }}>
              {isFlipped ? (
                <div>
                  {/* Subtle Question Reminder Box */}
                  <div
                    style={{
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.5rem',
                      background: 'var(--muted, #f3f4f6)',
                      border: '1px solid var(--border)',
                      marginBottom: '1rem',
                      fontSize: '0.8125rem',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong style={{ color: 'var(--foreground)' }}>Question:</strong> {currentCard.front}
                  </div>

                  {/* High-Yield Answer Text */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Answer / Key Concept
                    </div>
                    <p
                      style={{
                        fontSize: '1.0625rem',
                        fontWeight: 500,
                        lineHeight: 1.6,
                        margin: 0,
                        color: 'var(--foreground)',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {currentCard.back}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      color: 'var(--muted-foreground)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Question
                  </div>
                  <p
                    style={{
                      fontSize: '1.1875rem',
                      fontWeight: 600,
                      lineHeight: 1.5,
                      margin: 0,
                      color: 'var(--foreground)',
                    }}
                  >
                    {currentCard.front}
                  </p>
                </div>
              )}
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
              <span>{isFlipped ? 'Click card or press Space to flip back' : 'Click or press Space to reveal answer'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Answer Evaluation Controls (Revealed when card is flipped) */}
      {isFlipped && !isEditing && (
        <div style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--foreground)',
              textAlign: 'center',
              marginBottom: '0.75rem',
            }}
          >
            Did you get this question right?
          </div>

          {/* Primary Binary Buttons: Incorrect vs Correct */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.875rem',
              marginBottom: '0.75rem',
            }}
          >
            {/* Incorrect Button */}
            <button
              type="button"
              onClick={handleMarkIncorrect}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1rem',
                borderRadius: '0.625rem',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>❌ Incorrect</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8 }}>(Press 1 or X)</span>
            </button>

            {/* Correct Button */}
            <button
              type="button"
              onClick={handleMarkCorrect}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1rem',
                borderRadius: '0.625rem',
                border: '1.5px solid rgba(34, 197, 94, 0.4)',
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#16a34a',
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>✅ Correct</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8 }}>(Press 2 or C)</span>
            </button>
          </div>

          {/* Toggle for Advanced Spaced Repetition (SM-2) */}
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowAdvancedSm2((p) => !p)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {showAdvancedSm2 ? 'Hide detailed SM-2 rating' : 'Advanced SM-2 intervals (Again, Hard, Good, Easy)'}
            </button>
          </div>

          {showAdvancedSm2 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                marginTop: '0.75rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'var(--muted, #f9fafb)',
                border: '1px solid var(--border)',
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
                  padding: '0.5rem 0.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Again [1]</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 400, opacity: 0.85 }}>1 day</span>
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
                  padding: '0.5rem 0.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  color: '#d97706',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Hard [2]</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 400, opacity: 0.85 }}>1 day</span>
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
                  padding: '0.5rem 0.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  background: 'rgba(34, 197, 94, 0.08)',
                  color: '#16a34a',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Good [3]</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 400, opacity: 0.85 }}>
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
                  padding: '0.5rem 0.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  background: 'rgba(59, 130, 246, 0.08)',
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Easy [4]</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 400, opacity: 0.85 }}>+ease</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
