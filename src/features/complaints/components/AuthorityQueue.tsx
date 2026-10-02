'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { EmptyState } from '@/shared/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import { Clock, CheckCircle2, Play, AlertTriangle, Shield, User, ArrowRight } from 'lucide-react'
import { resolveComplaint, updateComplaintStatus } from '../actions'
import type { Complaint } from '../schema'

interface AuthorityQueueProps {
  complaints: Complaint[]
}

export function AuthorityQueue({ complaints }: AuthorityQueueProps) {
  const [filter, setFilter] = React.useState<string>('active')
  const [resolveTargetId, setResolveTargetId] = React.useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = React.useState('')
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const filtered = complaints.filter((c) => {
    if (filter === 'active') return c.status === 'submitted' || c.status === 'in_progress' || c.status === 'escalated' || c.status === 'reopened'
    if (filter === 'resolved') return c.status === 'resolved' || c.status === 'closed'
    return true
  })

  const handleStartWorking = async (id: string) => {
    setActionLoading(id)
    try {
      await updateComplaintStatus({
        complaint_id: id,
        status: 'in_progress',
        note: 'Authority started working on the grievance',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolveSubmit = async () => {
    if (!resolveTargetId || resolutionNote.trim().length < 5) return
    setActionLoading(resolveTargetId)
    setError(null)
    try {
      const res = await resolveComplaint({
        complaint_id: resolveTargetId,
        resolution_note: resolutionNote.trim(),
      })
      if (!res.ok) {
        setError(res.error.message)
      } else {
        setResolveTargetId(null)
        setResolutionNote('')
      }
    } catch {
      setError('Failed to resolve complaint. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          size="sm"
          variant={filter === 'active' ? 'default' : 'ghost'}
          onClick={() => setFilter('active')}
        >
          Active Queue ({complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'resolved' ? 'default' : 'ghost'}
          onClick={() => setFilter('resolved')}
        >
          Resolved / Closed
        </Button>
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilter('all')}
        >
          All ({complaints.length})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No complaints in queue"
          description="There are currently no tickets assigned to you under this filter."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const isEscalated = c.status === 'escalated'
            const isReopened = c.status === 'reopened'
            const isResolved = c.status === 'resolved' || c.status === 'closed'
            const dueTime = c.due_at ? new Date(c.due_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }) : null

            return (
              <Card key={c.id} className={isEscalated ? 'border-danger/40 bg-surface' : 'bg-surface'}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isEscalated ? (
                        <Chip variant="danger">Escalated (Level {c.current_level})</Chip>
                      ) : isReopened ? (
                        <Chip variant="warning">Reopened by Student</Chip>
                      ) : (
                        <Chip variant={c.status === 'in_progress' ? 'highlight' : 'default'}>
                          {c.status.toUpperCase()}
                        </Chip>
                      )}
                      <span className="text-meta font-medium text-ink-muted">{c.domain?.name}</span>
                      <span className="text-meta text-ink-muted">• Level {c.current_level}</span>
                    </div>

                    {c.due_at && !isResolved && (
                      <div className="flex items-center gap-1 text-meta text-ink-muted">
                        <Clock className="h-3.5 w-3.5 text-warning" />
                        <span>SLA: {dueTime}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <Link
                      href={`/complaints/${c.id}`}
                      className="font-display font-medium text-ink hover:underline line-clamp-1"
                    >
                      {c.title}
                    </Link>
                    <p className="mt-1 text-small text-ink-muted line-clamp-2">{c.body}</p>
                  </div>

                  {/* Student Reopen Reason Alert */}
                  {c.reopen_note && (
                    <div className="mt-2.5 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-small">
                      <span className="font-semibold text-warning">Student Reopen Note: </span>
                      <span className="text-ink">{c.reopen_note}</span>
                    </div>
                  )}

                  {/* Footer & Action Controls */}
                  <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-border/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-meta text-ink-muted">
                      <User className="h-3.5 w-3.5" />
                      <span>{c.anonymous ? 'Anonymous Student' : c.author?.full_name ?? 'Student'}</span>
                      <span>•</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>

                    {!isResolved && (
                      <div className="flex items-center gap-2">
                        {c.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleStartWorking(c.id)}
                            disabled={actionLoading === c.id}
                          >
                            <Play className="h-3.5 w-3.5" /> Start Working
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="gap-1 bg-success text-white hover:bg-success/90"
                          onClick={() => {
                            setResolveTargetId(c.id)
                            setResolutionNote('')
                            setError(null)
                          }}
                          disabled={actionLoading === c.id}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Resolve Ticket
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!resolveTargetId} onOpenChange={(open) => !open && setResolveTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Complaint</DialogTitle>
            <DialogDescription>
              Explain the steps taken to rectify the issue. The student will be notified and given 3 days to verify the resolution.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-2.5 text-small text-danger">
              {error}
            </div>
          )}

          <div className="py-2">
            <label className="mb-1 block text-small font-medium text-ink">
              Resolution Note <span className="text-danger">*</span>
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-border bg-surface p-3 text-small text-ink focus:border-ink focus:outline-none"
              placeholder="e.g. Electrician visited Room 204 and replaced the damaged switch. Verified working."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              minLength={5}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTargetId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-success text-white hover:bg-success/90"
              onClick={handleResolveSubmit}
              disabled={resolutionNote.trim().length < 5 || actionLoading === resolveTargetId}
            >
              {actionLoading === resolveTargetId ? 'Submitting...' : 'Mark as Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
