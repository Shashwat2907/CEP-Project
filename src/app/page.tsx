import Link from 'next/link'
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
import { TodayScheduleBlock } from '@/features/calendar/components/today-schedule-block'
import { getTodayCalendarEntriesAction } from '@/features/calendar/actions'

export default async function Home() {
  const todayEntries = await getTodayCalendarEntriesAction()

  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
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
                label: 'Raise complaint',
                href: '/complaints',
                icon: AlertCircle,
                desc: 'Lodge issue or tracker',
              },
              {
                label: 'Request session',
                href: '/meet',
                icon: CalendarClock,
                desc: 'Book teacher 1:1 slot',
              },
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
                desc: 'Hackathons & club meets',
              },
              {
                label: 'Study resources',
                href: '/acad',
                icon: GraduationCap,
                desc: 'Notes, papers & decks',
              },
              {
                label: 'Campus friends',
                href: '/friends',
                icon: Users,
                desc: 'Live presence & network',
              },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="p-3.5 rounded-md border border-border bg-surface hover:border-ink/60 transition-colors flex flex-col justify-between group cursor-pointer"
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

        {/* 3. Campus Notice Board (DESIGN.MD §2: "Feels like a well-run campus notice board, not a corporate SaaS dashboard.") */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h3 font-bold text-ink">
              Campus Notice Board
            </h2>
            <span className="text-meta font-mono text-ink-muted">
              Official collegiate circulars
            </span>
          </div>

          <div className="bg-surface rounded-md border border-border divide-y divide-border overflow-hidden">
            {[
              {
                title: 'Mid-Semester Examinations Schedule Released',
                dept: 'Academic Affairs, Office of Controller of Exams',
                time: '2 hours ago',
                category: 'Academic',
                urgent: true,
              },
              {
                title: 'Annual Campus Hackathon 2026: InnovateX Registrations Open',
                dept: 'Turing Computer Society & Dept of CS',
                time: '5 hours ago',
                category: 'Events',
                urgent: false,
              },
              {
                title: 'Central Library Extended Reading Hall Hours for Exam Week',
                dept: 'University Library System',
                time: 'Yesterday',
                category: 'Facilities',
                urgent: false,
              },
              {
                title: 'Campus Wi-Fi Security Certificate Renewal Required',
                dept: 'Network & Systems Infrastructure',
                time: '2 days ago',
                category: 'IT Services',
                urgent: false,
              },
            ].map((notice, idx) => (
              <div
                key={idx}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-sunken/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-medium border ${
                        notice.urgent
                          ? 'bg-warning/15 text-warning border-warning/30'
                          : 'bg-surface-sunken text-ink-muted border-border'
                      }`}
                    >
                      {notice.category}
                    </span>
                    <span className="text-meta font-mono text-ink-muted flex items-center gap-1">
                      <Clock size={11} />
                      {notice.time}
                    </span>
                  </div>
                  <h3 className="font-display text-small font-bold text-ink leading-snug">
                    {notice.title}
                  </h3>
                  <p className="text-[12px] text-ink-muted">
                    {notice.dept}
                  </p>
                </div>

                <div className="self-start sm:self-center shrink-0">
                  <span className="text-meta font-mono text-ink hover:underline cursor-pointer flex items-center gap-1">
                    <span>View circular</span>
                    <ExternalLink size={11} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

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
                Roll: 23BCE1042
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
