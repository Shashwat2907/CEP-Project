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
import { Clock } from 'lucide-react'
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
    <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 font-bold text-ink">Campus Meet</h1>
          <p className="text-small text-ink-muted mt-1">
            Browse faculty office hours, discover open appointment slots, and connect with mentors.
          </p>
        </div>

        {isTeacher && (
          <Link href="/meet/availability">
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" /> Manage My Availability
            </Button>
          </Link>
        )}
      </div>

      {/* Main Meet Dashboard */}
      <MeetDashboard
        isTeacher={Boolean(isTeacher)}
        teachers={teachers}
        mySessions={mySessions}
        teacherRequests={teacherRequests}
      />
    </main>
  )
}
