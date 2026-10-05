'use client'

import * as React from 'react'
import { Bot } from 'lucide-react'
import { DoubtChatModal } from './DoubtChatModal'
import type { ProcessingStatus, DoubtMessage } from '../schema'

interface DoubtChatButtonProps {
  resourceId: string
  resourceTitle: string
  processingStatus: ProcessingStatus
  initialMessages?: DoubtMessage[]
  initialThreadId?: string
}

export function DoubtChatButton({
  resourceId,
  resourceTitle,
  processingStatus,
  initialMessages = [],
  initialThreadId,
}: DoubtChatButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const isReady = processingStatus === 'ready'

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isReady) setIsOpen(true)
        }}
        disabled={!isReady}
        aria-label="Open Doubt AI Chat"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.875rem 1rem',
          borderRadius: 'var(--r-sm, 6px)',
          border: isReady ? '1px solid var(--border)' : '1px dashed var(--border)',
          backgroundColor: 'var(--surface-sunken)',
          color: isReady ? 'var(--ink)' : 'var(--ink-muted)',
          cursor: isReady ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem', color: isReady ? 'var(--ink)' : 'var(--ink-muted)' }}>
          <Bot size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Doubt AI Chat</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
          {isReady ? 'Ask questions with page citations' : 'Available once document processing is complete'}
        </div>
      </button>

      {isOpen && (
        <DoubtChatModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          resourceId={resourceId}
          scopeTitle={resourceTitle}
          initialMessages={initialMessages}
          initialThreadId={initialThreadId}
        />
      )}
    </>
  )
}
