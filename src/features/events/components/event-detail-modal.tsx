'use client'

import * as React from 'react'
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
import { Button } from '@/shared/ui/button'
import { cn } from '@/lib/utils'

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
  const [activeTab, setActiveTab] = React.useState<'details' | 'teams' | 'discussion'>('details')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [syncToCalendar, setSyncToCalendar] = React.useState(true)
  const [feedback, setFeedback] = React.useState<string | null>(null)

  // Team creation state
  const [showTeamForm, setShowTeamForm] = React.useState(false)
  const [teamName, setTeamName] = React.useState('')
  const [desiredSkillsStr, setDesiredSkillsStr] = React.useState('')
  const [teamNotes, setTeamNotes] = React.useState('')

  // Message posting state
  const [messageContent, setMessageContent] = React.useState('')

  // Report event state
  const [showReportForm, setShowReportForm] = React.useState(false)
  const [reportReason, setReportReason] = React.useState('Misleading or inaccurate information')
  const [reportDetails, setReportDetails] = React.useState('')

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
        setFeedback('RSVP confirmed! Event synced with your calendar.')
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

  const handleReportEvent = async (e: React.FormEvent) => {
    e.preventDefault()
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-surface rounded-md border border-border shadow-[var(--shadow-float)] overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Banner Header: Clean surface, NO gradient decoration per DESIGN.MD §2 & §12 */}
        <div className="relative h-44 shrink-0 bg-surface-sunken border-b border-border">
          {event.bannerUrl ? (
            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-surface-sunken text-ink-muted">
              <Calendar className="w-10 h-10 opacity-30 mb-1" />
              <span className="text-[11px] font-mono opacity-60">Campus event</span>
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-sm bg-surface/90 border border-border text-ink hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header text overlay banner */}
          <div className="absolute bottom-3 left-4 right-4 bg-surface/95 backdrop-blur-xs p-3 rounded-sm border border-border flex flex-col gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm border',
                  event.kind === 'college'
                    ? 'bg-ink text-on-ink border-ink'
                    : 'bg-surface text-ink border-border'
                )}
              >
                {event.kind === 'college' ? 'College event' : 'External event'}
              </span>

              {event.status === 'pending' && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-warning text-white">
                  Pending approval
                </span>
              )}

              {event.allowTeams && (
                <span className="px-2 py-0.5 text-[10px] font-mono text-ink rounded-sm bg-surface border border-border flex items-center gap-1">
                  <Users className="w-3 h-3 text-highlight" />
                  Teams ({event.minTeamSize}–{event.maxTeamSize})
                </span>
              )}
            </div>

            <h2 className="font-display text-lg sm:text-xl font-bold text-ink leading-tight line-clamp-1">
              {event.title}
            </h2>
            <p className="text-meta font-mono text-ink-muted truncate">
              Organized by <strong className="text-ink">{event.organizerName}</strong>
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Overview & RSVP, Teams, Discussion) */}
        <div className="flex border-b border-border bg-surface-sunken/40 px-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={cn(
              'py-2.5 px-3 text-small font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'details'
                ? 'border-highlight text-ink font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            )}
          >
            Overview & RSVP
          </button>

          {event.allowTeams && (
            <button
              type="button"
              onClick={() => setActiveTab('teams')}
              className={cn(
                'py-2.5 px-3 text-small font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer',
                activeTab === 'teams'
                  ? 'border-highlight text-ink font-bold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Teams ({teams.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('discussion')}
            className={cn(
              'py-2.5 px-3 text-small font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer',
              activeTab === 'discussion'
                ? 'border-highlight text-ink font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Discussion ({messages.length})</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {feedback && (
            <div className="p-3 rounded-sm bg-surface-sunken text-ink text-small border border-border flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-ink-muted" />
              <span>{feedback}</span>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-sm bg-surface-sunken border border-border flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-small font-semibold text-ink font-display">
                      {formattedDate}
                    </p>
                    <p className="text-meta font-mono text-ink-muted mt-0.5">
                      {formattedStartTime} – {formattedEndTime}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-sm bg-surface-sunken border border-border flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-small font-semibold text-ink font-display">Location</p>
                    <p className="text-meta font-mono text-ink-muted mt-0.5 line-clamp-2">
                      {event.location}
                    </p>
                  </div>
                </div>
              </div>

              {/* External Organizer Notice */}
              {event.kind === 'external' && (
                <div className="p-3 rounded-sm bg-surface-sunken border border-border text-meta font-mono text-ink flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-ink-muted" />
                    <span>External organizer: {event.organizerName}</span>
                  </div>
                  {event.registrationLink && (
                    <a
                      href={event.registrationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-ink underline"
                    >
                      Visit Site <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="font-display text-small font-bold text-ink">About Event</h3>
                <div className="text-small text-ink leading-relaxed whitespace-pre-line bg-surface p-3.5 rounded-sm border border-border">
                  {event.description}
                </div>
              </div>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-meta font-mono text-ink-muted block">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {event.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[11px] font-mono rounded-sm bg-surface-sunken text-ink-muted border border-border"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* RSVP Action Box */}
              <div className="p-4 rounded-md border border-border bg-surface-sunken/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-small font-bold text-ink">
                      Your Attendance
                    </h4>
                    <p className="text-meta text-ink-muted mt-0.5">
                      {isAttending
                        ? 'You are confirmed for this event.'
                        : 'Let organizers know you are attending.'}
                    </p>
                  </div>

                  <span
                    className={cn(
                      'px-2.5 py-0.5 text-meta font-mono font-medium rounded-sm border',
                      isAttending
                        ? 'bg-success/15 text-success border-success/30'
                        : 'bg-surface text-ink-muted border-border'
                    )}
                  >
                    {isAttending ? 'Attending' : 'Not Registered'}
                  </span>
                </div>

                {!isAttending && (
                  <label className="flex items-center gap-2 cursor-pointer text-meta text-ink select-none pt-1">
                    <input
                      type="checkbox"
                      checked={syncToCalendar}
                      onChange={(e) => setSyncToCalendar(e.target.checked)}
                      className="rounded-xs border-border text-ink focus:ring-ink"
                    />
                    <span>Automatically add to my campus timetable & personal calendar</span>
                  </label>
                )}

                <div className="pt-1 flex items-center gap-3">
                  {isAttending ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isProcessing}
                      onClick={handleCancelRsvp}
                      className="text-danger hover:bg-danger/10 border-danger/30"
                    >
                      Cancel RSVP
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isProcessing}
                      onClick={handleRsvp}
                      className="flex items-center gap-1.5"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>RSVP Attending</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Report Event Link */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowReportForm(true)}
                  className="text-meta font-mono text-ink-muted hover:text-danger flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report this event</span>
                </button>
              </div>

              {/* Report Event Modal Form */}
              {showReportForm && (
                <div className="p-3.5 rounded-sm border border-danger/40 bg-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-small font-bold text-danger flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report Event to Campus Administration</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowReportForm(false)}
                      className="text-meta text-ink-muted hover:text-ink cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handleReportEvent} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-meta font-mono text-ink block font-bold">
                        Reason for Report *
                      </label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-1.5 text-small text-ink"
                      >
                        <option value="Misleading or inaccurate information">Misleading or inaccurate information</option>
                        <option value="Inappropriate commercial promotion">Inappropriate commercial promotion</option>
                        <option value="Safety or security concern">Safety or security concern</option>
                        <option value="Duplicate or spam event">Duplicate or spam event</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-meta font-mono text-ink block">
                        Additional Context (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Provide details to assist administrative review..."
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-1.5 text-small text-ink placeholder:text-ink-muted"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowReportForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="danger"
                        size="sm"
                        disabled={isProcessing}
                      >
                        Submit report
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Admin Moderation controls */}
              {isAdmin && event.status === 'pending' && (
                <div className="p-3.5 rounded-sm border border-warning/40 bg-surface space-y-2">
                  <h4 className="text-small font-bold text-warning font-display">
                    Administrator Review Queue
                  </h4>
                  <p className="text-meta text-ink-muted">
                    This event is currently pending approval for college-wide calendar and directory visibility.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isProcessing}
                      onClick={handleApprove}
                    >
                      Approve event
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isProcessing}
                      onClick={handleReject}
                      className="text-danger hover:bg-danger/10"
                    >
                      Reject event
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEAMS */}
          {activeTab === 'teams' && event.allowTeams && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-small font-bold text-ink">
                    Hackathon & Project Teams
                  </h3>
                  <p className="text-meta text-ink-muted">
                    Connect with other students forming teams ({event.minTeamSize} – {event.maxTeamSize} members allowed).
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowTeamForm(!showTeamForm)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showTeamForm ? 'Close form' : 'Register team'}</span>
                </Button>
              </div>

              {/* Form New Team */}
              {showTeamForm && (
                <form
                  onSubmit={handleCreateTeam}
                  className="p-3.5 rounded-sm border border-border bg-surface-sunken space-y-3"
                >
                  <h4 className="font-display text-small font-bold text-ink">
                    Register a New Team
                  </h4>

                  <div className="space-y-1">
                    <label className="text-meta font-mono font-bold text-ink block">
                      Team Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NeuralPulse"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm px-3 py-1.5 text-small text-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-meta font-mono text-ink block">
                      Desired Skills / Roles (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Next.js, PyTorch, Hardware, UI Design"
                      value={desiredSkillsStr}
                      onChange={(e) => setDesiredSkillsStr(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm px-3 py-1.5 text-small text-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-meta font-mono text-ink block">
                      Team Pitch / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="What is your team building? What roles do you need?"
                      value={teamNotes}
                      onChange={(e) => setTeamNotes(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm px-3 py-1.5 text-small text-ink"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowTeamForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isProcessing}
                    >
                      Create team
                    </Button>
                  </div>
                </form>
              )}

              {/* Existing Teams List */}
              <div className="space-y-2">
                {teams.length === 0 ? (
                  <div className="p-8 text-center bg-surface-sunken/40 border border-border rounded-sm space-y-1">
                    <Users className="w-8 h-8 text-ink-muted opacity-40 mx-auto" />
                    <p className="text-small text-ink font-medium">No teams formed yet</p>
                    <p className="text-meta text-ink-muted">Be the first to create a team for this hackathon!</p>
                  </div>
                ) : (
                  teams.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-sm border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-small font-bold text-ink">
                            {t.name}
                          </h4>
                          {t.lookingForMembers && (
                            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono bg-highlight/20 border border-highlight text-ink font-bold">
                              Recruiting
                            </span>
                          )}
                        </div>

                        <p className="text-meta font-mono text-ink-muted">
                          Leader: {t.leaderName}
                        </p>

                        {t.notes && (
                          <p className="text-small text-ink mt-1">
                            {t.notes}
                          </p>
                        )}

                        {t.desiredSkills && t.desiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {t.desiredSkills.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded-xs bg-surface-sunken text-ink-muted font-mono text-[10px] border border-border"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DISCUSSION */}
          {activeTab === 'discussion' && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-[320px] overflow-y-auto p-1">
                {messages.length === 0 ? (
                  <div className="p-8 text-center bg-surface-sunken/40 border border-border rounded-sm space-y-1">
                    <MessageSquare className="w-8 h-8 text-ink-muted opacity-40 mx-auto" />
                    <p className="text-small text-ink font-medium">No discussion questions yet</p>
                    <p className="text-meta text-ink-muted">Ask the event organizers or chat with participants.</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-sm border border-border bg-surface space-y-1"
                    >
                      <div className="flex items-center justify-between text-meta font-mono text-ink-muted">
                        <span className="font-bold text-ink">{m.authorName}</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-small text-ink leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Message input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-border">
                <input
                  type="text"
                  placeholder="Ask a question or post to event chat..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="flex-1 bg-surface-sunken border border-border rounded-sm px-3 py-1.5 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isProcessing || !messageContent.trim()}
                  className="shrink-0 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
