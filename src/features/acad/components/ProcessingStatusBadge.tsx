'use client'

import { useTransition } from 'react'
import { Sparkles, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import type { ProcessingStatus } from '../schema'
import { retryResourceProcessing } from '../actions'

interface ProcessingStatusBadgeProps {
  status: ProcessingStatus
  resourceId?: string
  chunkCount?: number
  canRetry?: boolean
  className?: string
}

export function ProcessingStatusBadge({
  status,
  resourceId,
  chunkCount,
  canRetry = true,
  className = '',
}: ProcessingStatusBadgeProps) {
  const [isPending, startTransition] = useTransition()

  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!resourceId || isPending) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set('resource_id', resourceId)
      await retryResourceProcessing(formData)
    })
  }

  if (status === 'ready') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 ${className}`}
        title={chunkCount ? `${chunkCount} searchable text chunks extracted` : 'Ready for AI Flashcards & Doubt Chat'}
      >
        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>Ready for AI</span>
        {chunkCount !== undefined && chunkCount > 0 && (
          <span className="text-[10px] opacity-80 font-mono">({chunkCount} chunks)</span>
        )}
      </span>
    )
  }

  if (status === 'processing' || isPending) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 animate-pulse ${className}`}
        title="Processing text embeddings..."
      >
        <Loader2 className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />
        <span>Processing AI...</span>
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800/40"
          title="Text processing failed"
        >
          <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
          <span>Processing failed</span>
        </span>
        {canRetry && resourceId && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--surface-sunken)] border border-[var(--border)] rounded-md transition-colors disabled:opacity-50"
            title="Retry text chunking and embeddings"
          >
            <RotateCcw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        )}
      </div>
    )
  }

  // 'not_started' or default
  return null
}
