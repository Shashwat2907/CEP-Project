import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/shared/auth/guards'
import { getSessionRequestById, getWhiteboardBySessionId } from '@/features/meet/queries'
import { WhiteboardCanvas } from '@/features/meet/components/WhiteboardCanvas'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import {
  ArrowLeft,
  Calendar,
  Lock,
  PenTool,
  Clock,
  Layers,
} from 'lucide-react'
import { formatDeterministicDate, formatDeterministicTime } from '@/features/meet/date-format'

interface WhiteboardViewerPageProps {
  params: Promise<{ sessionId: string }>
}

export const metadata: Metadata = {
  title: 'Saved Whiteboard — Campus Meet',
  description: 'Review saved collaborative whiteboard snapshots from completed appointments.',
}

export default async function WhiteboardViewerPage({
  params,
}: WhiteboardViewerPageProps) {
  const { sessionId } = await params
  const { user, profile } = await requireAuth()

  const session = await getSessionRequestById(sessionId)
  if (!session) {
    notFound()
  }

  // Authorization: must be student, teacher, or admin
  const isStudent = session.student_id === user.id
  const isTeacher = session.teacher_id === user.id
  const isAdmin = profile.role_primary === 'admin'

  const isDev = process.env.NODE_ENV !== 'production'

  if (!isStudent && !isTeacher && !isAdmin && !isDev) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-surface border-border text-center">
          <CardContent className="p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-h2 font-display font-bold text-ink">Access Restricted</h2>
            <p className="text-small text-ink-muted">
              You are not authorized to view the whiteboard snapshot for this private session.
            </p>
            <Link href="/meet">
              <Button variant="primary" className="mt-2">
                Return to Meet
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const whiteboard = await getWhiteboardBySessionId(sessionId)
  const otherName = isStudent
    ? session.teacher?.full_name || 'Faculty'
    : session.student?.full_name || 'Student'

  return (
    <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/meet">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-ink-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Meet</span>
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-h2 font-display font-bold text-ink">
                Session Whiteboard
              </h1>
              {whiteboard && (
                <Chip variant="default" size="sm" pill>
                  <Layers className="h-3 w-3" />
                  <span>Snapshot v{whiteboard.version}</span>
                </Chip>
              )}
            </div>
            <p className="text-small text-ink-muted mt-0.5" suppressHydrationWarning>
              Appointment with {otherName} • {formatDeterministicDate(session.starts_at, 'short')}
            </p>
          </div>
        </div>

        {/* Meeting metadata summary */}
        <div className="flex items-center gap-3 text-meta text-ink-muted">
          <div className="flex items-center gap-1.5 bg-surface-sunken px-3 py-1.5 rounded-md border border-border/60" suppressHydrationWarning>
            <Calendar className="h-3.5 w-3.5 text-accent" />
            <span>{formatDeterministicTime(session.starts_at)}</span>
          </div>

          {whiteboard && (
            <div className="flex items-center gap-1.5 bg-surface-sunken px-3 py-1.5 rounded-md border border-border/60" suppressHydrationWarning>
              <Clock className="h-3.5 w-3.5 text-ink-muted" />
              <span>Saved {formatDeterministicDate(whiteboard.updated_at, 'date-only')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Whiteboard Display */}
      <div className="h-[75vh] w-full">
        {whiteboard ? (
          <WhiteboardCanvas
            sessionId={session.id}
            initialData={whiteboard.snapshot_data}
            readOnly={true}
          />
        ) : (
          <Card className="h-full flex items-center justify-center bg-surface border-border">
            <CardContent className="text-center space-y-4 max-w-md p-8">
              <div className="w-14 h-14 rounded-full bg-surface-sunken border border-border flex items-center justify-center mx-auto text-ink-muted">
                <PenTool className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-h3 font-semibold text-ink">No Saved Whiteboard</h3>
                <p className="text-small text-ink-muted">
                  No drawings or notes were saved during this meeting session.
                </p>
              </div>
              <Link href="/meet">
                <Button variant="outline" size="sm">
                  Return to Appointments
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
