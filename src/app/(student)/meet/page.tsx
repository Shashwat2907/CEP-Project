import Link from 'next/link'
import { CalendarClock, ArrowLeft, Clock, GraduationCap } from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'

export const metadata = {
  title: 'Teacher Sessions & Meet | Campus Portal',
  description: 'Book 1:1 doubt clearing and faculty office hours.',
}

export default function MeetPage() {
  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
      activePath="/meet"
    >
      <div className="w-full max-w-2xl py-6 space-y-6">
        <div className="border-b border-border pb-4">
          <Link
            href="/"
            className="text-small text-ink-muted hover:text-ink flex items-center gap-1.5 mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Campus Life</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-color-meet" />
            <h1 className="font-display text-h1 font-bold text-ink">
              Faculty Office Hours & 1:1 Meets
            </h1>
          </div>
          <p className="text-small text-ink-muted mt-1">
            Book 1:1 academic advising, doubt resolution, and lab project reviews.
          </p>
        </div>

        <div className="p-6 rounded-md border border-border bg-surface space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-sm bg-color-meet/10 border border-color-meet/30 flex items-center justify-center text-color-meet shrink-0">
              <CalendarClock size={20} />
            </div>
            <div>
              <h2 className="font-display text-small font-bold text-ink">
                Teacher Sessions Module
              </h2>
              <p className="text-meta font-mono text-ink-muted mt-0.5">
                Feature branch: feat/meet-booking · Owner: Kushal
              </p>
            </div>
          </div>

          <p className="text-small text-ink-muted leading-relaxed">
            Faculty availability scheduling and slot booking with calendar synchronization is being finalized per TEAM_TASKS.md. Once active, student bookings will directly sync into your unified timetable.
          </p>

          <div className="p-3.5 rounded-sm bg-surface-sunken border border-border flex items-center gap-2 text-meta font-mono text-ink-muted">
            <Clock size={14} className="text-ink" />
            <span>Scheduled for release in Phase 2 integration sprint.</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/calendar"
              className="px-4 py-2 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 transition-opacity"
            >
              View Calendar Timetable
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-sm border border-border bg-surface text-small font-medium text-ink hover:bg-surface-sunken transition-colors"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
