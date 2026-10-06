import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import {
  getTeachersList,
  getMySessionRequests,
  getTeacherSessionRequests,
} from '@/features/meet/queries'
import { MeetDashboard } from '@/features/meet/components/MeetDashboard'
import { Button } from '@/shared/ui/button'
import Link from 'next/link'
import { Clock, ArrowLeft, CalendarClock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Campus Meet — Teacher Appointments',
  description: 'Schedule one-on-one sessions and office hour appointments with faculty members.',
}

export default async function MeetPage() {
  await requireAuth()
  const profile = await getCurrentProfile()
  const teachers = await getTeachersList()

  const isTeacher = profile?.role_primary === 'teacher' || profile?.role_primary === 'admin'

  const [mySessions, teacherRequests] = await Promise.all([
    getMySessionRequests(),
    isTeacher ? getTeacherSessionRequests() : Promise.resolve([]),
  ])

  return (
    <>

<div className="w-full max-w-5xl py-2 space-y-6">
  {/* Navigation Breadcrumb */}
  <div className="flex items-center justify-between pb-4 border-b border-border">
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-border bg-surface hover:bg-surface-sunken text-ink transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Return to Homepage</span>
      </Link>
      <div className="h-4 w-px bg-border" />
      <span className="text-xs text-ink-muted flex items-center gap-1.5">
        <CalendarClock size={13} className="text-color-meet" />
        Faculty Sessions & Meet
      </span>
    </div>

    {isTeacher && (
      <Link href="/meet/availability">
        <Button variant="outline" className="gap-2 text-xs h-8">
          <Clock className="h-3.5 w-3.5" /> Manage My Availability
        </Button>
      </Link>
    )}
  </div>

  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h1 className="font-display text-h1 font-bold text-ink">Campus Meet</h1>
      <p className="text-small text-ink-muted mt-1">
        Browse faculty office hours, discover open appointment slots, and connect with mentors.
      </p>
    </div>
  </div>

  {/* Main Meet Dashboard */}
  <MeetDashboard
    isTeacher={Boolean(isTeacher)}
    teachers={teachers}
    mySessions={mySessions}
    teacherRequests={teacherRequests}
  />
</div>
    </>
  )
}
