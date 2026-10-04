import { AppShell } from '@/shared/ui/app-shell'
import { AdminCampusBoundary } from '@/features/presence'
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
      <div className="max-w-[1200px] space-y-10">
        {/* First block: Today on Campus Schedule (PLAN.MD §5.11: "'Today' is the home page's first block.") */}
        <TodayScheduleBlock initialEntries={todayEntries} />

        {/* Quick Launch Features Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <span>Campus Quick Hub</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Primary Modules
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/acad"
              className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold mb-3">
                  📚
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-primary transition-colors">
                  Academic Resources
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Course notes, PYQs, AI flashcard generator & grounded chat assistant.
                </p>
              </div>
              <span className="text-xs text-primary font-semibold mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Open Acads →
              </span>
            </a>

            <a
              href="/community"
              className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold mb-3">
                  💬
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-primary transition-colors">
                  Campus Communities
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Classroom rooms, doubt threads, upvote recognition & badge awards.
                </p>
              </div>
              <span className="text-xs text-primary font-semibold mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Explore Communities →
              </span>
            </a>

            <a
              href="/complaints"
              className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold mb-3">
                  ⚠️
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-primary transition-colors">
                  Campus Complaints
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Log campus maintenance and facility issues with auto-escalation SLAs.
                </p>
              </div>
              <span className="text-xs text-primary font-semibold mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Complaints →
              </span>
            </a>

            <a
              href="/calendar"
              className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold mb-3">
                  📅
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-primary transition-colors">
                  Academic Calendar
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Timetables, lab schedules, exam dates, and personal study deadlines.
                </p>
              </div>
              <span className="text-xs text-primary font-semibold mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Check Schedule →
              </span>
            </a>
          </div>
        </section>

        {/* Page header (Page title in content body per DESIGN.MD §6) */}
        <div>
          <h1 className="font-display text-display font-bold text-ink">
            Campus Super-App & Design System
          </h1>
          <p className="text-ink-muted text-small mt-1">
            Governed by <code className="font-mono text-meta bg-surface-sunken px-1.5 py-0.5 rounded-sm">documents/DESIGN.MD</code> · Status cluster, role-based nav, and tokens active.
          </p>
        </div>

        {/* Section 1: Core Palette */}
        <section className="space-y-4">
          <h2 className="font-display text-h2 font-semibold text-ink">1. Core Palette</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {[
              { name: 'Mist (App BG)', token: 'bg-bg', hex: '#F3F5F9', border: true },
              { name: 'Paper (Surface)', token: 'bg-surface', hex: '#FFFFFF', border: true },
              { name: 'Sunken (Inputs)', token: 'bg-surface-sunken', hex: '#E9EDF4', border: true },
              { name: 'Border', token: 'bg-border', hex: '#D8DEE9', border: false },
              { name: 'Navy Ink', token: 'bg-ink text-on-ink', hex: '#16213E', border: false },
              { name: 'Ink Muted', token: 'bg-ink-muted text-on-ink', hex: '#5B667D', border: false },
              { name: 'Pencil Yellow', token: 'bg-highlight text-ink font-bold', hex: '#F5B700', border: false },
            ].map((c) => (
              <div
                key={c.name}
                className={`p-3 rounded-md ${c.token} ${c.border ? 'border border-border' : ''} shadow-none flex flex-col justify-between h-24`}
              >
                <span className="text-meta font-medium leading-tight">{c.name}</span>
                <span className="font-mono text-meta opacity-80">{c.hex}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Semantic & Presence Colors */}
        <section className="space-y-4">
          <h2 className="font-display text-h2 font-semibold text-ink">2. Semantic Status & Presence</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: 'IN Campus', class: 'bg-in-campus text-white', hex: '#1F9D6B' },
              { name: 'OUT Campus', class: 'bg-out-campus text-white', hex: '#5B667D' },
              { name: 'Danger / Escalated', class: 'bg-danger text-white', hex: '#D64545' },
              { name: 'Warning / Pending', class: 'bg-warning text-white', hex: '#D98A00' },
              { name: 'Success / Resolved', class: 'bg-success text-white', hex: '#1F9D6B' },
            ].map((s) => (
              <div
                key={s.name}
                className={`p-3 rounded-md ${s.class} flex flex-col justify-between h-20`}
              >
                <span className="text-meta font-medium leading-tight">{s.name}</span>
                <span className="font-mono text-meta opacity-90">{s.hex}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Status Vocabulary Chips (DESIGN.MD §9) */}
        <section className="space-y-4">
          <h2 className="font-display text-h2 font-semibold text-ink">3. Status Vocabulary (DESIGN.MD §9)</h2>
          <div className="space-y-3 bg-surface p-6 rounded-md border border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-meta font-medium w-28 text-ink-muted">Complaint:</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-surface-sunken text-ink-muted">Open</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-ink text-on-ink">In progress</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-danger text-white">Escalated</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-success text-white">Resolved</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-surface-sunken text-ink-muted">Closed as duplicate</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-meta font-medium w-28 text-ink-muted">Session:</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-warning text-white">Pending</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-ink text-on-ink">Accepted</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-surface-sunken text-ink-muted">Declined</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-success text-white">Completed</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-meta font-medium w-28 text-ink-muted">Lost & Found:</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-surface-sunken text-ink-muted">Reported</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-warning text-white">Matched</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-ink text-on-ink">Ready for pickup</span>
              <span className="px-2.5 py-0.5 rounded-sm text-meta font-medium bg-success text-white">Returned</span>
            </div>
          </div>
        </section>

        {/* Section 4: Typography Showcase */}
        <section className="space-y-4">
          <h2 className="font-display text-h2 font-semibold text-ink">4. Typography Scale & Families</h2>
          <div className="bg-surface p-6 rounded-md border border-border space-y-4">
            <div>
              <p className="text-meta text-ink-muted font-mono">Bricolage Grotesque (Headings)</p>
              <h1 className="font-display text-h1 font-semibold text-ink">Heading 1 — Campus Super-App (24px/32px)</h1>
              <h2 className="font-display text-h2 font-semibold text-ink">Heading 2 — Section Subtitle (20px/28px)</h2>
            </div>
            <hr className="border-border" />
            <div>
              <p className="text-meta text-ink-muted font-mono">Instrument Sans (Body & UI)</p>
              <p className="font-body text-body text-ink mt-1 max-w-[70ch]">
                Body text (15px/24px) formatted to max 70 characters line length per DESIGN.MD §4 for comfortable reading across desktop and mobile devices.
              </p>
              <p className="font-body text-small text-ink-muted mt-1">
                Small text (13px/20px) — helper descriptions and secondary UI metadata.
              </p>
            </div>
            <hr className="border-border" />
            <div>
              <p className="text-meta text-ink-muted font-mono">JetBrains Mono (IDs & Codes)</p>
              <p className="font-mono text-mono text-ink mt-1">
                Roll: 23BCE1042 · Token: 981-420 · SLA: 24h
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Campus Geofence Boundary & Presence Verification */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h2 font-semibold text-ink">
              5. Campus Boundary Polygon & Geofence Tester
            </h2>
            <span className="font-mono text-meta px-2 py-0.5 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/20">
              feat/presence-toggle
            </span>
          </div>
          <AdminCampusBoundary />
        </section>
      </div>
    </AppShell>
  )
}
