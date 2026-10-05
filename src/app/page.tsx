import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertCircle,
  CalendarClock,
  Search,
  Calendar,
  GraduationCap,
  Users,
  ShieldCheck,
  MapPin,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'
import { CampusNoticeBoard } from '@/shared/ui/campus-notice-board'
import { TodayScheduleBlock } from '@/features/calendar/components/today-schedule-block'
import { getTodayCalendarEntriesAction } from '@/features/calendar/actions'
import { getCurrentProfile } from '@/shared/auth/session'

export default async function Home() {
  const profile = await getCurrentProfile()

  // RBAC routing: Redirect teachers and admins to their respective primary workspaces
  if (profile?.role_primary === 'admin') {
    redirect('/admin')
  }
  if (profile?.role_primary === 'teacher') {
    redirect('/teacher/acad')
  }

  const todayEntries = await getTodayCalendarEntriesAction()

  return (
    <AppShell
      initialRole={profile?.role_primary ?? 'student'}
      userName={profile?.full_name ?? 'Aarav Mehta'}
      identifier={profile?.college_id ?? '23BCE1001'}
      department={profile?.branch ? `${profile.branch} (Year ${profile.year ?? 2})` : 'Computer Science'}
      userEmail={profile?.college_email ?? 'student@campus.edu'}
      activePath="/"
    >
      <div className="w-full space-y-8">
        {/* Page Title in content per DESIGN.MD §6 */}
        <div className="border-b border-border pb-4">
          <h1 className="font-display text-display font-bold text-ink tracking-tight">
            Campus Life & Daily Overview
          </h1>
          <p className="text-small text-ink-muted mt-1 max-w-[70ch]">
            Today's classes, faculty sessions, campus alerts, and quick actions governed by lecture-hall clarity.
          </p>
        </div>

        {/* 1. First block: Today on Campus Schedule (PLAN.MD §5.11: "'Today' is the home page's first block.") */}
        <TodayScheduleBlock initialEntries={todayEntries} />

        {/* 2. Campus Quick Actions (PLAN.MD §8 Phase 1 item 7: "quick actions" with verbs per DESIGN.MD §2) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h3 font-bold text-ink">
              Quick Actions
            </h2>
            <span className="text-meta font-mono text-ink-muted">
              Direct campus workflows
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: 'Report lost item',
                href: '/lost-found',
                icon: Search,
                desc: 'Desk handover & claims',
              },
              {
                label: 'Explore events',
                href: '/events',
                icon: Calendar,
                desc: 'Unstop prizes & meets',
              },
              {
                label: 'Campus friends',
                href: '/friends',
                icon: Users,
                desc: 'WhatsApp-style chat',
              },
              {
                label: 'Unified calendar',
                href: '/calendar',
                icon: CalendarClock,
                desc: 'Classes, meets & tasks',
              },
              {
                label: 'Raise complaint',
                href: '/complaints',
                icon: AlertCircle,
                desc: 'Lodge issue or tracker',
              },
              {
                label: 'Faculty sessions',
                href: '/meet',
                icon: GraduationCap,
                desc: 'Book teacher 1:1 slot',
              },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="p-3.5 rounded-md border border-border bg-surface hover:border-ink/60 transition-colors flex flex-col justify-between group cursor-pointer shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-sm bg-surface-sunken border border-border flex items-center justify-center text-ink group-hover:text-ink">
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-small font-semibold text-ink leading-tight">
                        {action.label}
                      </p>
                      <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                        {action.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* 3. Campus Notice Board with Interactive Circular Dialogs */}
        <CampusNoticeBoard />

        {/* 4. Live Identity & Campus Gate Status Summary */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gate Presence card */}
          <div className="p-4 rounded-md border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={18} strokeWidth={1.75} className="text-ink" />
                <h3 className="font-display text-small font-bold text-ink">
                  Campus Presence Status
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-sm text-meta font-mono bg-in-campus/15 text-in-campus border border-in-campus/30">
                Inside campus
              </span>
            </div>
            <p className="text-small text-ink-muted leading-relaxed">
              Main Campus boundary verified via high-confidence geofence evaluation. Zero raw GPS coordinates stored.
            </p>
            <div className="pt-1">
              <Link
                href="/presence"
                className="text-small font-semibold text-ink underline hover:text-ink-muted transition-colors"
              >
                View campus presence time log
              </Link>
            </div>
          </div>

          {/* Digital ID card quick reference */}
          <div className="p-4 rounded-md border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} strokeWidth={1.75} className="text-ink" />
                <h3 className="font-display text-small font-bold text-ink">
                  Verifiable Digital ID
                </h3>
              </div>
              <span className="font-mono text-meta text-ink-muted">
                Roll: {profile?.college_id ?? '23BCE1001'}
              </span>
            </div>
            <p className="text-small text-ink-muted leading-relaxed">
              Rotating QR code with 30-second token lifecycle. Tap the ID chip in the top bar anytime to present at campus gates or library desks.
            </p>
            <div className="pt-1">
              <Link
                href="/verify"
                className="text-small font-semibold text-ink underline hover:text-ink-muted transition-colors"
              >
                Open official verifier desk
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
