import { Metadata } from 'next'
import { AppShell } from '@/shared/ui/app-shell'
import { FriendsManager } from '@/features/friends/components/friends-manager'

export const metadata: Metadata = {
  title: 'Friends & Network | Campus Super-App',
  description: 'Connect with peers, view shared communities, and see verified live presence on campus.',
}

export default async function FriendsPage() {
  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
      activePath="/friends"
    >
      <div className="max-w-4xl mx-auto py-2">
        <FriendsManager />
      </div>
    </AppShell>
  )
}
