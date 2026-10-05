'use client'

import React, { useState } from 'react'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Send,
  Plus,
  AlertCircle,
  Flag,
} from 'lucide-react'
import type { EventItem, EventTeamItem, EventMessageItem } from '../schema'
import {
  rsvpEventAction,
  cancelRsvpAction,
  createEventTeamAction,
  postEventMessageAction,
  approveEventAction,
  rejectEventAction,
} from '../actions'
import { reportEventAction } from '@/features/organizer/actions'

interface EventDetailModalProps {
  event: EventItem | null
  teams?: EventTeamItem[]
  messages?: EventMessageItem[]
  isOpen: boolean
  onClose: () => void
  onEventUpdated: () => void
  isAdmin?: boolean
}

export function EventDetailModal({
  event,
  teams = [],
  messages = [],
  isOpen,
  onClose,
  onEventUpdated,
  isAdmin = false,
}: EventDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'teams' | 'discussion'>('details')
  const [isProcessing, setIsProcessing] = useState(false)
  const [syncToCalendar, setSyncToCalendar] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Team creation state
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [desiredSkillsStr, setDesiredSkillsStr] = useState('')
  const [teamNotes, setTeamNotes] = useState('')

  // Message posting state
  const [messageContent, setMessageContent] = useState('')

  // Report event state
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState('Misleading or inaccurate information')
  const [reportDetails, setReportDetails] = useState('')

  const handleReportEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setIsProcessing(true)
    try {
      const res = await reportEventAction({
        eventId: event.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      })
      if (res.ok) {
        setShowReportForm(false)
        setReportDetails('')
        setFeedback(res.message || 'Report submitted to campus administrators.')
      } else {
        setFeedback(res.error || 'Failed to submit report')
      }
    } catch {
      setFeedback('Error submitting report')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen || !event) return null

  const isAttending = event.userRsvpStatus === 'attending'
  const startDate = new Date(event.startsAt)
  const endDate = new Date(event.endsAt)

  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedStartTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  const formattedEndTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const handleRsvp = async () => {
    setIsProcessing(true)
    setFeedback(null)
    try {
      const res = await rsvpEventAction({
        eventId: event.id,
        status: 'attending',
        addToCalendar: syncToCalendar,
      })
      if (res.ok) {
        setFeedback(
          syncToCalendar
            ? 'RSVP confirmed! Event has been added to your personal schedule.'
            : 'RSVP confirmed!'
        )
        onEventUpdated()
      } else {
        setFeedback(res.error || 'Failed to submit RSVP')
      }
    } catch {
      setFeedback('An error occurred during RSVP')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelRsvp = async () => {
    setIsProcessing(true)
    setFeedback(null)
    try {
      const res = await cancelRsvpAction(event.id)
      if (res.ok) {
        setFeedback('RSVP cancelled and removed from your schedule.')
        onEventUpdated()
      } else {
        setFeedback(res.error || 'Failed to cancel RSVP')
      }
    } catch {
      setFeedback('An error occurred while cancelling RSVP')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    setIsProcessing(true)
    const skills = desiredSkillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const res = await createEventTeamAction({
        eventId: event.id,
        name: teamName.trim(),
        lookingForMembers: true,
        desiredSkills: skills,
        notes: teamNotes.trim(),
      })
      if (res.ok) {
        setTeamName('')
        setDesiredSkillsStr('')
        setTeamNotes('')
        setShowTeamForm(false)
        setFeedback('Your team has been formed and posted for member matching!')
        onEventUpdated()
      } else {
        setFeedback(res.error || 'Failed to create team')
      }
    } catch {
      setFeedback('Error creating team')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim()) return

    setIsProcessing(true)
    try {
      const res = await postEventMessageAction({
        eventId: event.id,
        content: messageContent.trim(),
      })
      if (res.ok) {
        setMessageContent('')
        onEventUpdated()
      }
    } catch {
      // Non-fatal
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await approveEventAction(event.id)
      setFeedback('Event approved and made visible college-wide!')
      onEventUpdated()
    } catch {
      setFeedback('Failed to approve event')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      await rejectEventAction(event.id)
      setFeedback('Event rejected.')
      onEventUpdated()
    } catch {
      setFeedback('Failed to reject event')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[var(--surface-paper)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Banner Header */}
        <div className="relative h-52 shrink-0 bg-[var(--surface-sunken)]">
          {event.bannerUrl ? (
            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-blue-700 via-indigo-700 to-purple-800 flex items-center justify-center">
              <Sparkles className="w-16 h-16 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-xs z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header text on banner */}
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full backdrop-blur-md ${
                  event.kind === 'college'
                    ? 'bg-blue-600/90 text-white'
                    : 'bg-purple-600/90 text-white'
                }`}
              >
                {event.kind === 'college' ? 'College Event' : 'External Event'}
              </span>

              {event.status === 'pending' && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-slate-900">
                  Pending Approval
                </span>
              )}

              {event.allowTeams && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-black/60 text-white flex items-center gap-1">
                  <Users className="w-3 h-3 text-[var(--highlight)]" />
                  Teams ({event.minTeamSize}-{event.maxTeamSize})
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2">
              {event.title}
            </h2>
            <p className="text-xs text-white/80 mt-1">
              Organized by <span className="font-semibold text-white">{event.organizerName}</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface-ground)] px-4 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Overview & RSVP
          </button>

          {event.allowTeams && (
            <button
              onClick={() => setActiveTab('teams')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'teams'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Teams ({teams.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('discussion')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'discussion'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Discussion ({messages.length})</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {feedback && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {formattedDate}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {formattedStartTime} – {formattedEndTime}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Location</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                      {event.location}
                    </p>
                  </div>
                </div>
              </div>

              {/* External Organizer Notice */}
              {event.kind === 'external' && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>External organizer: {event.organizerName}</span>
                  </div>
                  {event.registrationLink && (
                    <a
                      href={event.registrationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-400 hover:underline"
                    >
                      Visit Site <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">About Event</h3>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line bg-[var(--surface-sunken)]/40 p-4 rounded-xl border border-[var(--border-subtle)]">
                  {event.description}
                </div>
              </div>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs rounded-lg bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* RSVP Action Box */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      Your Attendance
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {isAttending
                        ? 'You are confirmed for this event.'
                        : 'Let organizers know you are attending.'}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      isAttending
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {isAttending ? 'Attending' : 'Not Registered'}
                  </span>
                </div>

                {!isAttending && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)] select-none pt-1">
                    <input
                      type="checkbox"
                      checked={syncToCalendar}
                      onChange={(e) => setSyncToCalendar(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span>Automatically add to my campus timetable & personal calendar</span>
                  </label>
                )}

                <div className="pt-2 flex items-center gap-3">
                  {isAttending ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleCancelRsvp}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors"
                    >
                      Cancel RSVP
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleRsvp}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--primary)] text-white hover:opacity-95 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>RSVP Attending</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Report Event Link */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowReportForm(true)}
                  className="text-xs text-[var(--text-secondary)] hover:text-rose-500 flex items-center gap-1.5 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report this event</span>
                </button>
              </div>

              {/* Report Event Modal Form */}
              {showReportForm && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report Event to Campus Administration</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowReportForm(false)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handleReportEvent} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                        Reason for Report *
                      </label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden"
                      >
                        <option value="Misleading or inaccurate information">Misleading or inaccurate information</option>
                        <option value="Spam or unauthorized commercial advertising">Spam or unauthorized commercial advertising</option>
                        <option value="Inappropriate or offensive content">Inappropriate or offensive content</option>
                        <option value="Safety or campus policy violation">Safety or campus policy violation</option>
                        <option value="Impersonating an official club/department">Impersonating an official club/department</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                        Additional Context (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Provide any relevant details to assist campus administration review..."
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReportForm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Submit Report
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Admin Moderation controls */}
              {isAdmin && event.status === 'pending' && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Administrator Review Queue
                  </h4>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    This event is currently pending approval for college-wide calendar and directory visibility.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleApprove}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Approve Event
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleReject}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Reject Event
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEAMS */}
          {activeTab === 'teams' && event.allowTeams && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Hackathon & Project Teams
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Connect with other students forming teams (Allowed size: {event.minTeamSize} -{' '}
                    {event.maxTeamSize} members).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTeamForm(!showTeamForm)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showTeamForm ? 'Close Form' : 'Register Team'}</span>
                </button>
              </div>

              {/* Form New Team Modal / Dropdown */}
              {showTeamForm && (
                <form
                  onSubmit={handleCreateTeam}
                  className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] space-y-3"
                >
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Register a New Team
                  </h4>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Team Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NeuralPulse"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Desired Skills / Roles (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Next.js, PyTorch, Hardware, UI Design"
                      value={desiredSkillsStr}
                      onChange={(e) => setDesiredSkillsStr(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Pitch / What you plan to build
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Short summary of your project vision and who you need..."
                      value={teamNotes}
                      onChange={(e) => setTeamNotes(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTeamForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-paper)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90"
                    >
                      Post Team
                    </button>
                  </div>
                </form>
              )}

              {/* Team list */}
              {teams.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No teams registered yet.</p>
                  <p className="text-[11px] text-[var(--text-secondary)]/80 mt-1">
                    Be the first to create a team and invite collaborators!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] hover:border-[var(--primary)]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">{t.name}</h4>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            Leader: {t.leaderName || 'Student'}
                          </p>
                        </div>
                        {t.lookingForMembers && (
                          <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            Looking for members
                          </span>
                        )}
                      </div>

                      {t.notes && (
                        <p className="text-xs text-[var(--text-secondary)] mt-2 italic leading-relaxed">
                          "{t.notes}"
                        </p>
                      )}

                      {t.desiredSkills && t.desiredSkills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                            Seeking:
                          </span>
                          {t.desiredSkills.map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[11px] rounded bg-[var(--surface-sunken)] font-mono text-[var(--text-primary)] border border-[var(--border-subtle)]"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISCUSSION / CHAT */}
          {activeTab === 'discussion' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Event Q&A & Community Discussion
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Ask organizers questions or discuss topics with fellow participants.
                </p>
              </div>

              {/* Messages feed */}
              <div className="space-y-3 min-h-[140px] max-h-[300px] overflow-y-auto p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p>No questions or messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[var(--text-primary)]">{m.authorName}</span>
                        <span className="text-[var(--text-secondary)]">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{m.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Post form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question or share a note..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !messageContent.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
