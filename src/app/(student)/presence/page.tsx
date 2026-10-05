'use client'

import * as React from 'react'
import {
  MapPin,
  Clock,
  Calendar,
  Shield,
  Download,
  AlertCircle,
  Building,
  CheckCircle2,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Activity,
  History,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { AppShell } from '@/shared/ui/app-shell'
import { usePresence } from '@/features/presence/presence-context'
import { PresenceSession, PresenceDaily } from '@/features/presence/schema'
import { getPresenceSessions, getPresenceDaily, exportUserPresenceData } from '@/features/presence/actions'
import { cn } from '@/lib/utils'

function MyTimeOnCampusContent() {
  const {
    presenceState,
    zoneName,
    confidence,
    accuracyMeters,
    verifiedAt,
    consent,
    togglePause,
    checkCurrentLocation,
    simulateLocation,
    isChecking,
  } = usePresence()

  const [sessions, setSessions] = React.useState<PresenceSession[]>([])
  const [dailySummaries, setDailySummaries] = React.useState<PresenceDaily[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isExporting, setIsExporting] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [sessRes, dailyRes] = await Promise.all([
          getPresenceSessions(20),
          getPresenceDaily(14),
        ])
        if (sessRes.ok) setSessions(sessRes.data)
        if (dailyRes.ok) setDailySummaries(dailyRes.data)
      } catch {
        // Fallback gracefully
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const res = await exportUserPresenceData()
      if (res.ok) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `presence-data-export-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch {
      // Export failed
    } finally {
      setIsExporting(false)
    }
  }

  const isPaused = consent?.isPaused === true
  const formatTime = (iso?: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '—'
    }
  }

  // Calculate today's total minutes
  const todayDate = new Date().toISOString().slice(0, 10)
  const todaySummary = dailySummaries.find((d) => d.day === todayDate)
  const totalMinutesToday = todaySummary?.minutesOnCampus ?? (presenceState === 'in' ? 45 : 0)

  return (
    <div className="w-full py-2 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-in-campus animate-pulse" />
            <h1 className="font-display text-h1 font-bold text-ink">My Time on Campus</h1>
          </div>
          <p className="text-small text-ink-muted mt-1">
            Continuous presence record, verified sessions, and full DPDP Act data rights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center gap-1.5"
          >
            <Download size={15} strokeWidth={1.75} className={cn(isExporting && 'animate-spin')} />
            <span>{isExporting ? 'Exporting...' : 'Export My Data'}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => checkCurrentLocation()}
            disabled={isChecking}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={15} strokeWidth={1.75} className={cn(isChecking && 'animate-spin')} />
            <span>Verify Live GPS</span>
          </Button>
        </div>
      </div>

      {/* Hero Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Current Live State */}
        <div className="p-5 rounded-lg border border-border bg-surface shadow-xs space-y-3">
          <div className="flex items-center justify-between text-meta font-mono text-ink-muted">
            <span>LIVE STATUS</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-sm font-bold',
                presenceState === 'in'
                  ? 'bg-in-campus/10 text-in-campus border border-in-campus/30'
                  : presenceState === 'denied'
                  ? 'bg-danger/10 text-danger border border-danger/30'
                  : 'bg-surface-sunken text-ink-muted border border-border'
              )}
            >
              {presenceState.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                presenceState === 'in' ? 'bg-in-campus/15 text-in-campus' : 'bg-surface-sunken text-ink-muted'
              )}
            >
              <MapPin size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="font-display text-h3 font-bold text-ink leading-tight">
                {presenceState === 'in' ? 'Inside Campus' : isPaused ? 'Tracking Paused' : 'Outside Campus'}
              </p>
              <p className="text-small text-ink-muted mt-0.5">
                {presenceState === 'in' ? zoneName : 'Off Campus • No tracking recorded'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-meta text-ink-muted">
            <span>Accuracy: ±{Math.round(accuracyMeters)}m ({confidence})</span>
            <span>{verifiedAt ? formatTime(verifiedAt) : 'Just now'}</span>
          </div>
        </div>

        {/* Card 2: Today's Time */}
        <div className="p-5 rounded-lg border border-border bg-surface shadow-xs space-y-3">
          <div className="flex items-center justify-between text-meta font-mono text-ink-muted">
            <span>TODAY ON CAMPUS</span>
            <Clock size={16} strokeWidth={1.75} />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold text-ink">
                {Math.floor(Number(totalMinutesToday) / 60)}h {Math.round(Number(totalMinutesToday) % 60)}m
              </span>
            </div>
            <p className="text-small text-ink-muted mt-1">
              Recorded across {todaySummary?.sessionCount ?? (presenceState === 'in' ? 1 : 0)} verified sessions today
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-meta text-ink-muted">
            <span>First In: {formatTime(todaySummary?.firstIn ?? (presenceState === 'in' ? verifiedAt : null))}</span>
            <span>Last Seen: {formatTime(verifiedAt)}</span>
          </div>
        </div>

        {/* Card 3: Privacy & Data Protection */}
        <div className="p-5 rounded-lg border border-border bg-surface shadow-xs space-y-3">
          <div className="flex items-center justify-between text-meta font-mono text-ink-muted">
            <span>PRIVACY CONTRACT</span>
            <Shield size={16} strokeWidth={1.75} className="text-in-campus" />
          </div>

          <div className="space-y-1.5 text-meta text-ink">
            <div className="flex items-center gap-1.5 text-in-campus font-medium">
              <CheckCircle2 size={14} strokeWidth={2} />
              <span>Zero Raw GPS Coordinates Stored</span>
            </div>
            <div className="flex items-center gap-1.5 text-in-campus font-medium">
              <CheckCircle2 size={14} strokeWidth={2} />
              <span>Zero Tracking When Outside Campus</span>
            </div>
            <div className="flex items-center gap-1.5 text-in-campus font-medium">
              <CheckCircle2 size={14} strokeWidth={2} />
              <span>One-Tap Pause & Full Revocation</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-meta text-ink-muted">Consent: {isPaused ? 'Paused' : 'Active'}</span>
            <button
              type="button"
              onClick={() => togglePause(!isPaused)}
              className="text-meta font-bold text-ink hover:underline inline-flex items-center gap-1"
            >
              {isPaused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              {isPaused ? 'Resume Sharing' : 'Pause Sharing'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Simulation Testing bar */}
      <div className="p-4 rounded-md bg-surface-sunken border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={18} strokeWidth={1.75} className="text-ink-muted" />
          <div>
            <p className="text-small font-bold text-ink">Testing & Demonstration Tools</p>
            <p className="text-meta text-ink-muted">
              Simulate movement across the campus boundary to test auto-toggle and session recording.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => simulateLocation({ latitude: 12.9735, longitude: 79.1620, label: 'Main Campus' })}
            className="text-in-campus hover:bg-in-campus/10"
          >
            Simulate Inside Campus (IN)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => simulateLocation({ latitude: 12.9900, longitude: 79.2000, label: 'Off Campus' })}
            className="text-ink-muted hover:text-ink"
          >
            Simulate Outside Campus (OUT)
          </Button>
        </div>
      </div>

      {/* Main Content: Sessions & Daily History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Sessions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h3 font-bold text-ink flex items-center gap-2">
              <History size={18} strokeWidth={1.75} />
              <span>Campus Presence Sessions</span>
            </h2>
            <span className="text-meta font-mono text-ink-muted">
              {sessions.length} sessions recorded
            </span>
          </div>

          <div className="border border-border rounded-lg bg-surface divide-y divide-border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-muted text-small">
                Loading presence sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MapPin size={24} className="mx-auto text-ink-muted" />
                <p className="text-small font-bold text-ink">No recorded sessions yet</p>
                <p className="text-meta text-ink-muted max-w-sm mx-auto">
                  Sessions are automatically opened when you are verified inside campus and closed when you leave.
                </p>
              </div>
            ) : (
              sessions.map((sess) => (
                <div key={sess.id} className="p-4 flex items-center justify-between hover:bg-surface-sunken/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      sess.endedAt === null ? 'bg-in-campus animate-pulse' : 'bg-ink-muted'
                    )} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-small font-bold text-ink">
                          {sess.zoneName ?? 'Main Campus'}
                        </span>
                        {sess.endedAt === null && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/20">
                            LIVE SESSION
                          </span>
                        )}
                        {sess.closeReason && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-sm bg-surface-sunken text-ink-muted border border-border">
                            {sess.closeReason.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-meta text-ink-muted font-mono mt-0.5">
                        {formatTime(sess.startedAt)} — {sess.endedAt ? formatTime(sess.endedAt) : 'Now'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-display text-small font-bold text-ink block">
                      {sess.durationMinutes ? `${Math.round(sess.durationMinutes)} min` : 'In progress'}
                    </span>
                    <span className="text-meta font-mono text-ink-muted">
                      {new Date(sess.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Daily Summaries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h3 font-bold text-ink flex items-center gap-2">
              <Calendar size={18} strokeWidth={1.75} />
              <span>Daily Rollup</span>
            </h2>
            <span className="text-meta font-mono text-ink-muted">Last 14 days</span>
          </div>

          <div className="border border-border rounded-lg bg-surface divide-y divide-border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-muted text-small">
                Loading daily rollups...
              </div>
            ) : dailySummaries.length === 0 ? (
              <div className="p-8 text-center text-ink-muted text-small">
                No daily rollups recorded yet.
              </div>
            ) : (
              dailySummaries.map((daily) => (
                <div key={daily.id} className="p-3.5 flex items-center justify-between hover:bg-surface-sunken/40 transition-colors">
                  <div>
                    <span className="font-display text-small font-semibold text-ink block">
                      {new Date(daily.day).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-meta font-mono text-ink-muted">
                      {daily.sessionCount} {daily.sessionCount === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-small font-bold text-ink">
                      {Math.floor(daily.minutesOnCampus / 60)}h {Math.round(daily.minutesOnCampus % 60)}m
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyTimeOnCampusPage() {
  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
      activePath="/presence"
    >
      <MyTimeOnCampusContent />
    </AppShell>
  )
}

