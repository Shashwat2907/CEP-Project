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
  Building2,
  Trophy,
  Globe,
  FileText,
  Download,
  GraduationCap,
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

  // Keyboard escape listener to close drawer effortlessly
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
        setFeedback('RSVP cancelled.')
        onEventUpdated()
      } else {
        setFeedback(res.error || 'Failed to cancel RSVP')
      }
    } catch {
      setFeedback('Error cancelling RSVP')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    setIsProcessing(true)
    try {
      const desiredSkills = desiredSkillsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await createEventTeamAction({
        eventId: event.id,
        name: teamName.trim(),
        lookingForMembers: true,
        desiredSkills,
        notes: teamNotes.trim() || undefined,
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
    <div
      role="presentation"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-240"
      onClick={onClose}
    >
      {/* Slide-over Right Drawer: Full height, highly readable, never cramped or floating */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-[580px] bg-surface border-l border-border h-full flex flex-col shadow-[var(--shadow-float)] transition-transform duration-240 ease-in-out overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border bg-surface shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm border',
                  event.kind === 'college'
                    ? 'bg-ink text-on-ink border-ink'
                    : 'bg-surface-sunken text-ink border-border'
                )}
              >
                {event.kind === 'college' ? 'College event' : 'External hackathon'}
              </span>

              {event.status === 'pending' && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-warning text-white">
                  Pending approval
                </span>
              )}

              {event.allowTeams && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-surface-sunken text-ink border border-border flex items-center gap-1">
                  <Users size={11} className="text-highlight" />
                  <span>Teams ({event.minTeamSize}–{event.maxTeamSize})</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-sm p-1.5 text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors focus-visible:outline-2 focus-visible:outline-ink"
              aria-label="Close details"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>

          <div>
            <h2 id="event-drawer-title" className="font-display text-h2 font-bold text-ink leading-tight">
              {event.title}
            </h2>
            <div className="flex items-center gap-1.5 text-meta font-mono text-ink-muted mt-1">
              <Building2 size={13} className="text-ink-muted shrink-0" />
              <span>Organized by <strong className="text-ink font-semibold">{event.organizerName}</strong></span>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="p-2.5 rounded-sm bg-surface-sunken border border-border text-meta text-ink flex items-center gap-2">
              <Sparkles size={14} className="text-highlight shrink-0" />
              <span className="flex-1">{feedback}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-border -mb-5 pt-1 gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={cn(
                'py-2 px-3 text-small font-medium border-b-2 -mb-px transition-colors cursor-pointer',
                activeTab === 'details'
                  ? 'border-highlight text-ink font-bold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              Overview & RSVP
            </button>

            {event.stages && event.stages.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('stages' as any)}
                className={cn(
                  'py-2 px-3 text-small font-medium border-b-2 -mb-px transition-colors cursor-pointer',
                  (activeTab as any) === 'stages'
                    ? 'border-highlight text-ink font-bold'
                    : 'border-transparent text-ink-muted hover:text-ink'
                )}
              >
                Stages & Rounds ({event.stages.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('teams')}
              className={cn(
                'py-2 px-3 text-small font-medium border-b-2 -mb-px transition-colors cursor-pointer',
                activeTab === 'teams'
                  ? 'border-highlight text-ink font-bold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              Teams ({teams.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('discussion')}
              className={cn(
                'py-2 px-3 text-small font-medium border-b-2 -mb-px transition-colors cursor-pointer',
                activeTab === 'discussion'
                  ? 'border-highlight text-ink font-bold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              Discussion ({messages.length})
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body: Comfortable typography and spacing */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: OVERVIEW & RSVP */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Unstop Quick Actions Bar (Official Website & Brochure Download) */}
              {(event.websiteUrl || event.brochureUrl) && (
                <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-md bg-surface-sunken border border-border">
                  {event.websiteUrl && (
                    <a
                      href={event.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-sm bg-surface border border-border text-small font-semibold text-ink hover:bg-surface-sunken transition-colors cursor-pointer shadow-xs"
                    >
                      <Globe size={14} className="text-highlight shrink-0" />
                      <span>Visit Official Website</span>
                      <ExternalLink size={12} className="text-ink-muted ml-0.5" />
                    </a>
                  )}

                  {event.brochureUrl && (
                    <a
                      href={event.brochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-sm bg-surface border border-border text-small font-semibold text-ink hover:bg-surface-sunken transition-colors cursor-pointer shadow-xs"
                    >
                      <FileText size={14} className="text-highlight shrink-0" />
                      <span>Download / View Brochure</span>
                      <Download size={12} className="text-ink-muted ml-0.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Unstop Key Highlights: Prize Pool, Eligibility, Team Size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {event.prizePool && (
                  <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-1">
                    <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1.5 font-medium">
                      <Trophy size={13} className="text-highlight" /> Prizes & Perks
                    </span>
                    <p className="font-display text-small font-bold text-ink leading-snug">
                      {event.prizePool}
                    </p>
                  </div>
                )}

                {event.eligibility && (
                  <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-1">
                    <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1.5 font-medium">
                      <GraduationCap size={13} /> Eligibility
                    </span>
                    <p className="font-display text-small font-bold text-ink leading-snug">
                      {event.eligibility}
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-1">
                  <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1.5 font-medium">
                    <Users size={13} /> Participation
                  </span>
                  <p className="font-display text-small font-bold text-ink leading-snug">
                    {event.allowTeams
                      ? `Teams (${event.minTeamSize}–${event.maxTeamSize} members)`
                      : 'Individual Participation'}
                  </p>
                </div>
              </div>

              {/* Date, Time & Location Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-1">
                  <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1.5 font-medium">
                    <Calendar size={13} /> Date & time
                  </span>
                  <p className="font-display text-small font-bold text-ink">
                    {formattedDate}
                  </p>
                  <p className="text-meta font-mono text-ink-muted">
                    {formattedStartTime} – {formattedEndTime}
                  </p>
                </div>

                <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-1">
                  <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1.5 font-medium">
                    <MapPin size={13} /> Location
                  </span>
                  <p className="font-display text-small font-bold text-ink">
                    {event.location}
                  </p>
                  <p className="text-meta text-ink-muted">
                    Campus venue or link
                  </p>
                </div>
              </div>

              {/* External Registration Link if any */}
              {event.registrationLink && (
                <div className="p-3.5 rounded-sm bg-surface-sunken border border-border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-small font-semibold text-ink block">
                      External portal registration required
                    </span>
                    <span className="text-meta text-ink-muted">
                      Organizer hosted registration
                    </span>
                  </div>
                  <a
                    href={event.registrationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-sm bg-ink text-on-ink text-meta font-mono font-medium hover:opacity-90 flex items-center gap-1.5 shrink-0"
                  >
                    <span>Visit site</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Attendance & RSVP Section */}
              <div className="p-4 rounded-md border border-border bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-small font-bold text-ink">
                      Your Attendance
                    </h3>
                    <p className="text-meta text-ink-muted">
                      {event.rsvpCount || 0} students currently registered
                    </p>
                  </div>

                  <span
                    className={cn(
                      'text-meta font-mono font-semibold px-2 py-0.5 rounded-xs border',
                      isAttending
                        ? 'bg-success/10 text-success border-success/30'
                        : 'bg-surface-sunken text-ink-muted border-border'
                    )}
                  >
                    {isAttending ? 'Attending' : 'Not registered'}
                  </span>
                </div>

                {!isAttending ? (
                  <div className="space-y-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-small text-ink">
                      <input
                        type="checkbox"
                        checked={syncToCalendar}
                        onChange={(e) => setSyncToCalendar(e.target.checked)}
                        className="rounded-xs border-border text-ink focus:ring-ink"
                      />
                      <span>Automatically add to my campus timetable & personal calendar</span>
                    </label>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleRsvp}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      <Calendar size={15} />
                      <span>RSVP Attending</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelRsvp}
                      disabled={isProcessing}
                      className="text-danger hover:bg-danger/10 border-danger/30"
                    >
                      Cancel RSVP
                    </Button>
                  </div>
                )}
              </div>

              {/* Full Event Description (Comfortable reading typography) */}
              <div className="space-y-2">
                <h3 className="font-display text-small font-bold text-ink">
                  About Event & Problem Statement
                </h3>
                <div className="p-4 rounded-sm bg-surface-sunken border border-border font-body text-body text-ink leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </div>
              </div>

              {/* Brochure Image Preview if brochure is an image/flyer */}
              {event.brochureUrl && (
                <div className="space-y-2">
                  <h3 className="font-display text-small font-bold text-ink flex items-center justify-between">
                    <span>Event Brochure / Poster</span>
                    <a
                      href={event.brochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-meta font-mono text-ink underline hover:text-ink-muted"
                    >
                      Open full view
                    </a>
                  </h3>
                  <div className="rounded-md border border-border overflow-hidden bg-surface-sunken">
                    <img
                      src={event.brochureUrl}
                      alt={`${event.title} Brochure`}
                      className="w-full max-h-72 object-cover hover:scale-[1.01] transition-transform duration-200"
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display text-meta font-bold text-ink">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-meta font-mono rounded-sm bg-surface-sunken border border-border text-ink"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Report Event Section */}
              <div className="pt-2 border-t border-border">
                {!showReportForm ? (
                  <button
                    type="button"
                    onClick={() => setShowReportForm(true)}
                    className="text-meta font-mono text-ink-muted hover:text-danger flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Flag size={12} />
                    <span>Report this event</span>
                  </button>
                ) : (
                  <form onSubmit={handleReportEvent} className="p-3 bg-surface-sunken border border-border rounded-sm space-y-3">
                    <h4 className="font-display text-small font-bold text-ink flex items-center gap-1.5">
                      <Flag size={13} className="text-danger" /> Report Event
                    </h4>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm px-2.5 py-1.5 text-small text-ink"
                    >
                      <option value="Misleading or inaccurate information">Misleading or inaccurate information</option>
                      <option value="Inappropriate content or harassment">Inappropriate content or harassment</option>
                      <option value="Commercial solicitation / spam">Commercial solicitation / spam</option>
                      <option value="Unauthorized external brand">Unauthorized external brand</option>
                    </select>
                    <textarea
                      rows={2}
                      placeholder="Additional details (optional)..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm p-2 text-small text-ink"
                    />
                    <div className="flex items-center gap-2 justify-end">
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
                )}
              </div>
            </div>
          )}

          {/* TAB: STAGES & ROUNDS (UNSTOP TIMELINE STEPPER) */}
          {(activeTab as any) === 'stages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-small font-bold text-ink">
                    Stages & Rounds Timeline
                  </h3>
                  <p className="text-meta text-ink-muted">
                    Follow the sequential milestones from registration to final presentation.
                  </p>
                </div>
              </div>

              {(!event.stages || event.stages.length === 0) ? (
                <div className="p-8 text-center bg-surface-sunken border border-border rounded-md text-ink-muted text-small">
                  No specific stages announced yet for this event.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {event.stages.map((stage, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-ink text-on-ink flex items-center justify-center font-mono text-[10px] font-bold border-2 border-surface">
                        {idx + 1}
                      </div>

                      <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-display text-small font-bold text-ink">
                            {stage.title}
                          </h4>
                          {stage.date && (
                            <span className="text-[11px] font-mono text-ink-muted">
                              {new Date(stage.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>

                        <p className="text-small text-ink-muted leading-relaxed">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEAMS */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-small font-bold text-ink">
                    Team Formation
                  </h3>
                  <p className="text-meta text-ink-muted">
                    {event.allowTeams
                      ? `Allowed team size: ${event.minTeamSize} to ${event.maxTeamSize} members`
                      : 'Individual registration only for this opportunity.'}
                  </p>
                </div>

                {event.allowTeams && !showTeamForm && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowTeamForm(true)}
                  >
                    <Plus size={13} />
                    <span>Create team</span>
                  </Button>
                )}
              </div>

              {/* Create Team Form */}
              {showTeamForm && (
                <form onSubmit={handleCreateTeam} className="p-4 bg-surface-sunken border border-border rounded-md space-y-3">
                  <h4 className="font-display text-small font-bold text-ink">
                    Register a new team
                  </h4>
                  <div>
                    <label className="text-meta text-ink-muted block mb-1">Team name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VisionX or DevSquad"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm px-3 py-1.5 text-small text-ink"
                    />
                  </div>

                  <div>
                    <label className="text-meta text-ink-muted block mb-1">Desired skills (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Next.js, Python, UI Design"
                      value={desiredSkillsStr}
                      onChange={(e) => setDesiredSkillsStr(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm px-3 py-1.5 text-small text-ink"
                    />
                  </div>

                  <div>
                    <label className="text-meta text-ink-muted block mb-1">Team notes (optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Looking for a backend engineer to build real-time APIs..."
                      value={teamNotes}
                      onChange={(e) => setTeamNotes(e.target.value)}
                      className="w-full bg-surface border border-border rounded-sm p-2 text-small text-ink"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-1">
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
                      Register team
                    </Button>
                  </div>
                </form>
              )}

              {/* Teams List */}
              {teams.length === 0 ? (
                <div className="p-8 text-center bg-surface-sunken border border-border rounded-md text-ink-muted text-small space-y-2">
                  <Users size={28} className="mx-auto opacity-40 mb-1" />
                  <p>No teams formed yet.</p>
                  {event.allowTeams && (
                    <p className="text-meta">Be the first to create a team and find members!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((t) => (
                    <div key={t.id} className="p-3.5 bg-surface border border-border rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-display font-bold text-ink block">
                            {t.name}
                          </span>
                          <span className="text-meta text-ink-muted font-mono">
                            Leader: {t.leaderName}
                          </span>
                        </div>
                        {t.lookingForMembers && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-xs bg-success/10 text-success border border-success/30">
                            Looking for members
                          </span>
                        )}
                      </div>

                      {t.desiredSkills && t.desiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {t.desiredSkills.map((skill: string, idx: number) => (
                            <span key={idx} className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-surface-sunken border border-border text-ink-muted">
                              {skill}
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

          {/* TAB 3: DISCUSSION */}
          {activeTab === 'discussion' && (
            <div className="space-y-4">
              <h3 className="font-display text-small font-bold text-ink">
                Event Discussion & Q&A
              </h3>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about schedule, criteria, or venue..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
                />
                <Button type="submit" variant="primary" size="compact" disabled={isProcessing || !messageContent.trim()}>
                  <Send size={14} />
                  <span>Send</span>
                </Button>
              </form>

              {/* Message Feed */}
              {messages.length === 0 ? (
                <div className="p-8 text-center bg-surface-sunken border border-border rounded-md text-ink-muted text-small">
                  <MessageSquare size={28} className="mx-auto opacity-40 mb-2" />
                  <p>No discussion messages yet.</p>
                  <p className="text-meta mt-1">Post the first question for organizers or participants.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((m) => (
                    <div key={m.id} className="p-3 bg-surface-sunken border border-border rounded-sm space-y-1">
                      <div className="flex items-center justify-between text-meta font-mono">
                        <span className="font-semibold text-ink">{m.authorName}</span>
                        <span className="text-ink-muted">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-small text-ink leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Admin Footer (if admin) */}
        {isAdmin && event.status === 'pending' && (
          <div className="p-4 border-t border-border bg-surface-sunken flex items-center justify-between gap-3 shrink-0">
            <span className="text-meta text-ink-muted">Admin review queue</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={isProcessing}
                className="text-danger border-danger/30"
              >
                Reject event
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={isProcessing}
              >
                Approve event
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
