import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getComplaintById } from '@/features/complaints/queries'
import { ComplaintDetail } from '@/features/complaints/components/ComplaintDetail'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface ComplaintPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ComplaintPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Complaint #${id.slice(0, 8)}`,
  }
}

export default async function ComplaintDetailPage({ params }: ComplaintPageProps) {
  const { user } = await requireAuth()
  const profile = await getCurrentProfile()
  const { id } = await params

  const complaint = await getComplaintById(id)
  if (!complaint) {
    notFound()
  }

  return (
    <main className="p-4 sm:p-6 max-w-4xl mx-auto">
      <ComplaintDetail
        complaint={complaint}
        currentUserId={user.id}
        currentUserRole={profile?.role_primary ?? 'student'}
      />
    </main>
  )
}
