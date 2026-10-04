'use client'

import * as React from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  QrCode,
  Building2,
  RefreshCw,
  Camera,
  History,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  CHECKPOINTS,
  type VerificationCheckpoint,
  type VerificationResult,
} from '../schema'
import {
  verifyDigitalIdTokenAction,
  manualLookupDigitalIdAction,
} from '../actions'

export interface VerifierDeskProps {
  initialToken?: string
  defaultCheckpoint?: VerificationCheckpoint
}

export function VerifierDesk({
  initialToken,
  defaultCheckpoint = 'Main Gate',
}: VerifierDeskProps) {
  const [checkpoint, setCheckpoint] = React.useState<VerificationCheckpoint>(defaultCheckpoint)
  const [tokenInput, setTokenInput] = React.useState<string>(initialToken || '')
  const [manualRollNumber, setManualRollNumber] = React.useState<string>('')
  const [activeTab, setActiveTab] = React.useState<'scan' | 'manual'>('scan')
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false)
  const [result, setResult] = React.useState<VerificationResult | null>(null)
  const [scanHistory, setScanHistory] = React.useState<VerificationResult[]>([])
  const verifiedRef = React.useRef(false)

  // Verify scanned/pasted token
  const handleVerifyToken = React.useCallback(
    async (tokenToVerify: string) => {
      if (!tokenToVerify.trim()) return
      setIsVerifying(true)
      try {
        const res = await verifyDigitalIdTokenAction({
          token: tokenToVerify.trim(),
          checkpoint,
        })
        setResult(res)
        setScanHistory((prev) => [res, ...prev.slice(0, 9)])
      } catch (err: unknown) {
        setResult({
          valid: false,
          status: 'tampered',
          message: (err as Error)?.message || 'Verification network failure',
          verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          checkpoint,
        })
      } finally {
        setIsVerifying(false)
      }
    },
    [checkpoint]
  )

  // Auto-verify if initialToken passed from URL query
  React.useEffect(() => {
    if (initialToken && !verifiedRef.current) {
      verifiedRef.current = true
      handleVerifyToken(initialToken)
    }
  }, [initialToken, handleVerifyToken])

  // Handle manual roll number lookup
  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualRollNumber.trim()) return
    setIsVerifying(true)
    try {
      const res = await manualLookupDigitalIdAction({
        collegeId: manualRollNumber.trim(),
        checkpoint,
      })
      setResult(res)
      setScanHistory((prev) => [res, ...prev.slice(0, 9)])
    } catch (err: unknown) {
      setResult({
        valid: false,
        status: 'not_found',
        message: (err as Error)?.message || 'Lookup failure',
        verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        checkpoint,
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResetForNext = () => {
    setResult(null)
    setTokenInput('')
    setManualRollNumber('')
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Header & Checkpoint Selector */}
      <div className="bg-surface border border-border rounded-md p-5 shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-in-campus animate-pulse" />
              <h1 className="font-display text-h2 font-bold text-ink tracking-tight">
                Digital ID Verification Desk
              </h1>
            </div>
            <p className="text-small text-ink-muted mt-0.5">
              Official guard, lab, library, and examination clearance verifier.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-ink-muted">Station:</span>
            <select
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value as VerificationCheckpoint)}
              className="bg-surface-sunken border border-border rounded-sm px-2.5 py-1.5 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
            >
              {CHECKPOINTS.map((cp) => (
                <option key={cp} value={cp}>
                  {cp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scan')
              handleResetForNext()
            }}
            className={cn(
              'px-3 py-1.5 rounded-sm text-small font-medium transition-colors cursor-pointer border',
              activeTab === 'scan'
                ? 'bg-ink text-on-ink border-ink'
                : 'bg-surface text-ink-muted border-border hover:bg-surface-sunken hover:text-ink'
            )}
          >
            <div className="flex items-center gap-1.5">
              <QrCode size={15} />
              <span>QR Scanner / Token</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual')
              handleResetForNext()
            }}
            className={cn(
              'px-3 py-1.5 rounded-sm text-small font-medium transition-colors cursor-pointer border',
              activeTab === 'manual'
                ? 'bg-ink text-on-ink border-ink'
                : 'bg-surface text-ink-muted border-border hover:bg-surface-sunken hover:text-ink'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Search size={15} />
              <span>Manual Roll Lookup</span>
            </div>
          </button>
        </div>

        {/* Scanner / Token Input Mode */}
        {activeTab === 'scan' && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste token string or scan QR with camera..."
                className="flex-1 bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
              <Button
                variant="primary"
                onClick={() => handleVerifyToken(tokenInput)}
                disabled={isVerifying || !tokenInput.trim()}
                className="shrink-0"
              >
                {isVerifying ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <ShieldCheck size={15} />
                )}
                <span>Verify token</span>
              </Button>
            </div>
            <p className="text-[11px] font-mono text-ink-muted">
              Note: Tokens rotate every 30 seconds. Screenshots or stale tokens will fail verification automatically.
            </p>
          </div>
        )}

        {/* Manual Lookup Mode */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualLookup} className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={manualRollNumber}
                onChange={(e) => setManualRollNumber(e.target.value)}
                placeholder="e.g. 23BCE1042 or T-CS-102"
                className="flex-1 bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isVerifying || !manualRollNumber.trim()}
                className="shrink-0"
              >
                {isVerifying ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Search size={15} />
                )}
                <span>Check roll number</span>
              </Button>
            </div>
            <p className="text-[11px] font-mono text-ink-muted">
              Manual fallback when student camera or screen is damaged. Logged as manual verification for security audits.
            </p>
          </form>
        )}
      </div>

      {/* 2. Live Verification Decision Card */}
      {result && (
        <div
          className={cn(
            'rounded-md border p-6 transition-all',
            result.status === 'valid'
              ? 'bg-surface border-in-campus'
              : result.status === 'expired'
              ? 'bg-surface border-warning'
              : 'bg-surface border-danger'
          )}
        >
          {/* Top Status Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              {result.status === 'valid' ? (
                <div className="w-12 h-12 rounded-full bg-in-campus text-white flex items-center justify-center">
                  <CheckCircle2 size={28} strokeWidth={2.25} />
                </div>
              ) : result.status === 'expired' ? (
                <div className="w-12 h-12 rounded-full bg-warning/20 text-warning border border-warning flex items-center justify-center">
                  <Clock size={28} strokeWidth={2.25} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-danger/15 text-danger border border-danger/30 flex items-center justify-center">
                  <XCircle size={28} strokeWidth={2.25} />
                </div>
              )}

              <div>
                <span
                  className={cn(
                    'font-mono text-xs font-semibold block',
                    result.status === 'valid'
                      ? 'text-in-campus'
                      : result.status === 'expired'
                      ? 'text-warning'
                      : 'text-danger'
                  )}
                >
                  {result.status === 'valid'
                    ? 'Clearance granted'
                    : result.status === 'expired'
                    ? 'Token expired'
                    : result.status === 'revoked'
                    ? 'ID revoked'
                    : result.status === 'suspended'
                    ? 'ID suspended'
                    : result.status === 'tampered'
                    ? 'Counterfeit token'
                    : 'Record not found'}
                </span>
                <h3 className="font-display text-h2 font-bold text-ink">
                  {result.message}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-ink-muted block">
                Verified at
              </span>
              <span className="font-mono text-small font-bold text-ink">
                {result.verifiedAt}
              </span>
            </div>
          </div>

          {/* Student Profile Info if recognized */}
          {result.subject && (
            <div className="pt-5 space-y-4">
              <div className="flex items-start gap-4">
                {/* Photo */}
                <div className="w-20 h-24 rounded-md bg-surface-sunken border border-border flex flex-col items-center justify-center font-display text-xl font-bold text-ink shadow-inner overflow-hidden shrink-0">
                  {result.subject.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.subject.photoUrl}
                      alt={result.subject.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <span>
                        {result.subject.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      <span className="text-[9px] font-mono text-ink-muted mt-1">Photo</span>
                    </>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono font-medium text-ink-muted block">
                    {result.subject.role === 'teacher' ? 'Faculty Member' : 'Enrolled Student'}
                  </span>
                  <h4 className="font-display text-h1 font-bold text-ink truncate leading-tight">
                    {result.subject.fullName}
                  </h4>
                  <p className="text-small text-ink-muted leading-snug truncate mt-0.5">
                    {result.subject.branch}
                  </p>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-lg font-bold text-ink">
                      {result.subject.collegeId}
                    </span>
                    {result.subject.year && (
                      <span className="text-meta font-mono text-ink-muted">
                        Year {result.subject.year}
                        {result.subject.division ? `, Div ${result.subject.division}` : ''}
                        {result.subject.batch ? `, ${result.subject.batch}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status details & verification warnings */}
              {result.subject.revocationReason && (
                <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-small text-danger font-medium">
                  <strong>Administrative Notice:</strong> {result.subject.revocationReason}
                </div>
              )}

              {result.tokenMeta && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-md bg-surface-sunken border border-border text-meta font-mono">
                  <div>
                    <span className="text-[10px] text-ink-muted block">Issued at</span>
                    <span className="font-semibold text-ink">{result.tokenMeta.issuedAt}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block">Expires at</span>
                    <span className="font-semibold text-ink">{result.tokenMeta.expiresAt}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block">Time remaining</span>
                    <span
                      className={cn(
                        'font-semibold',
                        result.tokenMeta.secondsRemaining && result.tokenMeta.secondsRemaining > 0
                          ? 'text-in-campus'
                          : 'text-danger'
                      )}
                    >
                      {result.tokenMeta.secondsRemaining !== undefined
                        ? `${result.tokenMeta.secondsRemaining}s`
                        : `${result.tokenMeta.expiredSecondsAgo}s expired`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block">Station</span>
                    <span className="font-semibold text-ink">{result.checkpoint}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-ink-muted">
              Audit log recorded automatically
            </span>
            <Button variant="primary" size="sm" onClick={handleResetForNext}>
              <UserCheck size={14} />
              <span>Verify next student</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Verification History Desk Log */}
      {scanHistory.length > 0 && (
        <div className="bg-surface border border-border rounded-md p-5 shadow-none space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <History size={16} className="text-ink-muted" />
              <h3 className="font-display text-small font-bold text-ink">
                Recent verifications at {checkpoint}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">
              {scanHistory.length} recorded
            </span>
          </div>

          <div className="divide-y divide-border">
            {scanHistory.map((scan, idx) => (
              <div
                key={idx}
                className="py-2.5 flex items-center justify-between gap-3 text-small"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {scan.status === 'valid' ? (
                    <span className="w-2 h-2 rounded-full bg-in-campus shrink-0" />
                  ) : scan.status === 'expired' ? (
                    <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                  )}

                  <span className="font-mono font-bold text-ink">
                    {scan.subject?.collegeId || 'UNKNOWN'}
                  </span>
                  <span className="text-ink-muted truncate">
                    {scan.subject?.fullName || scan.message}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-meta font-mono text-ink-muted">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-xs text-[10px] font-medium capitalize',
                      scan.status === 'valid'
                        ? 'bg-in-campus/10 text-in-campus'
                        : scan.status === 'expired'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-danger/10 text-danger'
                    )}
                  >
                    {scan.status}
                  </span>
                  <span>{scan.verifiedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
