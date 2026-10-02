'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import { Clock, CheckCircle2, RotateCcw, Shield, ArrowLeft, User, AlertCircle } from 'lucide-react'
import { confirmResolution, reopenComplaint, resolveComplaint } from '../actions'
import { ComplaintTimeline } from './ComplaintTimeline'
import type { Complaint } from '../schema'

interface ComplaintDetailProps {
  complaint: Complaint
  currentUserId: string
  currentUserRole: string
}

export function ComplaintDetail({
  complaint,
  currentUserId,
  currentUserRole,
}: ComplaintDetailProps) {
  const [resolveOpen, setResolveOpen] = React.useState(false)
  const [resolutionNote, setResolutionNote] = React.useState('')
  const [reopenOpen, setReopenOpen] = React.useState(false)
  const [reopenNote, setReopenNote] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const isAuthor = complaint.author_id === currentUserId
  const isAssigned = complaint.assigned_to === currentUserId || currentUserRole === 'admin'
  const isResolved = complaint.status === 'resolved'
  const isClosed = complaint.status === 'closed'

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await confirmResolution(complaint.id)
    } finally {
      setLoading(false)
    }
  }

  const handleReopen = async () => {
    if (reopenNote.trim().length < 5) return
    setLoading(true)
    try {
      await reopenComplaint({
        complaint_id: complaint.id,
        reopen_note: reopenNote.trim(),
      })
      setReopenOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    if (resolutionNote.trim().length < 5) return
    setLoading(true)
    try {
      await resolveComplaint({
        complaint_id: complaint.id,
        resolution_note: resolutionNote.trim(),
      })
      setResolveOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/complaints"
          className="inline-flex items-center gap-1.5 text-small text-ink-muted hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Complaints
        </Link>
      </div>

      {/* Main Ticket Card */}
      <Card className="bg-surface">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip
                variant={
                  complaint.status === 'resolved'
                    ? 'success'
                    : complaint.status === 'escalated'
                    ? 'danger'
                    : complaint.status === 'in_progress'
                    ? 'highlight'
                    : 'default'
                }
              >
                {complaint.status.toUpperCase()}
              </Chip>
              <span className="text-small font-semibold text-ink">
                {complaint.domain?.name}
              </span>
              <span className="text-meta text-ink-muted">• Level {complaint.current_level}</span>
            </div>

            {complaint.due_at && !isResolved && !isClosed && (
              <div className="flex items-center gap-1.5 text-meta text-warning font-medium">
                <Clock className="h-4 w-4" />
                <span>
                  SLA Target: {new Date(complaint.due_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          <CardTitle className="mt-2 text-h2">{complaint.title}</CardTitle>
          <div className="mt-1 flex items-center gap-3 text-meta text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {complaint.anonymous && !isAuthor && currentUserRole !== 'admin'
                ? 'Anonymous Student'
                : complaint.author?.full_name ?? 'Student'}
            </span>
            <span>•</span>
            <span>Created {new Date(complaint.created_at).toLocaleDateString()}</span>
            {complaint.anonymous && (
              <span className="inline-flex items-center gap-1 text-ink">
                <Shield className="h-3.5 w-3.5 text-ink-muted" /> Anonymous Submission
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {/* Body Description */}
          <div>
            <h4 className="text-meta uppercase font-semibold text-ink-muted tracking-wider">
              Grievance Details
            </h4>
            <p className="mt-2 text-body text-ink whitespace-pre-wrap leading-relaxed">
              {complaint.body}
            </p>
          </div>

          {/* Resolution Alert */}
          {complaint.resolution_note && (
            <div className="rounded-md border border-success/30 bg-success/10 p-4">
              <div className="flex items-center gap-2 text-success font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                <span>Resolved Note</span>
              </div>
              <p className="mt-1 text-small text-ink">{complaint.resolution_note}</p>
            </div>
          )}

          {/* Student Actions if Resolved */}
          {isAuthor && isResolved && (
            <div className="rounded-md border border-border bg-surface-sunken p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-small text-ink">Is your issue satisfactorily resolved?</p>
                <p className="text-meta text-ink-muted">Confirm to close the ticket or reopen if the problem persists.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-success text-white hover:bg-success/90 gap-1"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirm Fixed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-warning/40 text-warning hover:bg-warning/10 gap-1"
                  onClick={() => setReopenOpen(true)}
                  disabled={loading}
                >
                  <RotateCcw className="h-4 w-4" /> Reopen Ticket
                </Button>
              </div>
            </div>
          )}

          {/* Handler Actions */}
          {isAssigned && !isResolved && !isClosed && (
            <div className="pt-2 border-t border-border/60 flex justify-end">
              <Button
                className="bg-success text-white hover:bg-success/90 gap-1.5"
                onClick={() => setResolveOpen(true)}
                disabled={loading}
              >
                <CheckCircle2 className="h-4 w-4" /> Mark as Resolved
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Stepper Card */}
      <Card className="bg-surface">
        <CardHeader>
          <CardTitle className="text-h3">Activity & Escalation Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplaintTimeline events={complaint.events || []} />
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Grievance</DialogTitle>
            <DialogDescription>
              Detail what action was taken to resolve this complaint. The student will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <textarea
              className="min-h-[100px] w-full rounded-md border border-border bg-surface p-3 text-small text-ink focus:border-ink focus:outline-none"
              placeholder="e.g. Replaced faulty lab monitor with serial #4092. Tested working."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              minLength={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-success text-white hover:bg-success/90"
              onClick={handleResolve}
              disabled={resolutionNote.trim().length < 5 || loading}
            >
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Complaint</DialogTitle>
            <DialogDescription>
              Explain why the grievance is not resolved. The authority will receive an alert to take further action.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <textarea
              className="min-h-[100px] w-full rounded-md border border-border bg-surface p-3 text-small text-ink focus:border-ink focus:outline-none"
              placeholder="Explain why the issue still persists..."
              value={reopenNote}
              onChange={(e) => setReopenNote(e.target.value)}
              minLength={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-warning text-white hover:bg-warning/90"
              onClick={handleReopen}
              disabled={reopenNote.trim().length < 5 || loading}
            >
              Reopen Grievance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
