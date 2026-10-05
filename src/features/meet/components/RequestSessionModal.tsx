'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { requestSession } from '../actions'
import type { TeacherSummary, GeneratedSlot } from '../schema'
import { Calendar, Clock, AlertCircle } from 'lucide-react'

interface RequestSessionModalProps {
  teacher: TeacherSummary | null
  slot: GeneratedSlot | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (requestId: string) => void
}

export function RequestSessionModal({
  teacher,
  slot,
  isOpen,
  onClose,
  onSuccess,
}: RequestSessionModalProps) {
  const [reason, setReason] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleClose = () => {
    setReason('')
    setErrorMessage(null)
    setIsSubmitting(false)
    onClose()
  }

  if (!teacher || !slot) return null

  const charCount = reason.trim().length
  const isReasonValid = charCount >= 20

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isReasonValid) {
      setErrorMessage('Please provide a reason with at least 20 characters.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    // Construct starts_at and ends_at ISO strings in UTC
    const startsAt = new Date(`${slot.date}T${slot.start_time}:00Z`).toISOString()
    const endsAt = new Date(`${slot.date}T${slot.end_time}:00Z`).toISOString()

    try {
      const res = await requestSession({
        teacher_id: teacher.id,
        starts_at: startsAt,
        ends_at: endsAt,
        reason: reason.trim(),
      })

      if (!res.ok) {
        setErrorMessage(res.error.message)
        setIsSubmitting(false)
        return
      }

      onSuccess?.(res.data.requestId)
      onClose()
    } catch {
      setErrorMessage('An unexpected network error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Request Appointment</DialogTitle>
            <DialogDescription>
              Book an office hour session with {teacher.full_name}.
            </DialogDescription>
          </DialogHeader>

          {/* Slot summary card */}
          <div className="bg-surface-sunken p-3.5 rounded-lg border border-border/60 space-y-2 text-small">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{teacher.full_name}</span>
              <span className="text-meta text-ink-muted">{teacher.department || 'Faculty'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-meta text-ink-muted pt-1 border-t border-border/40">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent" />
                <span>{slot.date}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span>{slot.start_time} – {slot.end_time} ({slot.slot_minutes} min)</span>
              </span>
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="session-reason" className="text-small font-medium text-ink">
                Reason for Appointment <span className="text-danger">*</span>
              </label>
              <span
                className={`text-meta ${
                  charCount < 20 ? 'text-ink-muted' : 'text-success font-medium'
                }`}
              >
                {charCount} / 20 min characters
              </span>
            </div>
            <textarea
              id="session-reason"
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe your doubt, academic question, or discussion agenda in detail..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-small text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink"
            />
            {charCount > 0 && charCount < 20 && (
              <p className="text-meta text-warning">
                Please enter at least {20 - charCount} more character{20 - charCount === 1 ? '' : 's'}.
              </p>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 text-danger p-3 rounded-md text-small">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isReasonValid || isSubmitting}
            >
              {isSubmitting ? 'Submitting Request...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
