'use client'

import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { TeacherDirectory } from './TeacherDirectory'
import { StudentSessionsList } from './StudentSessionsList'
import { TeacherRequestQueue } from './TeacherRequestQueue'
import type { TeacherSummary, SessionRequest } from '../schema'
import { Users, CalendarCheck, Inbox } from 'lucide-react'

interface MeetDashboardProps {
  isTeacher: boolean
  teachers: TeacherSummary[]
  mySessions: SessionRequest[]
  teacherRequests: SessionRequest[]
}

export function MeetDashboard({
  isTeacher,
  teachers,
  mySessions,
  teacherRequests,
}: MeetDashboardProps) {
  const pendingRequestsCount = teacherRequests.filter((r) => r.status === 'pending').length
  const activeAppointmentsCount = mySessions.filter((s) =>
    ['pending', 'accepted', 'offline_selected', 'online_selected'].includes(s.status)
  ).length

  const [activeTab, setActiveTab] = React.useState<string>(
    isTeacher && pendingRequestsCount > 0 ? 'requests' : 'directory'
  )

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        {isTeacher && (
          <Button
            size="sm"
            variant={activeTab === 'requests' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('requests')}
            className="gap-2 shrink-0"
          >
            <Inbox className="h-4 w-4" />
            <span>Appointment Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="bg-warning text-surface px-1.5 py-0.2 rounded-full text-[11px] font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </Button>
        )}

        <Button
          size="sm"
          variant={activeTab === 'directory' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('directory')}
          className="gap-2 shrink-0"
        >
          <Users className="h-4 w-4" />
          <span>Faculty Directory & Open Slots</span>
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'appointments' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('appointments')}
          className="gap-2 shrink-0"
        >
          <CalendarCheck className="h-4 w-4" />
          <span>My Appointments</span>
          {activeAppointmentsCount > 0 && (
            <span className="bg-accent text-surface px-1.5 py-0.2 rounded-full text-[11px] font-bold">
              {activeAppointmentsCount}
            </span>
          )}
        </Button>
      </div>

      {/* Tab Panels */}
      {isTeacher && activeTab === 'requests' && (
        <TeacherRequestQueue initialRequests={teacherRequests} />
      )}

      {activeTab === 'directory' && (
        <TeacherDirectory teachers={teachers} />
      )}

      {activeTab === 'appointments' && (
        <StudentSessionsList initialSessions={mySessions} />
      )}
    </div>
  )
}
