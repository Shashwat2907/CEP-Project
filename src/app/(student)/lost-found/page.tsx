import { Metadata } from 'next'
import { AppShell } from '@/shared/ui/app-shell'
import { LostFoundDashboard } from '@/features/lostfound/components/lost-found-dashboard'
import { getLostFoundItemsAction } from '@/features/lostfound/actions'

export const metadata: Metadata = {
  title: 'Lost & Found | Campus Super-App',
  description: 'Campus Lost and Found portal with verified drop-off points, question-based claims, and digital ID pickup.',
}

export default async function LostFoundPage() {
  const initialItems = await getLostFoundItemsAction()

  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
      activePath="/lost-found"
    >
      <div className="max-w-5xl mx-auto py-2">
        <LostFoundDashboard initialItems={initialItems} currentCollegeId="23BCE1042" />
      </div>
    </AppShell>
  )
}
