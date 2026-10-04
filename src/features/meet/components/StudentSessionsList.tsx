'use client'

import * as React from 'react'
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
import { selectSessionMode, cancelSessionRequest } from '../actions'
import type { SessionRequest, SessionStatus } from '../schema'
import {
  Calendar,
  MapPin,
  Video,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'

interface StudentSessionsListProps {
  initialSessions: SessionRequest[]
}

function getStatusBadge(status: SessionStatus) {
  switch (status) {
    case 'pending':
      return <Chip variant="warning">Pending Faculty Review</Chip>
    case 'accepted':
      return <Chip variant="highlight">Accepted — Pick Mode</Chip>
    case 'offline_selected':
      return <Chip variant="success">Confirmed (In-Person)</Chip>
    case 'online_selected':
      return <Chip variant="highlight">Confirmed (Online Call)</Chip>
    case 'completed':
      return <Chip variant="default">Completed</Chip>
    case 'cancelled':
      return <Chip variant="danger">Cancelled</Chip>
    case 'declined':
      return <Chip variant="danger">Declined</Chip>
    case 'expired':
      return <Chip variant="ink-muted">Expired (48h)</Chip>
    default:
      return <Chip variant="default">{status}</Chip>
  }
}

function formatSessionDate(startsAt: string): { dateStr: string; timeStr: string } {
  const dt = new Date(startsAt)
  const dateStr = dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = dt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { dateStr, timeStr }
}

export function StudentSessionsList({ initialSessions }: StudentSessionsListProps) {
  const [sessions, setSessions] = React.useState<SessionRequest[]>(initialSessions)
  const [filter, setFilter] = React.useState<'all' | 'active' | 'past'>('all')

  // Mode Selection State
  const [modeLoadingId, setModeLoadingId] = React.useState<string | null>(null)
  const [modeError, setModeError] = React.useState<string | null>(null)

  // Cancel Modal State
  const [cancellingSession, setCancellingSession] = React.useState<SessionRequest | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [cancelError, setCancelError] = React.useState<string | null>(null)

  const handleSelectMode = async (sessionId: string, mode: 'offline' | 'online') => {
    setModeLoadingId(sessionId)
    setModeError(null)

    try {
      const res = await selectSessionMode({ session_id: sessionId, mode })
      if (!res.ok) {
        setModeError(res.error.message)
        setModeLoadingId(null)
        return
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: mode === 'offline' ? 'offline_selected' : 'online_selected',
                mode,
                location: res.data.location,
                room_id: res.data.roomId,
              }
            : s
        )
      )
    } catch {
      setModeError('Failed to select meeting mode. Please try again.')
    } finally {
      setModeLoadingId(null)
    }
  }

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cancellingSession) return

    setIsCancelling(true)
    setCancelError(null)

    try {
      const res = await cancelSessionRequest({
        session_id: cancellingSession.id,
        cancel_reason: cancelReason.trim() || undefined,
      })

      if (!res.ok) {
        setCancelError(res.error.message)
        setIsCancelling(false)
        return
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === cancellingSession.id
            ? {
                ...s,
                status: 'cancelled',
                decline_reason: cancelReason.trim() || 'Cancelled by student',
              }
            : s
        )
      )

      setCancellingSession(null)
      setCancelReason('')
      setIsCancelling(false)
    } catch {
      setCancelError('Failed to cancel session. Please try again.')
      setIsCancelling(false)
    }
  }

  const filtered = sessions.filter((s) => {
    if (filter === 'active') {
      return ['pending', 'accepted', 'offline_selected', 'online_selected'].includes(s.status)
    }
    if (filter === 'past') {
      return ['completed', 'cancelled', 'declined', 'expired'].includes(s.status)
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Appointments ({sessions.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'active' ? 'primary' : 'outline'}
            onClick={() => setFilter('active')}
          >
            Active & Upcoming
          </Button>
          <Button
            size="sm"
            variant={filter === 'past' ? 'primary' : 'outline'}
            onClick={() => setFilter('past')}
          >
            History & Past
          </Button>
        </div>

        <span className="text-meta text-ink-muted">
          Showing {filtered.length} appointment{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {modeError && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger p-3 rounded-md text-small">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{modeError}</span>
        </div>
      )}

      {/* Sessions Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No appointments found"
          description={
            filter === 'active'
              ? 'You have no active or upcoming meetings. Browse faculty to book an office hour.'
              : 'You have not booked any appointments yet.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const { dateStr, timeStr } = formatSessionDate(s.starts_at)
            const canCancel = ['pending', 'accepted', 'offline_selected', 'online_selected'].includes(s.status)
            const isAcceptedPendingMode = s.status === 'accepted'

            return (
              <Card key={s.id} className="bg-surface hover:border-border-strong transition-all">
                <CardContent className="p-5 space-y-4">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-surface-sunken border border-border flex items-center justify-center text-ink font-semibold text-small shrink-0">
                        {(s.teacher?.full_name ?? 'F')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink text-base">
                          {s.teacher?.full_name ?? 'Faculty Member'}
                        </h3>
                        <p className="text-meta text-ink-muted">
                          {s.teacher?.department ?? 'Department'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(s.status)}
                    </div>
                  </div>

                  {/* Date, Time & Location Summary */}
                  <div className="grid sm:grid-cols-2 gap-3 text-small text-ink">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-ink-muted text-meta">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                        <span>Date & Time</span>
                      </div>
                      <p className="font-medium">
                        {dateStr} at {timeStr}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-ink-muted text-meta">
                        {s.mode === 'online' ? (
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-success" />
                        )}
                        <span>Meeting Mode & Location</span>
                      </div>
                      <p className="font-medium">
                        {s.location || (isAcceptedPendingMode ? 'Pending your selection' : 'To be confirmed')}
                      </p>
                    </div>
                  </div>

                  {/* Student Reason */}
                  <div className="bg-surface-sunken p-3 rounded-md border border-border/40 space-y-1">
                    <span className="text-meta text-ink-muted font-medium block">
                      Your Request Agenda:
                    </span>
                    <p className="text-small text-ink leading-relaxed whitespace-pre-wrap">
                      {s.reason}
                    </p>
                  </div>

                  {/* Decline or Cancel Note if present */}
                  {s.decline_reason && (
                    <div className="bg-danger/5 border border-danger/20 text-danger p-3 rounded-md text-small flex items-start gap-2">
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Note: </span>
                        <span>{s.decline_reason}</span>
                      </div>
                    </div>
                  )}

                  {/* Mode Selection Prompt (Only when Accepted) */}
                  {isAcceptedPendingMode && (
                    <div className="bg-accent/5 border border-accent/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-accent font-semibold text-small">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Session confirmed! Please choose how you would like to meet:</span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={modeLoadingId === s.id}
                          onClick={() => handleSelectMode(s.id, 'offline')}
                          className="h-auto p-3 flex flex-col items-start text-left gap-1 hover:border-ink hover:bg-surface"
                        >
                          <div className="flex items-center gap-2 font-semibold text-small text-ink">
                            <MapPin className="h-4 w-4 text-success" />
                            <span>In-Person Meeting</span>
                          </div>
                          <p className="text-meta text-ink-muted">
                            Meet at faculty cabin ({s.teacher?.office_hours_text || 'Faculty Office'}).
                          </p>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={modeLoadingId === s.id}
                          onClick={() => handleSelectMode(s.id, 'online')}
                          className="h-auto p-3 flex flex-col items-start text-left gap-1 hover:border-ink hover:bg-surface"
                        >
                          <div className="flex items-center gap-2 font-semibold text-small text-ink">
                            <Video className="h-4 w-4 text-blue-500" />
                            <span>Online Video Call</span>
                          </div>
                          <p className="text-meta text-ink-muted">
                            Join private video room inside Campus app.
                          </p>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="text-meta text-ink-muted">
                      Created on {new Date(s.created_at).toLocaleDateString()}
                    </div>

                    {canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-danger hover:bg-danger/10 hover:border-danger/40"
                        onClick={() => setCancellingSession(s)}
                      >
                        Cancel Appointment
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Cancellation Dialog */}
      <Dialog
        open={Boolean(cancellingSession)}
        onOpenChange={(open) => !open && setCancellingSession(null)}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmCancel} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-danger">Cancel Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment with{' '}
                {cancellingSession?.teacher?.full_name}?
              </DialogDescription>
            </DialogHeader>

            <div className="bg-surface-sunken p-3 rounded-md text-meta text-ink-muted space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-ink">
                <HelpCircle className="h-3.5 w-3.5 text-accent" />
                Cancellation Policy:
              </p>
              <p>• Both calendar entries will be automatically removed.</p>
              <p>• Limit of 3 cancellations per day.</p>
              <p>• Cancellations within 1 hour are marked as last-minute.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cancel-reason" className="text-small font-medium text-ink">
                Cancellation Reason (Optional)
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-small text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>

            {cancelError && (
              <div className="bg-danger/10 border border-danger/30 text-danger p-3 rounded-md text-small flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}

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
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
