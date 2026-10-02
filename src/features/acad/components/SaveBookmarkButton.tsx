'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { toggleSaveResource } from '../actions'

interface SaveBookmarkButtonProps {
  resourceId: string
  initialSaved?: boolean
  className?: string
}

export function SaveBookmarkButton({
  resourceId,
  initialSaved = false,
  className = '',
}: SaveBookmarkButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Optimistic toggle
    const nextSaved = !isSaved
    setIsSaved(nextSaved)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('resource_id', resourceId)
      const res = await toggleSaveResource(formData)
      if (res.ok && res.data) {
        setIsSaved(res.data.saved)
      } else {
        // Revert on failure
        setIsSaved(!nextSaved)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isSaved ? 'Remove from saved resources' : 'Save resource'}
      title={isSaved ? 'Saved' : 'Save resource'}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: isPending ? 'wait' : 'pointer',
        padding: '0.25rem',
        borderRadius: '0.375rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isSaved ? 'var(--primary)' : 'var(--muted-foreground)',
        transition: 'color 0.15s ease, transform 0.15s ease',
      }}
    >
      <Bookmark
        size={18}
        fill={isSaved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      />
    </button>
  )
}
