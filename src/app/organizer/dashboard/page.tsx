'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2,
  Calendar,
  Users,
  Plus,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  X,
  Search,
  LogOut,
  Mail,
  User,
} from 'lucide-react'
import {
  getOrganizerProfileAction,
  getOrganizerEventsAction,
  createOrganizerEventAction,
} from '@/features/organizer/actions'
import type { OrganizerProfile, EventAttendeeItem } from '@/features/organizer/schema'
import type { EventItem, CreateEventInput } from '@/features/events/schema'

export default function OrganizerDashboardPage() {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null)
  const [events, setEvents] = useState<Array<EventItem & { attendees: EventAttendeeItem[] }>>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<{
    eventTitle: string
    attendees: EventAttendeeItem[]
  } | null>(null)

  // Create form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDateStr, setStartDateStr] = useState('')
  const [startTimeStr, setStartTimeStr] = useState('10:00')
  const [endDateStr, setEndDateStr] = useState('')
  const [endTimeStr, setEndTimeStr] = useState('18:00')
  const [registrationLink, setRegistrationLink] = useState('')
  const [capacity, setCapacity] = useState('')
  const [tagsStr, setTagsStr] = useState('Hackathon, Workshop')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const p = await getOrganizerProfileAction()
      setProfile(p)
      const evs = await getOrganizerEventsAction()
      setEvents(evs)
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setFormError(null)

    if (!startDateStr || !endDateStr) {
      setFormError('Start and end dates are required')
      return
    }

    const startsAt = new Date(`${startDateStr}T${startTimeStr}:00`).toISOString()
    const endsAt = new Date(`${endDateStr}T${endTimeStr}:00`).toISOString()

    if (new Date(endsAt) < new Date(startsAt)) {
      setFormError('End time must be after start time')
      return
    }

    const tags = tagsStr.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)

    setIsSubmitting(true)
    try {
      const res = await createOrganizerEventAction(profile.userId, {
        kind: 'external',
        title: title.trim(),
        description: description.trim(),
        organizerName: `External organizer: ${profile.organization}`,
        organizerType: 'external',
        location: location.trim(),
        startsAt,
        endsAt,
        registrationLink: registrationLink.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        tags,
        allowTeams: true,
        minTeamSize: 2,
        maxTeamSize: 4,
      })

      if (res.ok && res.data) {
        setFeedback(
          profile.trusted
            ? 'Event published successfully!'
            : 'Event submitted! It has been placed in the campus approval queue.'
        )
        setIsCreateOpen(false)
        setTitle('')
        setDescription('')
        setLocation('')
        loadData()
      } else {
        setFormError(res.error || 'Failed to create event')
      }
    } catch {
      setFormError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-[var(--surface-ground)] flex items-center justify-center">
        <p className="text-xs text-[var(--text-secondary)]">Loading organizer dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-ground)] text-[var(--text-primary)]">
      {/* Top Navbar */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-paper)] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[var(--text-primary)]">
                  {profile.organization}
                </h1>
                {profile.trusted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Trusted Partner
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                External Organizer Portal · {profile.contactEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
            >
              <span>View Public Events</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <Link
              href="/organizer/sign-in"
              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Status Notification Banner */}
        {profile.status === 'pending' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Account Pending Campus Administrative Approval</p>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                Your organization profile is currently being reviewed by college administrators.
                Once approved, you will be able to create events and publish them to students.
              </p>
            </div>
          </div>
        )}

        {profile.status === 'suspended' && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Organizer Account Suspended</p>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                Your organizer access has been suspended by campus administration due to policy
                violations or reports. You cannot post or modify events.
              </p>
            </div>
          </div>
        )}

        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Dashboard Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Hosted Events</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Manage your competitions, review attendee rosters, and submit new events
            </p>
          </div>

          <button
            type="button"
            disabled={profile.status !== 'approved'}
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Event</span>
          </button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-paper)] space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">No events hosted yet</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Click &quot;Post New Event&quot; to submit your first hackathon or technical workshop.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] shadow-2xs hover:shadow-xs transition-shadow space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                        {ev.organizerName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          ev.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}
                      >
                        {ev.status === 'approved' ? 'Published' : 'Pending College Review'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)]">{ev.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 max-w-2xl">
                      {ev.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedEventAttendees({
                          eventTitle: ev.title,
                          attendees: ev.attendees,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:bg-[var(--surface-paper)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>{ev.rsvpCount || ev.attendees.length} RSVPs</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(ev.startsAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{ev.location}</span>
                  </div>
                  {ev.registrationLink && (
                    <a
                      href={ev.registrationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 hover:underline flex items-center gap-1"
                    >
                      <span>External Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Attendees Modal */}
      {selectedEventAttendees && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[var(--surface-paper)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  RSVP Attendee Roster
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedEventAttendees.eventTitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedEventAttendees(null)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {selectedEventAttendees.attendees.length === 0 ? (
                <p className="text-center py-8 text-xs text-[var(--text-secondary)]">
                  No attendees have RSVP&apos;d yet.
                </p>
              ) : (
                selectedEventAttendees.attendees.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">
                        {att.userName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{att.userName}</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">{att.userEmail}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      Confirmed
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[var(--surface-paper)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Post External Event
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Published under: &quot;External organizer: {profile.organization}&quot;
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="overflow-y-auto flex-1 space-y-3.5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600">
                  {formError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                {profile.trusted ? (
                  <p>
                    <span className="font-bold">Trusted Organizer:</span> Your event will be
                    published immediately to the campus directory and calendar.
                  </p>
                ) : (
                  <p>
                    <span className="font-bold">Review Queue:</span> New events undergo
                    administrative review before appearing on the college-wide schedule.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Hackathon 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Tech Center / Online Zoom"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Starts At *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                    <input
                      type="time"
                      required
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="w-20 text-xs px-2 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Ends At *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                    <input
                      type="time"
                      required
                      value={endTimeStr}
                      onChange={(e) => setEndTimeStr(e.target.value)}
                      className="w-20 text-xs px-2 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Outline topics, eligibility, prizes, and schedule..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Registration Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={registrationLink}
                    onChange={(e) => setRegistrationLink(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
                >
                  {isSubmitting ? 'Posting...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
