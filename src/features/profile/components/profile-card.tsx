'use client'

import * as React from 'react'
import {
  User,
  Mail,
  CreditCard,
  Lock,
  Building,
  GraduationCap,
  Clock,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  Camera,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { UserProfile } from '../schema'
import { updateProfile } from '../actions'
import { cn } from '@/lib/utils'

export function ProfileCard({
  initialProfile,
  onProfileUpdated,
}: {
  initialProfile: UserProfile
  onProfileUpdated?: (updated: UserProfile) => void
}) {
  const [profile, setProfile] = React.useState<UserProfile>(initialProfile)
  const [bio, setBio] = React.useState(profile.bio ?? '')
  const [officeHours, setOfficeHours] = React.useState(profile.officeHours ?? '')
  const [phone, setPhone] = React.useState(profile.phone ?? '')
  const [photoUrl, setPhotoUrl] = React.useState(profile.photoUrl ?? '')
  const [department, setDepartment] = React.useState(profile.department ?? '')
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const isTeacher = profile.rolePrimary === 'teacher'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    setErrorMessage(null)

    try {
      const res = await updateProfile({
        bio: bio.trim() || null,
        office_hours: officeHours.trim() || null,
        phone: phone.trim() || null,
        photo_url: photoUrl.trim() || null,
        department: department.trim() || null,
      })

      if (res.ok) {
        setSaveSuccess(true)
        const updated: UserProfile = {
          ...profile,
          bio: bio.trim() || null,
          officeHours: officeHours.trim() || null,
          phone: phone.trim() || null,
          photoUrl: photoUrl.trim() || null,
          department: department.trim() || null,
        }
        setProfile(updated)
        onProfileUpdated?.(updated)
        setTimeout(() => setSaveSuccess(false), 4000)
      } else {
        setErrorMessage(res.error.message)
      }
    } catch {
      setErrorMessage('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="p-6 rounded-lg border border-border bg-surface shadow-xs space-y-6">
      {/* Top Profile Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-border pb-6">
        <div className="relative group w-20 h-20 rounded-full bg-surface-sunken border-2 border-border overflow-hidden shrink-0 flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
          ) : (
            <User size={36} className="text-ink-muted" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-h2 font-bold text-ink">{profile.fullName}</h2>
            <span className="font-mono text-meta font-bold uppercase px-2 py-0.5 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/20">
              {profile.rolePrimary}
            </span>
          </div>

          <p className="text-small text-ink-muted flex items-center gap-2">
            <Mail size={14} />
            <span>{profile.collegeEmail}</span>
          </p>
        </div>
      </div>

      {/* Roster-Locked Credentials Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-meta font-bold text-ink-muted tracking-wider uppercase flex items-center gap-1.5">
            <Lock size={13} className="text-ink-muted" />
            Official College Credentials (Roster Locked)
          </span>
          <span className="text-[11px] font-mono text-ink-muted bg-surface-sunken px-2 py-0.5 rounded-sm border border-border">
            Verified by College Admin
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-md bg-surface-sunken/60 border border-border">
            <span className="text-meta text-ink-muted block font-mono">COLLEGE / ENROLLMENT ID</span>
            <span className="font-mono text-small font-bold text-ink mt-0.5 block">{profile.collegeId}</span>
          </div>

          <div className="p-3 rounded-md bg-surface-sunken/60 border border-border">
            <span className="text-meta text-ink-muted block font-mono">PRIMARY ROLE</span>
            <span className="font-mono text-small font-bold text-ink uppercase mt-0.5 block">{profile.rolePrimary}</span>
          </div>

          {profile.branch && (
            <div className="p-3 rounded-md bg-surface-sunken/60 border border-border">
              <span className="text-meta text-ink-muted block font-mono">BRANCH & YEAR</span>
              <span className="text-small font-semibold text-ink mt-0.5 block">
                {profile.branch} {profile.year ? `(Year ${profile.year})` : ''}
              </span>
            </div>
          )}

          {profile.division && (
            <div className="p-3 rounded-md bg-surface-sunken/60 border border-border">
              <span className="text-meta text-ink-muted block font-mono">DIVISION & BATCH</span>
              <span className="font-mono text-small font-bold text-ink mt-0.5 block">
                Div {profile.division} • Batch {profile.batch ?? '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Editable Fields Section */}
      <div className="space-y-4 pt-3 border-t border-border">
        <span className="font-mono text-meta font-bold text-ink tracking-wider uppercase block">
          Self-Managed Information
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-small font-medium text-ink block mb-1">
              Profile Photo URL
            </label>
            <Input
              placeholder="https://example.com/photo.jpg or data:image/..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="text-small font-mono"
            />
          </div>

          <div>
            <label className="text-small font-medium text-ink block mb-1">
              Contact Phone (Optional)
            </label>
            <Input
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-small font-mono"
            />
          </div>
        </div>

        {/* Teacher-Specific Fields (PLAN.md §5.4 / TEAM_TASKS) */}
        {isTeacher && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-md bg-highlight/5 border border-highlight/30">
            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Academic Department
              </label>
              <Input
                placeholder="e.g. Department of Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-small"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Office Hours & Availability Text
              </label>
              <Input
                placeholder="e.g. Mon, Wed 2:00 PM – 4:00 PM (Cabin CS-204)"
                value={officeHours}
                onChange={(e) => setOfficeHours(e.target.value)}
                className="text-small"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-small font-medium text-ink block mb-1">
            Bio / About Me
          </label>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Tell students and colleagues a bit about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink text-small focus:outline-none focus:border-ink resize-none"
          />
          <span className="text-[11px] font-mono text-ink-muted text-right block mt-1">
            {bio.length} / 500 characters
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-md bg-in-campus/10 border border-in-campus/20 text-in-campus text-small flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-small flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-end pt-2 border-t border-border">
        <Button type="submit" variant="primary" size="sm" disabled={isSaving} className="flex items-center gap-2">
          <Save size={15} />
          <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
        </Button>
      </div>
    </form>
  )
}
