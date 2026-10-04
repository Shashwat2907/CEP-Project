'use client'

import * as React from 'react'
import {
  MapPin,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Shield,
  AlertTriangle,
  CheckCircle2,
  X,
  Building,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { cn } from '@/lib/utils'
import { PresenceState, PresenceConfidence, PresenceConsentRecord } from '../schema'

export interface PresencePopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presenceState: PresenceState
  zoneName?: string
  confidence?: PresenceConfidence
  accuracyMeters?: number
  verifiedAt?: string | null
  consent?: PresenceConsentRecord | null
  isChecking?: boolean
  errorMessage?: string | null
  onRefreshLocation: () => Promise<void> | void
  onTogglePause: (isPaused: boolean) => Promise<void> | void
  onOpenConsentDialog: () => void
  onSimulateInside?: () => void
  onSimulateOutside?: () => void
}

export function PresencePopover({
  open,
  onOpenChange,
  presenceState,
  zoneName = 'Main Campus',
  confidence = 'medium',
  accuracyMeters,
  verifiedAt,
  consent,
  isChecking = false,
  errorMessage,
  onRefreshLocation,
  onTogglePause,
  onOpenConsentDialog,
  onSimulateInside,
  onSimulateOutside,
}: PresencePopoverProps) {
  const isPaused = consent?.isPaused === true
  const isConsented = consent?.consentGiven === true

  const formatVerifiedTime = (timestamp?: string | null) => {
    if (!timestamp) return 'Never'
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return 'Recently'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="max-w-[380px] p-0 overflow-hidden border border-border bg-surface rounded-lg shadow-xl">
        <DialogHeader className="p-4 border-b border-border bg-surface-sunken/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={18} strokeWidth={1.75} className="text-ink shrink-0" />
            <DialogTitle className="font-display text-h3 font-semibold text-ink leading-none m-0">
              Campus Presence
            </DialogTitle>
            <DialogDescription className="sr-only">
              Current campus boundary status and verification details
            </DialogDescription>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm p-1.5 text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors focus-visible:outline-2 focus-visible:outline-ink"
            aria-label="Close dialog"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Main Status Badge */}
          <div className="p-3.5 rounded-md bg-surface-sunken border border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'w-3 h-3 rounded-full',
                  isChecking
                    ? 'bg-highlight animate-pulse'
                    : isPaused
                    ? 'bg-ink-muted'
                    : presenceState === 'in'
                    ? 'bg-in-campus animate-pulse'
                    : presenceState === 'denied'
                    ? 'bg-danger'
                    : 'bg-out-campus'
                )}
              />
              <div>
                <span className="font-display text-small font-bold text-ink block leading-tight">
                  {isChecking
                    ? 'Checking Location...'
                    : isPaused
                    ? 'Presence Sharing Paused'
                    : presenceState === 'in'
                    ? 'Inside Campus Boundary'
                    : presenceState === 'denied'
                    ? 'Location Permission Denied'
                    : 'Outside Campus Boundary'}
                </span>
                <span className="text-[11px] font-mono text-ink-muted mt-0.5 block">
                  {isChecking
                    ? 'Resolving GPS...'
                    : isPaused
                    ? 'Resume sharing to verify'
                    : presenceState === 'in'
                    ? zoneName
                    : 'No off-campus tracking'}
                </span>
              </div>
            </div>

            {presenceState === 'in' && !isChecking && !isPaused && (
              <span className="font-mono text-meta font-bold px-2 py-0.5 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/20">
                ACTIVE
              </span>
            )}
          </div>

          {/* Details Card */}
          <div className="p-3 rounded-md bg-surface border border-border space-y-2 text-meta font-mono">
            <div className="flex items-center justify-between text-ink-muted">
              <span>Campus Zone:</span>
              <span className="font-semibold text-ink flex items-center gap-1">
                <Building size={12} strokeWidth={2} />
                {zoneName}
              </span>
            </div>

            <div className="flex items-center justify-between text-ink-muted">
              <span>Last Verified:</span>
              <span className="font-semibold text-ink">
                {formatVerifiedTime(verifiedAt)}
              </span>
            </div>

            <div className="flex items-center justify-between text-ink-muted">
              <span>Confidence:</span>
              <span
                className={cn(
                  'font-semibold capitalize',
                  confidence === 'high'
                    ? 'text-in-campus'
                    : confidence === 'medium'
                    ? 'text-ink'
                    : 'text-warning'
                )}
              >
                {confidence} {accuracyMeters ? `(±${Math.round(accuracyMeters)}m)` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between text-ink-muted">
              <span>Audited Privacy:</span>
              <span className="text-in-campus font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} strokeWidth={2} /> Zero Storage
              </span>
            </div>
          </div>

          {/* Low Accuracy / Error Warning per PLAN.md §5.1 */}
          {accuracyMeters && accuracyMeters > 100 && (
            <div className="p-3 rounded-md bg-highlight/15 border border-highlight/40 flex items-start gap-2.5">
              <AlertTriangle size={16} strokeWidth={2} className="text-ink shrink-0 mt-0.5" />
              <p className="text-meta text-ink leading-tight">
                <strong>Low GPS Accuracy ({Math.round(accuracyMeters)}m):</strong> GPS signal may be
                weak indoors. If needed, move closer to a window for higher confidence.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-meta flex items-start gap-2">
              <AlertTriangle size={16} strokeWidth={2} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Simulation Options */}
          {(onSimulateInside || onSimulateOutside) && (
            <div className="p-2.5 rounded-md bg-surface-sunken border border-border flex items-center justify-between text-meta">
              <span className="font-mono text-ink-muted text-[11px]">Simulate:</span>
              <div className="flex items-center gap-1.5">
                {onSimulateInside && (
                  <button
                    type="button"
                    onClick={onSimulateInside}
                    className="px-2 py-1 rounded-sm bg-in-campus/10 text-in-campus hover:bg-in-campus hover:text-white transition-colors font-mono font-bold text-[11px] cursor-pointer"
                    title="Simulate entering campus (sets toggle to GREEN)"
                  >
                    Enter Campus (IN)
                  </button>
                )}
                {onSimulateOutside && (
                  <button
                    type="button"
                    onClick={onSimulateOutside}
                    className="px-2 py-1 rounded-sm bg-surface text-ink-muted hover:text-ink border border-border transition-colors font-mono text-[11px] cursor-pointer"
                    title="Simulate leaving campus (sets toggle to OUT)"
                  >
                    Leave Campus (OUT)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
              disabled={isChecking || isPaused || !isConsented}
              onClick={onRefreshLocation}
            >
              <RefreshCw size={14} strokeWidth={2} className={cn(isChecking && 'animate-spin')} />
              <span>{isChecking ? 'Verifying Coordinates...' : 'Check Location Now'}</span>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {isConsented && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onTogglePause(!isPaused)}
                  className="flex items-center justify-center gap-1.5"
                >
                  {isPaused ? (
                    <>
                      <PlayCircle size={14} strokeWidth={2} className="text-in-campus" />
                      Resume
                    </>
                  ) : (
                    <>
                      <PauseCircle size={14} strokeWidth={2} className="text-ink-muted" />
                      Pause
                    </>
                  )}
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onOpenConsentDialog}
                className={cn('flex items-center justify-center gap-1.5', !isConsented && 'col-span-2')}
              >
                <Shield size={14} strokeWidth={2} className="text-ink-muted" />
                Privacy & Rules
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
