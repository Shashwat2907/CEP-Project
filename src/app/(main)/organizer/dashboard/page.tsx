'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
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
    <div className="min-h-screen bg-bg text-ink">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface sticky top-0 z-30">
        <div className="w-full max-w-[1200px] px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-surface-sunken text-ink border border-border flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-small font-bold text-ink">
                  {profile.organization}
                </h1>
                {profile.trusted && (
                  <span className="px-2 py-0.5 rounded-sm text-meta font-mono bg-surface-sunken text-ink border border-border flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-highlight" />
                    Trusted Partner
                  </span>
                )}
              </div>
              <p className="text-meta text-ink-muted font-mono">
                External Organizer Portal · {profile.contactEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="text-small text-ink-muted hover:text-ink flex items-center gap-1"
            >
              <span>View Public Events</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <Link
              href="/organizer/sign-in"
              className="px-3 py-1.5 rounded-sm border border-border text-small text-ink hover:bg-surface-sunken flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="w-full max-w-[1200px] px-4 sm:px-6 py-6 space-y-6">
        {/* Status Notification Banner */}
        {profile.status === 'pending' && (
          <div className="p-4 rounded-sm bg-warning/10 border border-warning/30 flex items-start gap-3 text-small text-ink">
            <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
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
          <div className="p-4 rounded-sm bg-danger/10 border border-danger/30 flex items-start gap-3 text-small text-danger">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
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
          <div className="p-3.5 rounded-sm bg-surface-sunken border border-border text-small text-ink font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-in-campus" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Dashboard Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-h2 font-bold text-ink">Hosted Events</h2>
            <p className="text-small text-ink-muted mt-0.5">
              Manage your competitions, review attendee rosters, and submit new events.
            </p>
          </div>

          <button
            type="button"
            disabled={profile.status !== 'approved'}
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 disabled:opacity-40 transition-opacity flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Event</span>
          </button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="p-12 text-center rounded-md border border-dashed border-border bg-surface space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-ink-muted opacity-40" />
            <h3 className="font-display text-small font-bold text-ink">No events hosted yet</h3>
            <p className="text-small text-ink-muted max-w-sm mx-auto">
              Click &quot;Post New Event&quot; to submit your first hackathon or technical workshop.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-5 rounded-md border border-border bg-surface space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 text-meta font-mono font-medium rounded-sm bg-surface-sunken text-ink border border-border">
                        {ev.organizerName}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-meta font-mono font-medium rounded-sm border',
                          ev.status === 'approved'
                            ? 'bg-success/10 text-success border-success/30'
                            : 'bg-warning/10 text-warning border-warning/30'
                        )}
                      >
                        {ev.status === 'approved' ? 'Published' : 'Pending College Review'}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-ink">{ev.title}</h3>
                    <p className="text-small text-ink-muted mt-1 line-clamp-2 max-w-2xl">
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
                      className="px-3 py-1.5 rounded-sm border border-border bg-surface hover:bg-surface-sunken text-small font-medium text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-ink-muted" />
                      <span>{ev.rsvpCount || ev.attendees.length} RSVPs</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-small text-ink-muted pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 font-mono text-meta">
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
                      className="text-ink hover:underline flex items-center gap-1"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface rounded-md border border-border shadow-[var(--shadow-float)] p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-display text-small font-bold text-ink">
                  RSVP Attendee Roster
                </h3>
                <p className="text-meta text-ink-muted">
                  {selectedEventAttendees.eventTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventAttendees(null)}
                className="p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-sunken cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {selectedEventAttendees.attendees.length === 0 ? (
                <p className="text-center py-8 text-small text-ink-muted">
                  No attendees have RSVP&apos;d yet.
                </p>
              ) : (
                selectedEventAttendees.attendees.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-sm bg-surface-sunken border border-border flex items-center justify-between text-small"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-sm bg-surface border border-border text-ink flex items-center justify-center font-display font-bold text-xs">
                        {att.userName[0]}
                      </div>
                      <div>
                        <p className="font-display font-bold text-ink">{att.userName}</p>
                        <p className="text-meta font-mono text-ink-muted">{att.userEmail}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-sm text-meta font-mono font-medium bg-success/10 text-success border border-success/30">
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface rounded-md border border-border shadow-[var(--shadow-float)] p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  Post External Event
                </h3>
                <p className="text-meta text-ink-muted">
                  Published under: &quot;External organizer: {profile.organization}&quot;
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-sunken cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="overflow-y-auto flex-1 space-y-3.5">
              {formError && (
                <div className="p-3 rounded-sm bg-danger/10 border border-danger/30 text-small text-danger">
                  {formError}
                </div>
              )}

              <div className="p-3 rounded-sm bg-surface-sunken border border-border text-small text-ink">
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
                <label className="block text-small font-semibold text-ink mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Hackathon 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
              </div>

              <div>
                <label className="block text-small font-semibold text-ink mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Tech Center / Online Zoom"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-small font-semibold text-ink">
                    Starts At *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      className="flex-1 text-small px-2.5 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink"
                    />
                    <input
                      type="time"
                      required
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="w-24 text-small px-2 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-small font-semibold text-ink">
                    Ends At *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      className="flex-1 text-small px-2.5 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink"
                    />
                    <input
                      type="time"
                      required
                      value={endTimeStr}
                      onChange={(e) => setEndTimeStr(e.target.value)}
                      className="w-24 text-small px-2 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-small font-semibold text-ink mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Outline topics, eligibility, prizes, and schedule..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-small font-semibold text-ink mb-1">
                    Registration Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={registrationLink}
                    onChange={(e) => setRegistrationLink(e.target.value)}
                    className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink"
                  />
                </div>

                <div>
                  <label className="block text-small font-semibold text-ink mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-sm border border-border bg-surface text-small font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
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
