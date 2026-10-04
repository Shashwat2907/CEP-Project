'use client'

import * as React from 'react'
import {
  CheckCircle,
  CreditCard,
  ShieldCheck,
  Building2,
  QrCode,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog'
import { Button } from './button'
import { NotificationPopover } from './notification-popover'
import { PresencePopover } from '@/features/presence/components/presence-popover'
import { PresenceConsentDialog } from '@/features/presence/components/presence-consent-dialog'
import { useOptionalPresence } from '@/features/presence/presence-context'
import type { PresenceConfidence, PresenceConsentRecord } from '@/features/presence/schema'

export type PresenceState = 'in' | 'out' | 'checking' | 'denied' | 'offline'

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

  // Extended Presence & Boundary props
  zoneName?: string
  verifiedAt?: string | null
  confidence?: PresenceConfidence
  accuracyMeters?: number
  consent?: PresenceConsentRecord | null
  onVerifyLocation?: () => Promise<void> | void
  onTogglePause?: (isPaused: boolean) => Promise<void> | void
  onSaveConsent?: (input: {
    consentGiven: boolean
    isPaused?: boolean
    visibility?: 'nobody' | 'friends' | 'everyone'
  }) => Promise<void> | void
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
  hideIdOnMobile = false,
  zoneName = 'Main Campus',
  verifiedAt,
  confidence = 'high',
  accuracyMeters = 15,
  consent,
  onVerifyLocation,
  onTogglePause,
  onSaveConsent,
}: StatusClusterProps) {
  const presenceCtx = useOptionalPresence()
  const [internalPresence, setInternalPresence] = React.useState<PresenceState>('in')
  const presence = presenceCtx ? presenceCtx.presenceState : (controlledPresence ?? internalPresence)
  const currentZone = presenceCtx?.zoneName ?? zoneName
  const currentVerifiedAt = presenceCtx?.verifiedAt ?? verifiedAt
  const currentConfidence = presenceCtx?.confidence ?? confidence
  const currentAccuracy = presenceCtx?.accuracyMeters ?? accuracyMeters
  const currentConsent = presenceCtx?.consent ?? consent

  const [isIdCardOpen, setIsIdCardOpen] = React.useState(false)
  const [isPresencePopoverOpen, setIsPresencePopoverOpen] = React.useState(false)
  const [isConsentDialogOpen, setIsConsentDialogOpen] = React.useState(false)
  const [isCheckingLocation, setIsCheckingLocation] = React.useState(false)
  const [qrCountdown, setQrCountdown] = React.useState(30)
  const [tokenSeed, setTokenSeed] = React.useState('8F2A-99B4')

  // Real-time 30-second rotating security token for digital ID
  React.useEffect(() => {
    if (!isIdCardOpen) return
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          // Generate new token seed when countdown resets
          setTokenSeed(Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase())
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isIdCardOpen])

  // Simple direct toggle per user instruction: "and in or out i want a simple toggle only"
  const handleTogglePresence = () => {
    const nextState: PresenceState = presence === 'in' ? 'out' : 'in'
    if (presenceCtx) {
      presenceCtx.setPresenceState(nextState)
    } else {
      setInternalPresence(nextState)
    }
    onPresenceToggle?.(nextState)
  }

  const handleRefreshLocation = async () => {
    if (presenceCtx) {
      await presenceCtx.checkCurrentLocation()
      return
    }
    if (onVerifyLocation) {
      await onVerifyLocation()
      return
    }
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsCheckingLocation(true)
      setInternalPresence('checking')
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { verifyPresence } = await import('@/features/presence/actions')
            const res = await verifyPresence({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            })
            if (res.ok) {
              const nextState: PresenceState = res.data.state
              setInternalPresence(nextState)
              onPresenceToggle?.(nextState)
            }
          } finally {
            setIsCheckingLocation(false)
          }
        },
        () => {
          setIsCheckingLocation(false)
          setInternalPresence('denied')
          onPresenceToggle?.('denied')
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }

  const handleTogglePause = async (isPaused: boolean) => {
    if (presenceCtx) {
      await presenceCtx.togglePause(isPaused)
      return
    }
    if (onTogglePause) {
      await onTogglePause(isPaused)
      return
    }
    const { togglePresencePause } = await import('@/features/presence/actions')
    await togglePresencePause(isPaused)
  }

  const handleSaveConsent = async (input: {
    consentGiven: boolean
    isPaused?: boolean
    visibility?: 'nobody' | 'friends' | 'everyone'
  }) => {
    if (presenceCtx) {
      await presenceCtx.saveConsent(input)
      return
    }
    if (onSaveConsent) {
      await onSaveConsent(input)
      return
    }
    const { updatePresenceConsent } = await import('@/features/presence/actions')
    await updatePresenceConsent(input)
  }

  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        {/* 1. Quick Digital ID Card Button (Official verifiable college card launcher) */}
        <button
          type="button"
          onClick={() => setIsIdCardOpen(true)}
          className={cn(
            'inline-flex items-center gap-2 px-2.5 py-1.5 bg-surface border border-border rounded-sm text-ink hover:bg-surface-sunken hover:border-ink transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink',
            hideIdOnMobile && 'hidden sm:inline-flex'
          )}
          title="Open Verifiable Digital ID Card"
          aria-label={`Open Digital ID Card for ${userName} (${identifier})`}
        >
          <CreditCard size={18} strokeWidth={1.75} className="text-ink shrink-0" />
          <span className="hidden sm:inline text-small font-medium">Digital ID</span>
          <span className="font-mono text-meta font-medium px-1.5 py-0.5 rounded-sm bg-surface-sunken border border-border">
            {identifier}
          </span>
        </button>

        {/* 2. IN / OUT Sliding Pill: Symmetrical Two-Segment Toggle (DESIGN.MD §7) */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            role="switch"
            aria-checked={presence === 'in'}
            onClick={handleTogglePresence}
            className={cn(
              'relative grid grid-cols-2 w-[116px] h-8 p-0.5 rounded-full cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink transition-all group overflow-hidden',
              presence === 'in'
                ? 'bg-in-campus/15 border border-in-campus/40 shadow-[0_0_8px_rgba(31,157,107,0.2)]'
                : 'bg-surface-sunken border border-border'
            )}
            title={`Presence status: ${presence.toUpperCase()} (Click to toggle)`}
            aria-label={`Campus presence: ${presence.toUpperCase()}. Click to toggle`}
          >
            {/* Sliding active pill background thumb: exactly 56px wide matching each column */}
            <div
              className={cn(
                'absolute top-0.5 bottom-0.5 w-[56px] rounded-full transition-transform duration-200 ease-out pointer-events-none',
                presence === 'in'
                  ? 'left-0.5 translate-x-0 bg-in-campus text-white border border-in-campus shadow-sm'
                  : 'left-0.5 translate-x-full bg-surface border border-border text-ink shadow-xs'
              )}
            />

            {/* IN segment - perfectly centered in column 1 */}
            <span
              className={cn(
                'relative z-10 flex items-center justify-center gap-1.5 w-full h-full text-meta font-bold transition-colors duration-150',
                presence === 'in' ? 'text-white' : 'text-ink-muted group-hover:text-ink'
              )}
            >
              {presence === 'in' && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              )}
              <span>IN</span>
            </span>

            {/* OUT segment - perfectly centered in column 2 */}
            <span
              className={cn(
                'relative z-10 flex items-center justify-center gap-1.5 w-full h-full text-meta font-bold transition-colors duration-150',
                presence === 'out' ? 'text-ink' : 'text-ink-muted group-hover:text-ink'
              )}
            >
              {presence === 'out' && (
                <span className="w-2 h-2 rounded-full bg-out-campus shrink-0" />
              )}
              <span>OUT</span>
            </span>
          </button>

          {/* Details & Campus Boundary Popover Trigger Button */}
          <button
            type="button"
            onClick={() => setIsPresencePopoverOpen(true)}
            className="w-8 h-8 rounded-full border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ink"
            title="Presence status and campus boundary details"
            aria-label="Presence status and campus boundary details"
          >
            <MapPin
              size={15}
              strokeWidth={1.75}
              className={cn(presence === 'in' ? 'text-in-campus' : 'text-ink-muted')}
            />
          </button>
        </div>

        {/* 3. Interactive Notification Bell (DESIGN.MD §6) */}
        <NotificationPopover unreadCount={unreadNotifications} onBellClick={onBellClick} />
      </div>

      {/* Popover for Campus Boundary Status & Verification (DESIGN.MD §7) */}
      <PresencePopover
        open={isPresencePopoverOpen}
        onOpenChange={setIsPresencePopoverOpen}
        presenceState={presence}
        zoneName={currentZone}
        confidence={currentConfidence}
        accuracyMeters={currentAccuracy}
        verifiedAt={currentVerifiedAt}
        consent={currentConsent}
        isChecking={presenceCtx ? presenceCtx.isChecking : (isCheckingLocation || presence === 'checking')}
        onRefreshLocation={handleRefreshLocation}
        onTogglePause={handleTogglePause}
        onSimulateInside={() => presenceCtx?.simulateLocation({ latitude: 12.9735, longitude: 79.1620 })}
        onSimulateOutside={() => presenceCtx?.simulateLocation({ latitude: 12.9900, longitude: 79.2000 })}
        onOpenConsentDialog={() => {
          setIsPresencePopoverOpen(false)
          setIsConsentDialogOpen(true)
        }}
      />

      {/* Plain-Language Privacy Consent Dialog (PLAN.MD §5.1) */}
      <PresenceConsentDialog
        open={isConsentDialogOpen}
        onOpenChange={setIsConsentDialogOpen}
        currentConsent={currentConsent}
        onSaveConsent={handleSaveConsent}
      />

      {/* Pop-out Official Verifiable College ID Card (DESIGN.MD §8) */}
      <Dialog open={isIdCardOpen} onOpenChange={setIsIdCardOpen}>
        <DialogContent showClose={false} className="max-w-[420px] p-0 overflow-hidden border border-border bg-surface rounded-lg shadow-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Verifiable College Identity Card</DialogTitle>
            <DialogDescription>
              Official student digital credential with anti-tamper rotating verification code.
            </DialogDescription>
          </DialogHeader>

          {/* Genuine College Card UI */}
          <div className="relative bg-surface select-none">
            {/* Top yellow strip per DESIGN.MD §8: 'Yellow strip at the top edge is the only decoration' */}
            <div className="h-3 bg-highlight w-full" />

            {/* University Crest & Header */}
            <div className="px-6 pt-5 pb-3 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-sm bg-ink text-on-ink flex items-center justify-center font-display font-black text-lg border border-border">
                  C
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink text-sm uppercase tracking-wide leading-tight">
                    Campus University
                  </h3>
                  <p className="text-[11px] font-mono text-ink-muted uppercase">
                    Official Student Identity Card
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/30">
                <ShieldCheck size={13} strokeWidth={2} />
                VERIFIED
              </div>
            </div>

            {/* Student Credentials Body */}
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                {/* Student Photo with security badge */}
                <div className="relative shrink-0">
                  <div className="w-20 h-24 rounded-md bg-surface-sunken border border-border flex flex-col items-center justify-center font-display text-xl font-bold text-ink shadow-inner">
                    <span>{userInitials}</span>
                    <span className="text-[10px] font-mono text-ink-muted mt-1 uppercase">Photo</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-in-campus border-2 border-surface" title="Active Credential" />
                </div>

                {/* Identity details */}
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wider">
                    {role === 'student' ? 'Student Enrollment' : 'Faculty Member'}
                  </span>
                  <h4 className="font-display text-h2 font-bold text-ink truncate leading-tight mt-0.5">
                    {userName}
                  </h4>
                  <p className="text-small text-ink-muted mt-0.5 leading-snug">
                    {department}
                  </p>
                  <div className="mt-2.5 inline-block">
                    <span className="text-[11px] font-mono text-ink-muted block uppercase">
                      Roll Number
                    </span>
                    <span className="font-mono text-base font-bold text-ink tracking-wide">
                      {identifier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-md bg-surface-sunken border border-border text-meta font-mono">
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Academic Year</span>
                  <span className="font-semibold text-ink">2026 – 2027</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Validity</span>
                  <span className="font-semibold text-ink">Valid till 06/2027</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Campus Access</span>
                  <span className="font-semibold text-in-campus flex items-center gap-1">
                    <CheckCircle size={12} strokeWidth={2} /> Full Clearance
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Current Zone</span>
                  <span className="font-semibold text-ink flex items-center gap-1">
                    <Building2 size={12} strokeWidth={2} /> Main Campus
                  </span>
                </div>
              </div>

              {/* Rotating Anti-Tamper QR Code with Live Countdown Ring (DESIGN.MD §8) */}
              <div className="border border-border rounded-md p-4 bg-surface flex flex-col items-center justify-center space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-32 h-32 bg-surface-sunken border border-border rounded-md flex flex-col items-center justify-center text-ink font-mono text-meta">
                    <QrCode size={56} strokeWidth={1.5} className="text-ink mb-1" />
                    <span className="text-[10px] text-ink-muted font-bold tracking-wider">
                      {tokenSeed}
                    </span>
                  </div>
                </div>

                {/* Rotating Countdown & Live Security Token */}
                <div className="w-full flex items-center justify-between text-meta font-mono border-t border-border pt-2 text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-in-campus animate-ping" />
                    <span className="text-ink font-medium">LIVE VERIFICATION</span>
                  </span>
                  <span className="font-semibold text-ink">
                    Refreshes in {qrCountdown}s
                  </span>
                </div>
              </div>

              {/* Desk / Gate Notice */}
              <p className="text-[11px] text-ink-muted text-center leading-tight">
                Authorized for university gate entry, campus facilities, and examination verification.
              </p>
            </div>

            {/* Footer close button */}
            <div className="p-4 border-t border-border bg-surface-sunken/30 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsIdCardOpen(false)}
                className="w-full"
              >
                Close ID Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
