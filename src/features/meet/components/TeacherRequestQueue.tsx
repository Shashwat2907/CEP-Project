'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { EmptyState } from '@/shared/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import { respondToSessionRequest, cancelSessionRequest } from '../actions'
import type { SessionRequest, SessionStatus } from '../schema'
import {
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
  MapPin,
  Video,
  PenTool,
} from 'lucide-react'
import { formatSessionDateTime, formatDeterministicDate } from '../date-format'

interface TeacherRequestQueueProps {
  initialRequests: SessionRequest[]
}

function getStatusBadge(status: SessionStatus) {
  switch (status) {
    case 'pending':
      return <Chip variant="warning">Action Needed</Chip>
    case 'accepted':
      return <Chip variant="highlight">Accepted (Awaiting Student Mode)</Chip>
    case 'offline_selected':
      return <Chip variant="success">Confirmed In-Person</Chip>
    case 'online_selected':
      return <Chip variant="highlight">Confirmed Online</Chip>
    case 'completed':
      return <Chip variant="default">Completed</Chip>
    case 'cancelled':
      return <Chip variant="danger">Cancelled</Chip>
    case 'declined':
      return <Chip variant="danger">Declined</Chip>
    case 'expired':
      return <Chip variant="ink-muted">Expired</Chip>
    default:
      return <Chip variant="default">{status}</Chip>
  }
}

function formatSessionDate(startsAt: string): { dateStr: string; timeStr: string } {
  return formatSessionDateTime(startsAt)
}

export function TeacherRequestQueue({ initialRequests }: TeacherRequestQueueProps) {
  const [requests, setRequests] = React.useState<SessionRequest[]>(initialRequests)
  const [tab, setTab] = React.useState<'pending' | 'confirmed' | 'history'>('pending')

  // Accept / Decline action states
  const [actingId, setActingId] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  // Decline dialog state
  const [decliningSession, setDecliningSession] = React.useState<SessionRequest | null>(null)
  const [declineReason, setDeclineReason] = React.useState('')
  const [isSubmittingDecline, setIsSubmittingDecline] = React.useState(false)

  // Cancel dialog state (for confirmed appointments)
  const [cancellingSession, setCancellingSession] = React.useState<SessionRequest | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  const [isCancelling, setIsCancelling] = React.useState(false)

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const confirmedRequests = requests.filter((r) =>
    ['accepted', 'offline_selected', 'online_selected'].includes(r.status)
  )
  const historyRequests = requests.filter((r) =>
    ['completed', 'declined', 'cancelled', 'expired'].includes(r.status)
  )

  const handleAccept = async (sessionId: string) => {
    setActingId(sessionId)
    setActionError(null)

    try {
      const res = await respondToSessionRequest({
        session_id: sessionId,
        action: 'accept',
      })

      if (!res.ok) {
        setActionError(res.error.message)
        setActingId(null)
        return
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === sessionId ? { ...r, status: 'accepted' as SessionStatus } : r
        )
      )
    } catch {
      setActionError('Failed to accept session request. Please try again.')
    } finally {
      setActingId(null)
    }
  }

  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!decliningSession) return

    setIsSubmittingDecline(true)
    setActionError(null)

    try {
      const res = await respondToSessionRequest({
        session_id: decliningSession.id,
        action: 'decline',
        decline_reason: declineReason.trim() || undefined,
      })

      if (!res.ok) {
        setActionError(res.error.message)
        setIsSubmittingDecline(false)
        return
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === decliningSession.id
            ? {
                ...r,
                status: 'declined' as SessionStatus,
                decline_reason: declineReason.trim() || 'Declined by faculty',
              }
            : r
        )
      )

      setDecliningSession(null)
      setDeclineReason('')
      setIsSubmittingDecline(false)
    } catch {
      setActionError('Failed to decline request. Please try again.')
      setIsSubmittingDecline(false)
    }
  }

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cancellingSession) return

    setIsCancelling(true)
    setActionError(null)

    try {
      const res = await cancelSessionRequest({
        session_id: cancellingSession.id,
        cancel_reason: cancelReason.trim() || undefined,
      })

      if (!res.ok) {
        setActionError(res.error.message)
        setIsCancelling(false)
        return
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === cancellingSession.id
            ? {
                ...r,
                status: 'cancelled' as SessionStatus,
                decline_reason: cancelReason.trim() || 'Cancelled by faculty',
              }
            : r
        )
      )

      setCancellingSession(null)
      setCancelReason('')
      setIsCancelling(false)
    } catch {
      setActionError('Failed to cancel session. Please try again.')
      setIsCancelling(false)
    }
  }

  const currentList =
    tab === 'pending'
      ? pendingRequests
      : tab === 'confirmed'
      ? confirmedRequests
      : historyRequests

  return (
    <div className="space-y-4">
      {/* Navigation tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={tab === 'pending' ? 'primary' : 'outline'}
            onClick={() => setTab('pending')}
            className="gap-1.5"
          >
            <span>Pending Requests</span>
            {pendingRequests.length > 0 && (
              <span className="bg-warning text-surface px-1.5 py-0.5 rounded-full text-[11px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant={tab === 'confirmed' ? 'primary' : 'outline'}
            onClick={() => setTab('confirmed')}
          >
            Confirmed Appointments ({confirmedRequests.length})
          </Button>

          <Button
            size="sm"
            variant={tab === 'history' ? 'primary' : 'outline'}
            onClick={() => setTab('history')}
          >
            History ({historyRequests.length})
          </Button>
        </div>

        <span className="text-meta text-ink-muted">
          Showing {currentList.length} request{currentList.length === 1 ? '' : 's'}
        </span>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger p-3 rounded-md text-small">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* List */}
      {currentList.length === 0 ? (
        <EmptyState
          title={
            tab === 'pending'
              ? 'No pending appointment requests'
              : tab === 'confirmed'
              ? 'No confirmed appointments scheduled'
              : 'No past appointments found'
          }
          description={
            tab === 'pending'
              ? 'When students submit office hour requests, they will appear here for your review.'
              : 'Appointments accepted and scheduled with students will be listed here.'
          }
        />
      ) : (
        <div className="space-y-4">
          {currentList.map((r) => {
            const { dateStr, timeStr } = formatSessionDate(r.starts_at)
            const isPending = r.status === 'pending'
            const isConfirmed = ['accepted', 'offline_selected', 'online_selected'].includes(r.status)

            return (
              <Card key={r.id} className="bg-surface hover:border-border-strong transition-all">
                <CardContent className="p-5 space-y-4">
                  {/* Student & Status Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-surface-sunken border border-border flex items-center justify-center text-ink font-semibold text-small shrink-0">
                        {(r.student?.full_name ?? 'S')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink text-base">
                          {r.student?.full_name ?? 'Student'}
                        </h3>
                        <p className="text-meta text-ink-muted">{r.student?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(r.status)}
                    </div>
                  </div>

                  {/* Date, Time & Meeting Type */}
                  <div className="grid sm:grid-cols-2 gap-3 text-small text-ink">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-ink-muted text-meta">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                        <span>Requested Time</span>
                      </div>
                      <p className="font-medium" suppressHydrationWarning>
                        {dateStr} at {timeStr}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-ink-muted text-meta">
                        {r.mode === 'online' ? (
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-success" />
                        )}
                        <span>Mode / Location</span>
                      </div>
                      <p className="font-medium">
                        {r.location || (r.status === 'accepted' ? 'Awaiting student mode selection' : 'Pending')}
                      </p>
                    </div>
                  </div>

                  {/* Student Request Reason */}
                  <div className="bg-surface-sunken p-3 rounded-md border border-border/40 space-y-1">
                    <span className="text-meta text-ink-muted font-medium block">
                      Student Reason / Agenda:
                    </span>
                    <p className="text-small text-ink leading-relaxed whitespace-pre-wrap">
                      {r.reason}
                    </p>
                  </div>

                  {/* Note / Decline Reason */}
                  {r.decline_reason && (
                    <div className="bg-danger/5 border border-danger/20 text-danger p-3 rounded-md text-small flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Decline/Cancel Note: </span>
                        <span>{r.decline_reason}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="text-meta text-ink-muted flex items-center gap-1.5" suppressHydrationWarning>
                      <Clock className="h-3.5 w-3.5" />
                      <span>Requested on {formatDeterministicDate(r.created_at, 'date-only')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-danger hover:bg-danger/10 hover:border-danger/40 gap-1"
                            disabled={actingId === r.id}
                            onClick={() => setDecliningSession(r)}
                          >
                            <X className="h-3.5 w-3.5" /> Decline
                          </Button>

                          <Button
                            size="sm"
                            variant="primary"
                            className="gap-1 bg-success hover:bg-success-hover text-surface"
                            disabled={actingId === r.id}
                            onClick={() => handleAccept(r.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {actingId === r.id ? 'Accepting...' : 'Accept Appointment'}
                          </Button>
                        </>
                      )}

                      {isConfirmed && (r.mode === 'online' || r.status === 'online_selected') && (
                        <Link href={`/meet/${r.id}?force=true`}>
                          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium">
                            <Video className="h-3.5 w-3.5" />
                            <span>Join Video Call</span>
                          </Button>
                        </Link>
                      )}

                      {r.status === 'completed' && (
                        <Link href={`/meet/${r.id}/whiteboard`}>
                          <Button size="sm" variant="outline" className="gap-1.5 font-medium text-ink">
                            <PenTool className="h-3.5 w-3.5 text-accent" />
                            <span>View Whiteboard</span>
                          </Button>
                        </Link>
                      )}

                      {isConfirmed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-danger hover:bg-danger/10 hover:border-danger/40"
                          onClick={() => setCancellingSession(r)}
                        >
                          Cancel Appointment
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Decline Confirmation Modal */}
      <Dialog
        open={Boolean(decliningSession)}
        onOpenChange={(open) => !open && setDecliningSession(null)}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmDecline} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-danger">Decline Appointment Request</DialogTitle>
              <DialogDescription>
                Decline appointment with {decliningSession?.student?.full_name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label htmlFor="decline-reason" className="text-small font-medium text-ink">
                Reason for declining (Optional)
              </label>
              <textarea
                id="decline-reason"
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Please book during my Friday afternoon slot or consult during lecture..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-small text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDecliningSession(null)}
                disabled={isSubmittingDecline}
              >
                Go Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-danger hover:bg-danger-hover text-surface"
                disabled={isSubmittingDecline}
              >
                {isSubmittingDecline ? 'Declining...' : 'Confirm Decline'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog
        open={Boolean(cancellingSession)}
        onOpenChange={(open) => !open && setCancellingSession(null)}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmCancel} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-danger">Cancel Appointment</DialogTitle>
              <DialogDescription>
                Cancel appointment with {cancellingSession?.student?.full_name}. Calendar entries will be removed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label htmlFor="teacher-cancel-reason" className="text-small font-medium text-ink">
                Reason for cancellation
              </label>
              <textarea
                id="teacher-cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Urgent departmental meeting scheduled..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-small text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancellingSession(null)}
                disabled={isCancelling}
              >
                Keep Appointment
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-danger hover:bg-danger-hover text-surface"
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
