'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Layers, Loader2, AlertCircle } from 'lucide-react'
import { generateFlashcardsDeck } from '../actions'

interface FlashcardDeckButtonProps {
  resourceId: string
  hasDeck: boolean
  cardCount: number
  dueCount?: number
  processingStatus?: string
}

export function FlashcardDeckButton({
  resourceId,
  hasDeck,
  cardCount,
  dueCount = 0,
  processingStatus = 'ready',
}: FlashcardDeckButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleGenerate = () => {
    setErrorMsg(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('resource_id', resourceId)

      const result = await generateFlashcardsDeck(formData)
      if (result.ok) {
        router.push(`/acad/${resourceId}/flashcards`)
        router.refresh()
      } else {
        setErrorMsg(result.error.message)
      }
    })
  }

  if (hasDeck && cardCount > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
        <Link
          href={`/acad/${resourceId}/flashcards`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: 'var(--primary)',
            color: 'var(--primary-foreground, #fff)',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
          }}
        >
          <Layers size={16} />
          <span>Study Flashcards ({cardCount} cards)</span>
          {dueCount > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.25)',
                fontWeight: 700,
              }}
            >
              {dueCount} due
            </span>
          )}
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending || processingStatus === 'processing'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--primary)',
          background: 'var(--primary-subtle, rgba(59, 130, 246, 0.08))',
          color: 'var(--primary)',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: isPending || processingStatus === 'processing' ? 'not-allowed' : 'pointer',
          opacity: isPending || processingStatus === 'processing' ? 0.7 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Generating Flashcards with AI...</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span>Generate Flashcards (AI)</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.75rem',
            color: 'var(--destructive, #ef4444)',
            background: 'var(--destructive-subtle, rgba(239, 68, 68, 0.08))',
            padding: '0.375rem 0.5rem',
            borderRadius: '0.375rem',
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
