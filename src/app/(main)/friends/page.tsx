import { Metadata } from 'next'
import { FriendsManager } from '@/features/friends/components/friends-manager'

export const metadata: Metadata = {
  title: 'Friends & Network | Campus Super-App',
  description: 'Connect with peers, view shared communities, and see verified live presence on campus.',
}

export default async function FriendsPage() {
  return (
    <>

<div className="w-full py-2">
  <FriendsManager />
</div>
    </>
  )
}
