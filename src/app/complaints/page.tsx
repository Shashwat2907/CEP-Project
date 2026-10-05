import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getComplaintDomains, getMyComplaints, getTrackerComplaintsWithUpvotes } from '@/features/complaints/queries'
import { RaiseComplaintForm } from '@/features/complaints/components/RaiseComplaintForm'
import { MyComplaintsList } from '@/features/complaints/components/MyComplaintsList'
import { PublicTrackerBoard } from '@/features/complaints/components/PublicTrackerBoard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { AppShell } from '@/shared/ui/app-shell'
import Link from 'next/link'
import { ClipboardList, ArrowLeft, AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Grievances & Complaints | Campus Portal',
  description: 'Raise, track, and manage grievances with SLA-governed domain escalation.',
}

export default async function ComplaintsPage() {
  await requireAuth()
  const profile = await getCurrentProfile()

  const [domains, myComplaints, trackerComplaints] = await Promise.all([
    getComplaintDomains(),
    getMyComplaints(),
    getTrackerComplaintsWithUpvotes(),
  ])

  const isStaffOrAdmin = profile?.role_primary === 'teacher' || profile?.role_primary === 'admin'

  return (
    <AppShell
      initialRole={profile?.role_primary ?? 'student'}
      userName={profile?.full_name ?? 'Aarav Mehta'}
      identifier={profile?.college_id ?? '23BCE1001'}
      department={profile?.branch ? `${profile.branch} (Year ${profile.year ?? 2})` : 'Computer Science'}
      userEmail={profile?.college_email ?? 'student@campus.edu'}
      activePath="/complaints"
    >
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
              <AlertCircle size={13} className="text-warning" />
              Grievances & Complaints
            </span>
          </div>

          {isStaffOrAdmin && (
            <Link href="/complaints/assigned">
              <Button variant="outline" className="gap-2 text-xs h-8">
                <ClipboardList className="h-3.5 w-3.5" /> Authority Queue
              </Button>
            </Link>
          )}
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-h1 font-bold text-ink">Grievances & Complaints</h1>
            <p className="text-small text-ink-muted mt-1">
              Submit issues to campus authorities with automated SLA countdowns and domain escalation.
            </p>
          </div>
        </div>

        <Tabs defaultValue="my-complaints" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="my-complaints">
              My Complaints ({myComplaints.length})
            </TabsTrigger>
            <TabsTrigger value="tracker">
              Public Tracker ({trackerComplaints.length})
            </TabsTrigger>
            <TabsTrigger value="raise">
              Raise a Grievance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-complaints">
            <MyComplaintsList complaints={myComplaints} />
          </TabsContent>

          <TabsContent value="tracker">
            <PublicTrackerBoard
              initialComplaints={trackerComplaints}
              domains={domains}
            />
          </TabsContent>

          <TabsContent value="raise">
            <RaiseComplaintForm domains={domains} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
