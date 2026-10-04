import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getComplaintDomains, getMyComplaints, getTrackerComplaintsWithUpvotes } from '@/features/complaints/queries'
import { RaiseComplaintForm } from '@/features/complaints/components/RaiseComplaintForm'
import { MyComplaintsList } from '@/features/complaints/components/MyComplaintsList'
import { PublicTrackerBoard } from '@/features/complaints/components/PublicTrackerBoard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Grievances & Complaints',
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
    <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 font-bold text-ink">Grievances & Complaints</h1>
          <p className="text-small text-ink-muted mt-1">
            Submit issues to campus authorities with automated SLA countdowns and domain escalation.
          </p>
        </div>

        {isStaffOrAdmin && (
          <Link href="/complaints/assigned">
            <Button variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Authority Queue
            </Button>
          </Link>
        )}
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
    </main>
  )
}
