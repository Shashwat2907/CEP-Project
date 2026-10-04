'use client'

import * as React from 'react'
import QRCode from 'qrcode'
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  Building2,
  Clock,
  AlertTriangle,
  QrCode as QrIcon,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/ui/button'
import { getDigitalIdTokenAction, type GetTokenResult } from '../actions'
import type { DigitalIdStatus } from '../schema'

export interface DigitalIdCardProps {
  initialIdentifier?: string
  initialName?: string
  initialDepartment?: string
  initialRole?: 'student' | 'teacher' | 'admin'
  initialBranch?: string
  initialYear?: number
  initialDivision?: string
  initialBatch?: string
  onClose?: () => void
  className?: string
}

export function DigitalIdCard({
  initialIdentifier = '23BCE1042',
  initialName = 'Shashwat Choudhary',
  initialDepartment = 'Computer Science & Engineering',
  initialRole = 'student',
  initialBranch = 'Computer Science & Engineering',
  initialYear = 3,
  initialDivision = 'A',
  initialBatch = 'B1',
  onClose,
  className,
}: DigitalIdCardProps) {
  const [token, setToken] = React.useState<string | null>(null)
  const [qrSvg, setQrSvg] = React.useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(30)
  const [verifiedAtTime, setVerifiedAtTime] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [isRotating, setIsRotating] = React.useState<boolean>(false)
  const [cardStatus, setCardStatus] = React.useState<DigitalIdStatus>('active')
  const [studentInfo, setStudentInfo] = React.useState({
    identifier: initialIdentifier,
    name: initialName,
    department: initialDepartment,
    role: initialRole,
    branch: initialBranch,
    year: initialYear,
    division: initialDivision,
    batch: initialBatch,
    photoUrl: null as string | null,
  })

  // Fetch token and generate fresh QR
  const fetchNewToken = React.useCallback(async () => {
    try {
      setIsRotating(true)
      const res: GetTokenResult = await getDigitalIdTokenAction()
      if (res.ok && res.data) {
        setToken(res.data.token)
        setCardStatus(res.data.subject.digitalIdStatus)
        setStudentInfo({
          identifier: res.data.subject.collegeId,
          name: res.data.subject.fullName,
          department: res.data.subject.branch || initialDepartment,
          role: res.data.subject.role,
          branch: res.data.subject.branch || initialBranch,
          year: res.data.subject.year || initialYear,
          division: res.data.subject.division || initialDivision,
          batch: res.data.subject.batch || initialBatch,
          photoUrl: res.data.subject.photoUrl || null,
        })

        // Format verified at time
        const now = new Date()
        setVerifiedAtTime(
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        )
        setSecondsRemaining(30)

        // Generate QR code data URL (encodes verifier URL or raw token)
        const host = typeof window !== 'undefined' ? window.location.origin : ''
        const qrContent = `${host}/verify?token=${encodeURIComponent(res.data.token)}`

        const svgString = await QRCode.toString(qrContent, {
          type: 'svg',
          margin: 1,
          width: 160,
          color: {
            dark: '#111827', // --ink
            light: '#FFFFFF', // --surface
          },
        })
        setQrSvg(svgString)
      }
    } catch (err) {
      console.error('Failed to issue rotating digital ID token:', err)
    } finally {
      setIsLoading(false)
      setIsRotating(false)
    }
  }, [initialDepartment, initialBranch, initialYear, initialDivision, initialBatch])

  // Initial load
  React.useEffect(() => {
    fetchNewToken()
  }, [fetchNewToken])

  // 30-second countdown and rotation timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Re-issue token automatically when countdown reaches 0
          fetchNewToken()
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [fetchNewToken])

  const initials = studentInfo.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  // Countdown ring calculation (circumference = 2 * PI * r)
  const ringRadius = 14
  const circumference = 2 * Math.PI * ringRadius
  const strokeDashoffset = circumference - (secondsRemaining / 30) * circumference

  return (
    <div
      className={cn(
        'relative bg-surface rounded-lg border border-border shadow-lg overflow-hidden select-none max-w-sm sm:max-w-md w-full',
        className
      )}
    >
      {/* 1. Yellow strip at top edge - per DESIGN.MD §8: 'Yellow strip at the top edge is the only decoration' */}
      <div className="h-2.5 bg-highlight w-full" />

      {/* 2. Official University Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-ink text-on-ink flex items-center justify-center font-display font-black text-base border border-border">
            C
          </div>
          <div>
            <h3 className="font-display font-bold text-ink text-xs uppercase tracking-wider leading-tight">
              Campus University
            </h3>
            <p className="text-[10px] font-mono text-ink-muted uppercase">
              {studentInfo.role === 'teacher' ? 'Faculty Identity Card' : 'Official Student Identity Card'}
            </p>
          </div>
        </div>

        {/* Real-time Status Badge */}
        {cardStatus === 'active' ? (
          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/30">
            <ShieldCheck size={13} strokeWidth={2} />
            VERIFIED
          </div>
        ) : cardStatus === 'suspended' ? (
          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-sm bg-warning/15 text-warning-border border border-warning">
            <AlertTriangle size={13} strokeWidth={2} />
            SUSPENDED
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-sm bg-danger/10 text-danger border border-danger/30">
            <AlertTriangle size={13} strokeWidth={2} />
            REVOKED
          </div>
        )}
      </div>

      {/* 3. Credentials & Photo Section */}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          {/* Photo Frame */}
          <div className="relative shrink-0">
            <div className="w-20 h-24 rounded-md bg-surface-sunken border border-border flex flex-col items-center justify-center font-display text-xl font-bold text-ink shadow-inner overflow-hidden">
              {studentInfo.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={studentInfo.photoUrl}
                  alt={studentInfo.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <span>{initials}</span>
                  <span className="text-[9px] font-mono text-ink-muted mt-1 uppercase">Photo</span>
                </>
              )}
            </div>
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-surface',
                cardStatus === 'active' ? 'bg-in-campus' : 'bg-danger'
              )}
              title={cardStatus === 'active' ? 'Active Credential' : 'Inactive Credential'}
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-medium text-ink-muted uppercase tracking-wider block">
              {studentInfo.role === 'teacher' ? 'Faculty ID' : 'Enrollment Roll'}
            </span>
            <h4 className="font-display text-base sm:text-h2 font-bold text-ink truncate leading-tight mt-0.5">
              {studentInfo.name}
            </h4>
            <p className="text-small text-ink-muted mt-0.5 leading-snug truncate">
              {studentInfo.branch}
            </p>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-base font-bold text-ink tracking-wide">
                {studentInfo.identifier}
              </span>
              {studentInfo.year && (
                <span className="text-[11px] font-mono text-ink-muted">
                  Year {studentInfo.year}
                  {studentInfo.division ? ` · Div ${studentInfo.division}` : ''}
                  {studentInfo.batch ? ` · ${studentInfo.batch}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Rotating QR & 30-Second Countdown (DESIGN.MD §8) */}
        <div className="border border-border rounded-md p-4 bg-surface flex flex-col items-center justify-center space-y-3">
          <div className="relative flex items-center justify-center">
            {isLoading ? (
              <div className="w-36 h-36 bg-surface-sunken border border-border rounded-md flex flex-col items-center justify-center text-ink-muted font-mono text-small animate-pulse">
                <QrIcon size={40} className="mb-2 opacity-50" />
                <span>Generating ID...</span>
              </div>
            ) : qrSvg ? (
              <div
                className="w-36 h-36 bg-surface border border-border rounded-md p-1 shadow-inner flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-36 h-36 bg-surface-sunken border border-border rounded-md flex flex-col items-center justify-center text-danger font-mono text-meta p-2 text-center">
                <span>Failed to generate QR</span>
              </div>
            )}
          </div>

          {/* Rotating Countdown Timer with SVG Ring */}
          <div className="w-full flex items-center justify-between text-meta font-mono border-t border-border pt-2.5 text-ink-muted">
            <div className="flex items-center gap-2">
              {/* Circular progress countdown ring */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  {/* Track ring */}
                  <circle
                    cx="18"
                    cy="18"
                    r={ringRadius}
                    className="stroke-border"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  {/* Dynamic countdown ring */}
                  <circle
                    cx="18"
                    cy="18"
                    r={ringRadius}
                    className={cn(
                      'transition-all duration-1000 ease-linear',
                      secondsRemaining <= 5 ? 'stroke-danger' : 'stroke-in-campus'
                    )}
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-ink">
                  {secondsRemaining}
                </span>
              </div>

              <div>
                <span className="text-ink font-semibold block text-[11px] leading-tight">
                  LIVE VERIFICATION
                </span>
                <span className="text-[10px] text-ink-muted block">
                  Refreshes in {secondsRemaining}s
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchNewToken}
              disabled={isRotating}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono border border-border rounded-sm text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer disabled:opacity-50"
              title="Manually rotate QR code"
              aria-label="Manually rotate QR code"
            >
              <RefreshCw
                size={12}
                className={cn('shrink-0', isRotating && 'animate-spin')}
              />
              <span>Rotate</span>
            </button>
          </div>
        </div>

        {/* 5. Screenshot resistance & Verification Timestamp (DESIGN.MD §8) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-sm bg-surface-sunken border border-border text-[11px] font-mono text-ink-muted">
          <span className="flex items-center gap-1.5 text-ink">
            <Clock size={13} strokeWidth={1.75} className="text-ink-muted" />
            <span>verified at {verifiedAtTime || '14:00'}</span>
          </span>
          <span className="text-[10px] text-ink-muted uppercase">
            30s Anti-Screenshot
          </span>
        </div>

        {/* 6. Desk & Clearance Info */}
        <div className="grid grid-cols-2 gap-2 text-meta font-mono p-2.5 rounded-sm bg-surface-sunken/60 border border-border">
          <div>
            <span className="text-[9px] text-ink-muted uppercase block">Clearance</span>
            <span className="font-semibold text-in-campus flex items-center gap-1 text-[11px]">
              <CheckCircle size={11} strokeWidth={2} /> Full Campus
            </span>
          </div>
          <div>
            <span className="text-[9px] text-ink-muted uppercase block">Valid Thru</span>
            <span className="font-semibold text-ink text-[11px]">June 2027</span>
          </div>
        </div>
      </div>

      {/* 7. Footer / Actions */}
      <div className="px-5 py-3 border-t border-border bg-surface-sunken/30 flex items-center justify-between gap-2">
        <a
          href="/verify"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-mono text-ink-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
        >
          <span>Open Guard Desk</span>
          <ExternalLink size={11} />
        </a>

        {onClose && (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  )
}
