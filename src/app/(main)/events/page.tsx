import { Metadata } from 'next'
import { EventsList } from '@/features/events/components/events-list'
import { getEventsAction } from '@/features/events/actions'

export const metadata: Metadata = {
  title: 'Campus Events & Hackathons | Campus Super-App',
  description: 'Explore campus events, club workshops, guest lectures, and external hackathons with one-tap calendar sync.',
}

export default async function EventsPage() {
  const initialEvents = await getEventsAction()

  return (
    <>

<div className="w-full py-2">
  <EventsList initialEvents={initialEvents} />
</div>
    </>
  )
}
