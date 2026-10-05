'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SessionRequest } from '../schema'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import {
  Clock,
  Calendar,
  ArrowLeft,
  Video,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react'
import { formatDeterministicDate, formatDeterministicTime } from '../date-format'

interface MeetingCountdownProps {
  session: SessionRequest
  startsAt: string
  endsAt?: string
}

export function MeetingCountdown({ session, startsAt }: MeetingCountdownProps) {
  const router = useRouter()
  const startsAtMs = new Date(startsAt).getTime()
  const BUFFER_BEFORE_MS = 10 * 60 * 1000
  const roomOpenAtMs = startsAtMs - BUFFER_BEFORE_MS

  const calculateRemaining = React.useCallback(
    () => Math.max(0, roomOpenAtMs - Date.now()),
    [roomOpenAtMs]
  )

  const [remainingMs, setRemainingMs] = useState<number>(calculateRemaining)
  const isRoomReady = remainingMs <= 0

  useEffect(() => {
    if (isRoomReady) return

    const interval = setInterval(() => {
      const diff = calculateRemaining()
      setRemainingMs(diff)
      if (diff <= 0) {
        clearInterval(interval)
        router.refresh()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRoomReady, calculateRemaining, router])

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const formattedDate = formatDeterministicDate(startsAt, 'long')
  const formattedTime = formatDeterministicTime(startsAt)

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-xl w-full bg-surface border-border shadow-float">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <Link href="/meet">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-ink-muted hover:text-ink">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Meet</span>
              </Button>
            </Link>

            <Chip variant="default" size="sm" pill>
              <Video className="h-3.5 w-3.5 text-blue-500" />
              <span>Online Session</span>
            </Chip>
          </div>

          {/* Main Countdown Display */}
          <div className="text-center space-y-3 py-4">
            {isRoomReady ? (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 text-success mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-h2 font-display font-bold text-ink">Room is Ready</h2>
                  <p className="text-small text-ink-muted mt-1">
                    The 10-minute early entry window has opened. You can now enter the video room.
                  </p>
                </div>
                <Button
                  onClick={() => router.refresh()}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 h-auto text-base"
                >
                  <Video className="h-5 w-5" />
                  <span>Enter Video Room</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-sunken text-ink-muted text-meta font-medium">
                  <Clock className="h-3.5 w-3.5 text-highlight" />
                  <span>Room Opens In</span>
                </div>

                <div className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-ink">
                  {formatCountdown(remainingMs)}
                </div>

                <p className="text-small text-ink-muted max-w-md mx-auto">
                  Video call rooms open exactly 10 minutes prior to the scheduled start time. This page will automatically refresh when ready.
                </p>

                <div className="pt-2 flex justify-center">
                  <Link href={`/meet/${session.id}?force=true`}>
                    <Button
                      variant="outline"
                      className="gap-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-medium"
                    >
                      <Video className="h-4 w-4" />
                      <span>Join Video Call Now (Instant Test Mode)</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Meeting Details Card */}
          <div className="bg-surface-sunken rounded-lg p-4 space-y-3 border border-border/50 text-small">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-border/40">
              <div className="space-y-1">
                <span className="text-meta text-ink-muted">Scheduled Time</span>
                <div className="flex items-center gap-1.5 font-medium text-ink">
                  <Calendar className="h-4 w-4 text-accent" />
                  <span suppressHydrationWarning>{formattedDate} at {formattedTime}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-meta text-ink-muted">Participants</span>
                <div className="font-medium text-ink">
                  {session.teacher?.full_name ?? 'Faculty Member'} & {session.student?.full_name ?? 'Student'}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-meta text-ink-muted">Agenda / Reason</span>
              <p className="text-ink leading-relaxed text-small line-clamp-3">
                {session.reason}
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-meta text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-success shrink-0" />
            <span>Strict two-party encryption: Only the booked student and teacher may enter.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
