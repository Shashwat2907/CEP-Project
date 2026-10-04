import Link from 'next/link'
import { Flag, ArrowLeft, Clock } from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'

export const metadata = {
  title: 'Student Clubs & Chapters | Campus Portal',
  description: 'Explore campus student organizations and technical societies.',
}

export default function ClubsPage() {
  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
      activePath="/clubs"
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
            <span className="w-2.5 h-2.5 rounded-full bg-color-clubs" />
            <h1 className="font-display text-h1 font-bold text-ink">
              Student Clubs & Technical Chapters
            </h1>
          </div>
          <p className="text-small text-ink-muted mt-1">
            Registered collegiate societies, recruitment cycles, and club events.
          </p>
        </div>

        <div className="p-6 rounded-md border border-border bg-surface space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-sm bg-color-clubs/10 border border-color-clubs/30 flex items-center justify-center text-color-clubs shrink-0">
              <Flag size={20} />
            </div>
            <div>
              <h2 className="font-display text-small font-bold text-ink">
                Clubs & Chapters Module
              </h2>
              <p className="text-meta font-mono text-ink-muted mt-0.5">
                Feature branch: feat/clubs-directory · Owner: Kedar
              </p>
            </div>
          </div>

          <p className="text-small text-ink-muted leading-relaxed">
            Club directory, membership applications, and announcement boards are being built per TEAM_TASKS.md. In the meantime, you can explore all upcoming club-organized hackathons and technical workshops in the Events directory.
          </p>

          <div className="p-3.5 rounded-sm bg-surface-sunken border border-border flex items-center gap-2 text-meta font-mono text-ink-muted">
            <Clock size={14} className="text-ink" />
            <span>Scheduled for release in Phase 2 integration sprint.</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/events"
              className="px-4 py-2 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 transition-opacity"
            >
              Explore Club Events & Hackathons
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
