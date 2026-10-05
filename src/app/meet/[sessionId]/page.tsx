import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSessionCallAccess } from '@/features/meet/queries'
import { CallInterface } from '@/features/meet/components/CallInterface'
import { MeetingCountdown } from '@/features/meet/components/MeetingCountdown'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import {
  Lock,
  CalendarX,
  MapPin,
  Clock,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'

interface SessionCallPageProps {
  params: Promise<{ sessionId: string }>
}

export const metadata: Metadata = {
  title: 'Video Call — Campus Meet',
  description: 'Live one-on-one video call room for scheduled campus appointments.',
}

export default async function SessionCallPage({ params }: SessionCallPageProps) {
  const { sessionId } = await params
  const access = await getSessionCallAccess(sessionId)

  if (access.ok) {
    return <CallInterface access={access} />
  }

  // Pre-meeting waiting screen if user arrives before 10-min window
  if (access.code === 'TOO_EARLY' && access.session && access.startsAt) {
    return (
      <MeetingCountdown
        session={access.session}
        startsAt={access.startsAt}
        endsAt={access.endsAt}
      />
    )
  }

  // Error / Access Denied States
  const getErrorContent = () => {
    switch (access.code) {
      case 'UNAUTHORIZED':
        return {
          icon: <Lock className="h-10 w-10 text-danger" />,
          title: 'Access Restricted',
          description:
            'You are not a registered participant in this scheduled meeting. Video call rooms are strictly private to the assigned faculty member and student.',
        }
      case 'NOT_ONLINE_SESSION':
        return {
          icon: <MapPin className="h-10 w-10 text-success" />,
          title: 'In-Person Appointment',
          description:
            access.session?.location
              ? `This session was scheduled for an in-person meeting at ${access.session.location}. No video call room is required.`
              : 'This session was scheduled for an in-person meeting. No video call room is required.',
        }
      case 'EXPIRED':
        return {
          icon: <Clock className="h-10 w-10 text-ink-muted" />,
          title: 'Meeting Concluded',
          description:
            'This scheduled meeting session has already passed its scheduled end time and has concluded.',
        }
      case 'NOT_FOUND':
      default:
        return {
          icon: <CalendarX className="h-10 w-10 text-warning" />,
          title: 'Meeting Not Found',
          description:
            access.message || 'The requested appointment session does not exist or may have been cancelled.',
        }
    }
  }

  const { icon, title, description } = getErrorContent()

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-surface border-border shadow-float text-center">
        <CardContent className="p-8 space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-sunken mx-auto border border-border">
            {icon}
          </div>

          <div className="space-y-2">
            <h1 className="text-h2 font-display font-bold text-ink">{title}</h1>
            <p className="text-small text-ink-muted leading-relaxed">
              {description}
            </p>
          </div>

          {access.session && (
            <div className="bg-surface-sunken p-3.5 rounded-lg border border-border/50 text-left text-xs space-y-1">
              <div className="font-semibold text-ink flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-accent" />
                <span>Session Details</span>
              </div>
              <p className="text-ink-muted">
                With: {access.session.teacher?.full_name || 'Faculty Member'}
              </p>
              <p className="text-ink-muted">
                Starts: {new Date(access.session.starts_at).toLocaleString()}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Link href="/meet">
              <Button variant="primary" className="w-full gap-2 bg-ink text-on-ink">
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Meet Dashboard</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
