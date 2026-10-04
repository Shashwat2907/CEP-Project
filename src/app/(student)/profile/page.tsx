'use client'

import * as React from 'react'
import { User, ShieldCheck } from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'
import { ProfileCard } from '@/features/profile/components/profile-card'
import { getProfile } from '@/features/profile/actions'
import { UserProfile } from '@/features/profile/schema'

const DEFAULT_PROFILE: UserProfile = {
  id: 'current-user-uuid',
  collegeEmail: 'shashwat@college.edu',
  collegeId: '23BCE1042',
  fullName: 'Shashwat Choudhary',
  photoUrl: null,
  rolePrimary: 'student',
  branch: 'Computer Science & Engineering',
  year: 2,
  division: 'A',
  batch: 'B1',
  department: null,
  officeHours: null,
  bio: 'Student at College of Engineering studying Computer Science.',
  phone: '+91 98765 43210',
  status: 'active',
  roles: [{ role: 'student', scope: null }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function ProfileContent() {
  const [profile, setProfile] = React.useState<UserProfile>(DEFAULT_PROFILE)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await getProfile()
        if (res.ok) {
          setProfile(res.data)
        }
      } catch {
        // Fallback to default
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <User size={24} className="text-ink" />
          <h1 className="font-display text-h1 font-bold text-ink">My Profile</h1>
        </div>
        <p className="text-small text-ink-muted mt-1">
          Review your verified college identity, credentials, and manage your public bio and contact preferences.
        </p>
      </div>

      <ProfileCard initialProfile={profile} onProfileUpdated={setProfile} />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AppShell
      initialRole="student"
      userName="Shashwat Choudhary"
      identifier="23BCE1042"
      department="Computer Science & Engineering"
      userEmail="shashwat@college.edu"
      activePath="/profile"
    >
      <ProfileContent />
    </AppShell>
  )
}
