import { Metadata } from 'next'
import { AppShell } from '@/shared/ui/app-shell'
import { CalendarView } from '@/features/calendar/components/calendar-view'
import { getCalendarEntriesAction } from '@/features/calendar/actions'

export const metadata: Metadata = {
  title: 'Calendar | Campus Super-App',
  description: 'Unified campus calendar across classes, teacher sessions, events, and personal items.',
}

export default async function CalendarPage() {
  const initialEntries = await getCalendarEntriesAction()

  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
      activePath="/calendar"
    >
      <div className="w-full py-2">
        <CalendarView initialEntries={initialEntries} initialViewMode="day" />
      </div>
    </AppShell>
  )
}
