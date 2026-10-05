'use client'

import * as React from 'react'
import { Clock, ExternalLink, FileText, X, Download, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'

export interface CampusNotice {
  id: string
  refNumber: string
  title: string
  dept: string
  time: string
  category: 'Academic' | 'Events' | 'Facilities' | 'IT Services'
  urgent: boolean
  content: string
}

const NOTICES: CampusNotice[] = [
  {
    id: 'n-1',
    refNumber: 'REF: ACA/EXAM/2026/089',
    title: 'Mid-Semester Examinations Schedule Released',
    dept: 'Academic Affairs, Office of Controller of Exams',
    time: '2 hours ago',
    category: 'Academic',
    urgent: true,
    content: `All students enrolled in undergraduate and postgraduate degree programmes are hereby notified that the Mid-Semester Examination schedule for Autumn Semester 2026 has been finalized.\n\nKey Guidelines:\n1. Examinations will commence from 15th October 2026 across assigned university examination halls.\n2. Students must carry their Verifiable Digital ID or physical identity cards to all testing centers.\n3. Seating arrangements and hall tickets will be uploaded to student portals 48 hours prior to examination dates.\n4. Any conflict in paper dates must be reported via the Complaints Desk before 10th October 2026.`,
  },
  {
    id: 'n-2',
    refNumber: 'REF: CS/TECH/2026/014',
    title: 'Annual Campus Hackathon 2026: InnovateX Registrations Open',
    dept: 'Turing Computer Society & Dept of CS',
    time: '5 hours ago',
    category: 'Events',
    urgent: false,
    content: `InnovateX 2026 is the premier collegiate hackathon open to all universities across the state. Featuring a ₹2,00,000 cash prize pool, domain mentorship from industry engineering leaders, and direct interview fast-tracks.\n\nTracks include AI/ML, Distributed Systems, Sustainable Tech, and Cyber-Physical Systems. Form teams of 2 to 4 students. Explore the official events portal to register your team.`,
  },
  {
    id: 'n-3',
    refNumber: 'REF: LIB/OPS/2026/033',
    title: 'Central Library Extended Reading Hall Hours for Exam Week',
    dept: 'University Library System',
    time: 'Yesterday',
    category: 'Facilities',
    urgent: false,
    content: `To facilitate quiet exam preparation, the Central Library Reading Hall and quiet cubicles will remain open 24/7 starting from next Monday through the end of mid-semester examinations.\n\nCafeteria night kiosk service will be active from 22:00 to 04:00. Student campus ID is required for late-night entry at the security turnstiles.`,
  },
  {
    id: 'n-4',
    refNumber: 'REF: ITS/SEC/2026/102',
    title: 'Campus Wi-Fi Security Certificate Renewal Required',
    dept: 'Network & Systems Infrastructure',
    time: '2 days ago',
    category: 'IT Services',
    urgent: false,
    content: `All devices connecting to 'Campus-Secure-WPA3' must install the updated 2026 root CA certificate. Un-updated credentials will experience connection dropouts after Friday midnight.\n\nDownload the profile configuration from the IT Services portal or visit the help desk at Academic Block A Ground Floor.`,
  },
]

export function CampusNoticeBoard() {
  const [selectedNotice, setSelectedNotice] = React.useState<CampusNotice | null>(null)

  return (
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
        {NOTICES.map((notice) => (
          <div
            key={notice.id}
            onClick={() => setSelectedNotice(notice)}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-sunken/40 transition-colors cursor-pointer group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-medium border ${
                    notice.urgent
                      ? 'bg-warning/15 text-warning border-warning/30 font-bold'
                      : 'bg-surface-sunken text-ink-muted border-border'
                  }`}
                >
                  {notice.category}
                </span>
                <span className="text-meta font-mono text-ink-muted flex items-center gap-1">
                  <Clock size={11} />
                  {notice.time}
                </span>
                <span className="text-[10px] font-mono text-ink-muted/80 hidden sm:inline">
                  {notice.refNumber}
                </span>
              </div>
              <h3 className="font-display text-small font-bold text-ink leading-snug group-hover:text-ink transition-colors">
                {notice.title}
              </h3>
              <p className="text-[12px] text-ink-muted">
                {notice.dept}
              </p>
            </div>

            <div className="self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedNotice(notice)
                }}
                className="text-meta font-mono text-ink hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>View circular</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Official Circular Dialog */}
      <Dialog open={!!selectedNotice} onOpenChange={(open) => !open && setSelectedNotice(null)}>
        <DialogContent className="max-w-lg">
          {selectedNotice && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono font-bold text-ink bg-surface-sunken border border-border px-2 py-0.5 rounded-xs">
                    {selectedNotice.refNumber}
                  </span>
                  <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                    <ShieldCheck size={12} className="text-in-campus" />
                    <span>Verified Official Notice</span>
                  </span>
                </div>
                <DialogTitle className="text-h2 font-bold text-ink leading-snug">
                  {selectedNotice.title}
                </DialogTitle>
                <DialogDescription className="text-meta font-mono text-ink-muted">
                  Issued by {selectedNotice.dept} · {selectedNotice.time}
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 border-t border-b border-border my-2">
                <div className="p-4 rounded-sm bg-surface-sunken/40 border border-border text-small text-ink whitespace-pre-line leading-relaxed font-sans">
                  {selectedNotice.content}
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                <span className="text-[11px] font-mono text-ink-muted">
                  Status: College-wide Distribution
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedNotice(null)}
                  >
                    <span>Close</span>
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
