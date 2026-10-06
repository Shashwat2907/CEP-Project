import * as React from 'react'
import { AlertCircle, ShieldAlert, ArrowUpRight } from 'lucide-react'
import { getTrackerComplaintsWithUpvotes } from '@/features/complaints/queries'
import { PublicTrackerBoard } from '@/features/complaints/components/PublicTrackerBoard'

export default async function OverseerComplaintsPage() {
  const complaints = await getTrackerComplaintsWithUpvotes()
  
  const highPriority = complaints.filter(c => c.upvotes_count > 5).length
  const recentComplaints = complaints.length

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-display text-display font-bold text-ink flex items-center gap-2">
          <AlertCircle className="text-warning" size={28} />
          Campus Grievances
        </h1>
        <p className="text-small text-ink-muted mt-1 max-w-[70ch]">
          Oversee reported campus complaints, review priority escalations, and monitor resolution SLAs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Active Complaints</p>
          <p className="text-3xl font-bold text-ink mt-2">{recentComplaints}</p>
        </div>
        
        <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 shadow-xs">
          <p className="text-xs text-warning-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert size={14} /> High Priority (SLA At Risk)
          </p>
          <p className="text-3xl font-bold text-warning-foreground mt-2">{highPriority}</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-display text-ink flex items-center gap-2">
            <ArrowUpRight size={18} className="text-ink-muted" />
            Live Tracker Board
          </h2>
        </div>
        
        <PublicTrackerBoard 
          initialComplaints={complaints}
          currentUserId="overseer-id"
        />
      </section>
    </div>
  )
}
