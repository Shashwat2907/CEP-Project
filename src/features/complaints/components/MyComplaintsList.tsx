'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { EmptyState } from '@/shared/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import { Clock, CheckCircle2, RotateCcw, AlertTriangle, Shield, ArrowRight } from 'lucide-react'
import { confirmResolution, reopenComplaint } from '../actions'
import type { Complaint, ComplaintStatus } from '../schema'

interface MyComplaintsListProps {
  complaints: Complaint[]
}

function getStatusBadge(status: ComplaintStatus) {
  switch (status) {
    case 'submitted':
      return <Chip variant="default">Submitted</Chip>
    case 'in_progress':
      return <Chip variant="highlight">In Progress</Chip>
    case 'escalated':
      return <Chip variant="danger">Escalated</Chip>
    case 'resolved':
      return <Chip variant="success">Resolved</Chip>
    case 'reopened':
      return <Chip variant="warning">Reopened</Chip>
    case 'closed':
      return <Chip variant="ink-muted">Closed</Chip>
  }
}

export function MyComplaintsList({ complaints }: MyComplaintsListProps) {
  const [reopenTargetId, setReopenTargetId] = React.useState<string | null>(null)
  const [reopenNote, setReopenNote] = React.useState('')
  const [loadingId, setLoadingId] = React.useState<string | null>(null)

  const handleConfirm = async (id: string) => {
    setLoadingId(id)
    try {
      await confirmResolution(id)
    } finally {
      setLoadingId(null)
    }
  }

  const handleReopen = async () => {
    if (!reopenTargetId || reopenNote.trim().length < 5) return
    setLoadingId(reopenTargetId)
    try {
      await reopenComplaint({
        complaint_id: reopenTargetId,
        reopen_note: reopenNote.trim(),
      })
      setReopenTargetId(null)
      setReopenNote('')
    } finally {
      setLoadingId(null)
    }
  }

  if (complaints.length === 0) {
    return (
      <EmptyState
        title="No complaints filed"
        description="You have not raised any grievances. When you submit a complaint, you can track its resolution and escalation status here."
      />
    )
  }

  return (
    <div className="space-y-3">
      {complaints.map((c) => {
        const isResolved = c.status === 'resolved'
        const isClosed = c.status === 'closed'
        const dueTime = c.due_at ? new Date(c.due_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) : null

        return (
          <Card key={c.id} className="transition-colors hover:border-ink/20">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(c.status)}
                  <span className="text-meta text-ink-muted">
                    {c.domain?.name ?? 'General'}
                  </span>
                  <span className="text-meta text-ink-muted">• Level {c.current_level}</span>
                  {c.anonymous && (
                    <span className="inline-flex items-center gap-1 text-meta text-ink-muted">
                      <Shield className="h-3 w-3" /> Anonymous
                    </span>
                  )}
                </div>

                {c.due_at && !isResolved && !isClosed && (
                  <div className="flex items-center gap-1 text-meta text-ink-muted">
                    <Clock className="h-3.5 w-3.5" />
                    <span>SLA due: {dueTime}</span>
                  </div>
                )}
              </div>

              <div className="mt-2">
                <Link
                  href={`/complaints/${c.id}`}
                  className="font-display font-medium text-ink hover:underline line-clamp-1"
                >
                  {c.title}
                </Link>
                <p className="mt-1 text-small text-ink-muted line-clamp-2">{c.body}</p>
              </div>

              {/* Resolved Note & Confirmation actions */}
              {isResolved && (
                <div className="mt-3 rounded-md border border-success/30 bg-success/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-small font-medium text-success">Resolution Note from Authority:</p>
                      <p className="text-small text-ink mt-0.5">{c.resolution_note || 'Issue marked resolved.'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1 bg-success text-white hover:bg-success/90"
                      onClick={() => handleConfirm(c.id)}
                      disabled={loadingId === c.id}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Confirm Fixed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-warning/40 text-warning hover:bg-warning/10"
                      onClick={() => {
                        setReopenTargetId(c.id)
                        setReopenNote('')
                      }}
                      disabled={loadingId === c.id}
                    >
                      <RotateCcw className="h-4 w-4" /> Reopen Ticket
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-meta text-ink-muted">
                <span>Submitted {new Date(c.created_at).toLocaleDateString()}</span>
                <Link
                  href={`/complaints/${c.id}`}
                  className="inline-flex items-center gap-1 text-ink hover:underline font-medium"
                >
                  View Details <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Reopen Modal Dialog */}
      <Dialog open={!!reopenTargetId} onOpenChange={(open) => !open && setReopenTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Complaint</DialogTitle>
            <DialogDescription>
              If the problem was not fixed satisfactorily, please explain what is still unresolved.
              The ticket will return to active status with higher priority.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <textarea
              className="min-h-[100px] w-full rounded-md border border-border bg-surface p-3 text-small text-ink focus:border-ink focus:outline-none"
              placeholder="Explain what is still broken or incomplete..."
              value={reopenNote}
              onChange={(e) => setReopenNote(e.target.value)}
              minLength={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenTargetId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-warning text-white hover:bg-warning/90"
              onClick={handleReopen}
              disabled={reopenNote.trim().length < 5 || loadingId === reopenTargetId}
            >
              Reopen Grievance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
