import { requireRole } from '@/shared/auth/guards'
import { getAssignedComplaints } from '@/features/complaints/queries'
import { AuthorityQueue } from '@/features/complaints/components/AuthorityQueue'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Assigned Complaints Queue',
  description: 'Manage and resolve grievances assigned to your authority domain.',
}

export default async function AssignedComplaintsPage() {
  await requireRole(['teacher', 'admin'])
  const assigned = await getAssignedComplaints()

  return (
    <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/complaints"
          className="inline-flex items-center gap-1.5 text-small text-ink-muted hover:text-ink transition-colors font-medium mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Complaints
        </Link>
        <h1 className="font-display text-h2 font-bold text-ink">Assigned Grievances Queue</h1>
        <p className="text-small text-ink-muted mt-1">
          Review, investigate, and mark resolution on grievances assigned to your role or domain.
        </p>
      </div>

      <AuthorityQueue complaints={assigned} />
    </main>
  )
}
