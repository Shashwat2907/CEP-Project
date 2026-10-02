'use client'

import { useTransition, useState } from 'react'
import { approveResource, rejectResource } from '../actions'
import type { Resource } from '../schema'
import { ResourceCard } from './ResourceCard'

interface ApprovalQueueProps {
  resources: Resource[]
}

export function ApprovalQueue({ resources }: ApprovalQueueProps) {
  if (resources.length === 0) {
    return (
      <div
        role="status"
        aria-label="No pending resources"
        style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}
      >
        <p style={{ fontSize: '1rem' }}>✅ No pending resources</p>
        <p style={{ fontSize: '0.875rem' }}>All student uploads have been reviewed.</p>
      </div>
    )
  }

  return (
    <section aria-label="Approval queue">
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Pending Approvals ({resources.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {resources.map((r) => (
          <ApprovalRow key={r.id} resource={r} />
        ))}
      </div>
    </section>
  )
}

function ApprovalRow({ resource }: { resource: Resource }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  function handleApprove() {
    setError(null)
    const fd = new FormData()
    fd.set('resource_id', resource.id)
    startTransition(async () => {
      const result = await approveResource(fd)
      if (!result.ok) setError(result.error.message)
    })
  }

  function handleReject() {
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please enter a reason of at least 5 characters.')
      return
    }
    setError(null)
    const fd = new FormData()
    fd.set('resource_id', resource.id)
    fd.set('rejection_reason', reason.trim())
    startTransition(async () => {
      const result = await rejectResource(fd)
      if (!result.ok) setError(result.error.message)
      else setShowReject(false)
    })
  }

  return (
    <ResourceCard
      resource={resource}
      showStatus
      actions={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!showReject ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id={`approve-btn-${resource.id}`}
                onClick={handleApprove}
                disabled={isPending}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '0.375rem',
                  background: 'var(--success, #16a34a)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? 'Approving…' : 'Approve'}
              </button>
              <button
                id={`reject-btn-${resource.id}`}
                onClick={() => setShowReject(true)}
                disabled={isPending}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '0.375rem',
                  background: 'var(--destructive)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                Reject
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                id={`reject-reason-${resource.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection (required)…"
                rows={2}
                maxLength={500}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  id={`confirm-reject-btn-${resource.id}`}
                  onClick={handleReject}
                  disabled={isPending}
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '0.375rem',
                    background: 'var(--destructive)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'Rejecting…' : 'Confirm rejection'}
                </button>
                <button
                  onClick={() => { setShowReject(false); setReason(''); setError(null) }}
                  disabled={isPending}
                  style={{ padding: '0.375rem 0.875rem', borderRadius: '0.375rem', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" style={{ fontSize: '0.8rem', color: 'var(--destructive)', margin: 0 }}>
              {error}
            </p>
          )}
        </div>
      }
    />
  )
}
