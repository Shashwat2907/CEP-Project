'use client'

import * as React from 'react'
import { Bell, MapPin, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
import { Button } from './button'

export type PresenceState = 'in' | 'out' | 'checking' | 'denied'

export interface StatusClusterProps {
  identifier?: string // e.g., '23BCE1042' or 'T-CS-102'
  userName?: string
  department?: string
  role?: 'student' | 'teacher' | 'admin'
  presenceState?: PresenceState
  onPresenceToggle?: (nextState: PresenceState) => void
  unreadNotifications?: number
  onBellClick?: () => void
  className?: string
  hideIdOnMobile?: boolean
}

export function StatusCluster({
  identifier = '23BCE1042',
  userName = 'Shashwat Choudhary',
  department = 'Computer Science & Engineering',
  role = 'student',
  presenceState: controlledPresence,
  onPresenceToggle,
  unreadNotifications = 3,
  onBellClick,
  className,
  hideIdOnMobile = true,
}: StatusClusterProps) {
  const [internalPresence, setInternalPresence] = React.useState<PresenceState>('in')
  const presence = controlledPresence ?? internalPresence

  const [isPillModalOpen, setIsPillModalOpen] = React.useState(false)
  const [isIdSheetOpen, setIsIdSheetOpen] = React.useState(false)
  const [lastVerified] = React.useState('Today, 14:15')

  const handleToggleState = (newState: PresenceState) => {
    setInternalPresence(newState)
    onPresenceToggle?.(newState)
  }

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        {/* 1. ID Chip (DESIGN.MD §7) */}
        <button
          type="button"
          onClick={() => setIsIdSheetOpen(true)}
          className={cn(
            'font-mono text-meta font-medium px-2.5 py-1.5 bg-surface border border-border rounded-sm text-ink hover:bg-surface-sunken hover:border-ink transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink',
            hideIdOnMobile && 'hidden sm:inline-flex'
          )}
          title="View Digital ID"
          aria-label={`Student ID ${identifier}`}
        >
          ID: {identifier}
        </button>

        {/* 2. Signature IN/OUT Pill (DESIGN.MD §7) */}
        <button
          type="button"
          onClick={() => setIsPillModalOpen(true)}
          className={cn(
            'relative inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-border rounded-full text-meta font-medium shadow-none hover:border-ink transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink'
          )}
          title="Presence status — click for details"
          aria-label={`Campus presence: ${presence.toUpperCase()}`}
        >
          {presence === 'checking' ? (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
              Checking...
            </span>
          ) : presence === 'denied' ? (
            <span className="inline-flex items-center gap-1 text-danger">
              <AlertTriangle size={14} strokeWidth={1.75} />
              GPS off
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 transition-all duration-150 ease-out',
                  presence === 'in' ? 'text-in-campus font-semibold' : 'text-ink-muted opacity-60'
                )}
              >
                {presence === 'in' && (
                  <span className="w-2 h-2 rounded-full bg-in-campus" />
                )}
                <span>IN</span>
              </div>
              <span className="text-border">|</span>
              <div
                className={cn(
                  'flex items-center gap-1.5 transition-all duration-150 ease-out',
                  presence === 'out' ? 'text-ink font-semibold' : 'text-ink-muted opacity-60'
                )}
              >
                {presence === 'out' && (
                  <span className="w-2 h-2 rounded-full bg-out-campus" />
                )}
                <span>OUT</span>
              </div>
            </div>
          )}
        </button>

        {/* 3. Notification Bell (DESIGN.MD §6) */}
        <button
          type="button"
          onClick={onBellClick}
          className="relative w-9 h-9 rounded-sm border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-ink"
          aria-label={
            unreadNotifications > 0
              ? `${unreadNotifications} unread notifications`
              : 'Notifications'
          }
          title="Notifications"
        >
          <Bell size={20} strokeWidth={1.75} />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-highlight text-ink text-[11px] font-bold font-mono rounded-full border border-surface flex items-center justify-center">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {/* IN/OUT Popover/Dialog */}
      <Dialog open={isPillModalOpen} onOpenChange={setIsPillModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <MapPin size={20} strokeWidth={1.75} className="text-ink" />
              Campus Boundary Status
            </DialogTitle>
            <DialogDescription>
              Real-time geofence verification status for your digital presence.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="p-3 bg-surface-sunken rounded-md space-y-1.5 border border-border">
              <div className="flex justify-between items-center text-small">
                <span className="text-ink-muted">Current status:</span>
                <span
                  className={cn(
                    'font-semibold px-2 py-0.5 rounded-sm text-meta',
                    presence === 'in'
                      ? 'bg-in-campus text-white'
                      : presence === 'out'
                      ? 'bg-ink text-white'
                      : 'bg-warning text-ink'
                  )}
                >
                  {presence.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-ink-muted">Last verified:</span>
                <span className="font-mono text-meta font-medium text-ink">{lastVerified}</span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-ink-muted">Campus Zone:</span>
                <span className="font-medium text-ink">Main Academic Campus</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-meta font-medium text-ink-muted">Quick test switcher:</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={presence === 'in' ? 'primary' : 'secondary'}
                  onClick={() => handleToggleState('in')}
                >
                  Set IN
                </Button>
                <Button
                  size="sm"
                  variant={presence === 'out' ? 'primary' : 'secondary'}
                  onClick={() => handleToggleState('out')}
                >
                  Set OUT
                </Button>
                <Button
                  size="sm"
                  variant={presence === 'checking' ? 'primary' : 'secondary'}
                  onClick={() => handleToggleState('checking')}
                >
                  Check
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPillModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital ID Sheet (DESIGN.MD §8) */}
      <Sheet open={isIdSheetOpen} onOpenChange={setIsIdSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md p-6">
          <SheetHeader className="text-left pb-4 border-b border-border">
            <SheetTitle className="font-display text-h2 flex items-center gap-2">
              <ShieldCheck size={24} strokeWidth={1.75} className="text-ink" />
              Digital Student ID
            </SheetTitle>
            <SheetDescription>
              Official university digital credential. Present this to desk staff or security.
            </SheetDescription>
          </SheetHeader>

          {/* Digital ID Card Preview (DESIGN.MD §8) */}
          <div className="mt-6 border border-border rounded-lg bg-surface overflow-hidden shadow-sm">
            {/* Yellow strip at top edge (DESIGN.MD §8) */}
            <div className="h-2.5 bg-highlight w-full" />

            <div className="p-5 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-meta text-ink-muted font-medium uppercase tracking-wide">
                    {role === 'student' ? 'Student Identity' : 'Faculty Identity'}
                  </span>
                  <h3 className="font-display text-h2 font-bold text-ink mt-0.5">{userName}</h3>
                  <p className="text-small text-ink-muted">{department}</p>
                </div>
                <div className="w-14 h-14 rounded-md bg-surface-sunken border border-border flex items-center justify-center font-display text-h2 font-bold text-ink">
                  {userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-surface-sunken rounded-md border border-border font-mono text-small">
                <div>
                  <div className="text-meta text-ink-muted uppercase">ID Number</div>
                  <div className="font-semibold text-ink">{identifier}</div>
                </div>
                <div>
                  <div className="text-meta text-ink-muted uppercase">Status</div>
                  <div className="font-semibold text-in-campus flex items-center gap-1">
                    <CheckCircle size={14} strokeWidth={2} /> Active
                  </div>
                </div>
              </div>

              {/* Rotating QR Placeholder */}
              <div className="border border-border rounded-md p-4 bg-surface flex flex-col items-center justify-center space-y-2">
                <div className="w-36 h-36 bg-surface-sunken border border-dashed border-border rounded flex flex-col items-center justify-center text-ink-muted font-mono text-meta">
                  <span>[ROTATING QR]</span>
                  <span className="text-[11px] text-ink-muted mt-1">Refreshes: 24s</span>
                </div>
                <span className="font-mono text-meta text-ink-muted">Verified at {lastVerified}</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
