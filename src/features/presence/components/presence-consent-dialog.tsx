'use client'

import * as React from 'react'
import {
  ShieldCheck,
  MapPinOff,
  DatabaseZap,
  Eye,
  Lock,
  PauseCircle,
  X,
  CheckCircle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { cn } from '@/lib/utils'
import { PresenceConsentRecord } from '../schema'

export interface PresenceConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentConsent?: PresenceConsentRecord | null
  onSaveConsent: (input: {
    consentGiven: boolean
    isPaused?: boolean
    visibility?: 'nobody' | 'friends' | 'everyone'
  }) => Promise<void> | void
}

export function PresenceConsentDialog({
  open,
  onOpenChange,
  currentConsent,
  onSaveConsent,
}: PresenceConsentDialogProps) {
  const [selectedVisibility, setSelectedVisibility] = React.useState<
    'nobody' | 'friends' | 'everyone' | null
  >(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const visibility = selectedVisibility ?? currentConsent?.visibility ?? 'nobody'

  const handleGrant = async () => {
    setIsSubmitting(true)
    try {
      await onSaveConsent({
        consentGiven: true,
        isPaused: false,
        visibility,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    setIsSubmitting(true)
    try {
      await onSaveConsent({
        consentGiven: false,
        isPaused: false,
        visibility: 'nobody',
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAlreadyConsented = currentConsent?.consentGiven === true

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="max-w-[480px] p-0 overflow-hidden border border-border bg-surface rounded-lg shadow-xl">
        <DialogHeader className="p-4 border-b border-border bg-surface-sunken/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} strokeWidth={1.75} className="text-in-campus shrink-0" />
            <div>
              <DialogTitle className="font-display text-h3 font-semibold text-ink leading-tight m-0">
                Campus Presence & Privacy
              </DialogTitle>
              <DialogDescription className="text-meta text-ink-muted leading-tight mt-0.5">
                Plain-language privacy guarantees per College Digital Charter
              </DialogDescription>
            </div>
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

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Privacy Guarantees Box */}
          <div className="space-y-3">
            <h4 className="font-display text-small font-bold text-ink uppercase tracking-wide">
              What we do and never do with your location:
            </h4>

            {/* Item 1: No raw coordinates */}
            <div className="flex items-start gap-3 p-3 rounded-md bg-surface-sunken border border-border">
              <DatabaseZap size={18} strokeWidth={1.75} className="text-in-campus shrink-0 mt-0.5" />
              <div>
                <span className="text-small font-semibold text-ink block">
                  Zero GPS Coordinates Stored
                </span>
                <p className="text-meta text-ink-muted mt-0.5 leading-relaxed">
                  Your device location is evaluated in server memory against the campus boundary and
                  immediately discarded. Your GPS coordinates are never stored in any database.
                </p>
              </div>
            </div>

            {/* Item 2: Outside campus privacy */}
            <div className="flex items-start gap-3 p-3 rounded-md bg-surface-sunken border border-border">
              <MapPinOff size={18} strokeWidth={1.75} className="text-ink shrink-0 mt-0.5" />
              <div>
                <span className="text-small font-semibold text-ink block">
                  No Tracking Outside Campus
                </span>
                <p className="text-meta text-ink-muted mt-0.5 leading-relaxed">
                  When you leave college grounds, the system records only <code>OUT</code>. We never
                  track or log where you go off campus.
                </p>
              </div>
            </div>

            {/* Item 3: Instant pause & revoke */}
            <div className="flex items-start gap-3 p-3 rounded-md bg-surface-sunken border border-border">
              <PauseCircle size={18} strokeWidth={1.75} className="text-highlight-hover shrink-0 mt-0.5" />
              <div>
                <span className="text-small font-semibold text-ink block">
                  One-Tap Pause & Complete Revocation
                </span>
                <p className="text-meta text-ink-muted mt-0.5 leading-relaxed">
                  Pause presence at any time directly from the top bar. Revoking your consent stops
                  verification immediately and purges active presence status from all displays.
                </p>
              </div>
            </div>
          </div>

          {/* Visibility Setting */}
          <div className="pt-2 border-t border-border space-y-2">
            <label className="block text-small font-semibold text-ink">
              Who can see whether you are on campus?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedVisibility('nobody')}
                className={cn(
                  'p-2.5 rounded-sm border text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-ink',
                  visibility === 'nobody'
                    ? 'border-ink bg-surface-sunken ring-1 ring-ink'
                    : 'border-border bg-surface hover:bg-surface-sunken/60'
                )}
              >
                <div className="flex items-center gap-1.5 text-small font-bold text-ink">
                  <Lock size={14} strokeWidth={2} />
                  Nobody
                </div>
                <span className="text-[11px] text-ink-muted block mt-1 leading-snug">
                  Only you (attendance use only)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVisibility('friends')}
                className={cn(
                  'p-2.5 rounded-sm border text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-ink',
                  visibility === 'friends'
                    ? 'border-ink bg-surface-sunken ring-1 ring-ink'
                    : 'border-border bg-surface hover:bg-surface-sunken/60'
                )}
              >
                <div className="flex items-center gap-1.5 text-small font-bold text-ink">
                  <CheckCircle size={14} strokeWidth={2} />
                  Friends
                </div>
                <span className="text-[11px] text-ink-muted block mt-1 leading-snug">
                  Mutual campus friends only
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVisibility('everyone')}
                className={cn(
                  'p-2.5 rounded-sm border text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-ink',
                  visibility === 'everyone'
                    ? 'border-ink bg-surface-sunken ring-1 ring-ink'
                    : 'border-border bg-surface hover:bg-surface-sunken/60'
                )}
              >
                <div className="flex items-center gap-1.5 text-small font-bold text-ink">
                  <Eye size={14} strokeWidth={2} />
                  Everyone
                </div>
                <span className="text-[11px] text-ink-muted block mt-1 leading-snug">
                  All verified campus members
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface-sunken/30 flex items-center justify-between gap-3">
          {isAlreadyConsented ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isSubmitting}
              onClick={handleRevoke}
            >
              Revoke Consent
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Keep Disabled
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleGrant}
            >
              {isAlreadyConsented ? 'Save Preferences' : 'I Consent & Enable Presence'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
