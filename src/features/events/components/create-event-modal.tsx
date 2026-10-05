'use client'

import React, { useState } from 'react'
import { X, Calendar, Plus, Users, AlertCircle, Info, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createEventAction } from '../actions'
import type { EventKind, EventOrganizerType } from '../schema'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateEventModal({ isOpen, onClose, onCreated }: CreateEventModalProps) {
  const [kind, setKind] = useState<EventKind>('college')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [organizerName, setOrganizerName] = useState('')
  const [organizerType, setOrganizerType] = useState<EventOrganizerType>('club')
  const [location, setLocation] = useState('')
  const [startDateStr, setStartDateStr] = useState('')
  const [startTimeStr, setStartTimeStr] = useState('10:00')
  const [endDateStr, setEndDateStr] = useState('')
  const [endTimeStr, setEndTimeStr] = useState('17:00')
  const [registrationLink, setRegistrationLink] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [brochureUrl, setBrochureUrl] = useState('')
  const [prizePool, setPrizePool] = useState('')
  const [eligibility, setEligibility] = useState('')
  const [opportunityType, setOpportunityType] = useState('hackathon')
  const [stages, setStages] = useState<Array<{ title: string; description: string; date: string }>>([
    { title: 'Round 1: Registration & Submission', description: 'Submit abstract or proposal', date: '' },
  ])
  const [capacity, setCapacity] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [allowTeams, setAllowTeams] = useState(false)
  const [minTeamSize, setMinTeamSize] = useState(2)
  const [maxTeamSize, setMaxTeamSize] = useState(4)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  const handleBrochureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBrochureUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      { title: `Round ${prev.length + 1}: Finale & Presentation`, description: 'Demo before jury', date: '' },
    ])
  }

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessNotice(null)

    if (!startDateStr || !endDateStr) {
      setErrorMsg('Please select start and end dates')
      return
    }

    const startsAt = new Date(`${startDateStr}T${startTimeStr}:00`).toISOString()
    const endsAt = new Date(`${endDateStr}T${endTimeStr}:00`).toISOString()

    if (new Date(endsAt) < new Date(startsAt)) {
      setErrorMsg('Event end time must be after the start time')
      return
    }

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    setIsSubmitting(true)

    try {
      const res = await createEventAction({
        kind,
        title: title.trim(),
        description: description.trim(),
        organizerName: organizerName.trim(),
        organizerType,
        location: location.trim(),
        startsAt,
        endsAt,
        registrationLink: registrationLink.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        brochureUrl: brochureUrl.trim() || undefined,
        prizePool: prizePool.trim() || undefined,
        eligibility: eligibility.trim() || undefined,
        opportunityType,
        stages: stages.filter((s) => s.title.trim()),
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        tags,
        allowTeams,
        minTeamSize,
        maxTeamSize,
      })

      if (res.ok) {
        setSuccessNotice(res.message || 'Event created successfully!')
        setTimeout(() => {
          onCreated()
          onClose()
        }, 1200)
      } else {
        setErrorMsg(res.error || 'Failed to submit event')
      }
    } catch {
      setErrorMsg('An unexpected error occurred while creating the event')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-surface rounded-md border border-border shadow-[var(--shadow-float)] overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-surface-sunken border border-border text-ink flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Propose Campus Event</h2>
              <p className="text-meta text-ink-muted">
                Submit an event for administrative review and campus timetable publication
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Approval Notice */}
          <div className="p-3 rounded-sm bg-warning/10 border border-warning/30 text-small text-ink flex items-start gap-2">
            <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p>
              Events require administrative approval before becoming visible college-wide on the campus calendar and directory.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-sm bg-danger/10 border border-danger/30 text-danger text-small font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-sm bg-success/10 border border-success/30 text-success text-small font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Event Kind Toggle */}
          <div>
            <label className="block text-small font-semibold text-ink mb-1.5">
              Event Classification
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setKind('college')
                  setOrganizerType('club')
                }}
                className={cn(
                  'p-3 rounded-sm border text-small font-semibold flex flex-col items-center gap-1 transition-colors cursor-pointer',
                  kind === 'college'
                    ? 'border-ink bg-ink text-on-ink'
                    : 'border-border bg-surface text-ink-muted hover:text-ink'
                )}
              >
                <span>College Event</span>
                <span className="text-meta font-normal opacity-80">Clubs, departments, admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setKind('external')
                  setOrganizerType('external')
                }}
                className={cn(
                  'p-3 rounded-sm border text-small font-semibold flex flex-col items-center gap-1 transition-colors cursor-pointer',
                  kind === 'external'
                    ? 'border-ink bg-ink text-on-ink'
                    : 'border-border bg-surface text-ink-muted hover:text-ink'
                )}
              >
                <span>External Hackathon / Contest</span>
                <span className="text-meta font-normal opacity-80">External partner or sponsor</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-small font-semibold text-ink mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Campus Hackathon 2026: InnovateX"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
          </div>

          {/* Organizer details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Organizer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Turing Computer Society"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              />
            </div>

            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Organizer Body *
              </label>
              <select
                value={organizerType}
                onChange={(e) => setOrganizerType(e.target.value as EventOrganizerType)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              >
                <option value="club">Student Club / Society</option>
                <option value="department">Academic Department</option>
                <option value="admin">College Administration</option>
                <option value="external">External Organization / Partner</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-small font-semibold text-ink mb-1">
              Venue / Location *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Seminar Hall 2, Block B or Online Google Meet"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-small font-semibold text-ink">
                Starts At *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="flex-1 text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
                <input
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-28 text-small px-2 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-small font-semibold text-ink">
                Ends At *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="flex-1 text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
                <input
                  type="time"
                  required
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-28 text-small px-2 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-small font-semibold text-ink mb-1">
              Full Description & Agenda *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Outline what attendees will learn, speakers, schedule, eligibility, and rules..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
          </div>

          {/* Unstop Opportunity Fields: Category & Official Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Opportunity Type
              </label>
              <select
                value={opportunityType}
                onChange={(e) => setOpportunityType(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              >
                <option value="hackathon">Hackathon & Coding Sprint</option>
                <option value="competition">Case Competition / Challenge</option>
                <option value="workshop">Hands-On Workshop</option>
                <option value="quiz">Technical / General Quiz</option>
                <option value="cultural">Cultural & Arts Fest</option>
                <option value="talk">Guest Lecture / Conference</option>
              </select>
            </div>

            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Official Event Website
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              />
            </div>
          </div>

          {/* Event Brochure Section: File Upload & Brochure Link */}
          <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-2.5">
            <label className="block text-small font-bold text-ink">
              Event Brochure / Poster Flyer
            </label>
            <p className="text-meta text-ink-muted">
              Upload event brochure image/PDF or provide direct link for attendees to download and inspect.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="px-3.5 py-1.5 rounded-sm border border-border bg-surface text-meta font-mono font-medium text-ink hover:bg-border transition-colors cursor-pointer shrink-0">
                <span>Browse file...</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleBrochureUpload}
                  className="hidden"
                />
              </label>

              <span className="text-meta font-mono text-ink-muted">or URL:</span>

              <input
                type="text"
                placeholder="https://.../brochure.pdf or image link"
                value={brochureUrl}
                onChange={(e) => setBrochureUrl(e.target.value)}
                className="flex-1 text-small px-3 py-1.5 rounded-sm bg-surface border border-border text-ink"
              />
            </div>

            {brochureUrl && (
              <div className="pt-1 flex items-center justify-between text-meta font-mono text-in-campus bg-surface p-2 rounded-sm border border-border">
                <span className="truncate">✓ Brochure attached</span>
                <button
                  type="button"
                  onClick={() => setBrochureUrl('')}
                  className="text-danger hover:underline ml-2 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Prize Pool & Eligibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Prizes & Rewards
              </label>
              <input
                type="text"
                placeholder="e.g. ₹75,000 Cash + Certificates + Goodies"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              />
            </div>

            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Eligibility Criteria
              </label>
              <input
                type="text"
                placeholder="e.g. Open to all students & alumni"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              />
            </div>
          </div>

          {/* Stages & Timeline (Rounds) */}
          <div className="p-3.5 rounded-sm bg-surface-sunken border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-small font-bold text-ink">Stages & Rounds Timeline</span>
                <p className="text-meta text-ink-muted">Define the sequential rounds of this opportunity (like Unstop)</p>
              </div>
              <button
                type="button"
                onClick={handleAddStage}
                className="text-meta font-mono font-semibold px-2.5 py-1 rounded-sm bg-surface border border-border text-ink hover:bg-border transition-colors cursor-pointer"
              >
                + Add Round
              </button>
            </div>

            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div key={idx} className="p-2.5 rounded-sm bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder={`Round ${idx + 1} Name`}
                      value={stage.title}
                      onChange={(e) => {
                        const val = e.target.value
                        setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, title: val } : s)))
                      }}
                      className="flex-1 text-small font-bold px-2 py-1 rounded-xs bg-surface-sunken border border-border text-ink"
                    />
                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(idx)}
                        className="text-xs text-danger hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Brief description of this stage..."
                    value={stage.description}
                    onChange={(e) => {
                      const val = e.target.value
                      setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, description: val } : s)))
                    }}
                    className="w-full text-small px-2 py-1 rounded-xs bg-surface-sunken border border-border text-ink"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Registration Link, Capacity & Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Portal Registration Link
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={registrationLink}
                onChange={(e) => setRegistrationLink(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              />
            </div>

            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Attendee Capacity
              </label>
              <input
                type="number"
                placeholder="e.g. 150"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              />
            </div>

            <div>
              <label className="block text-small font-semibold text-ink mb-1">
                Banner Image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-small font-semibold text-ink mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. AI, Workshop, Prizes, Robotics"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
          </div>

          {/* Team formation toggle */}
          <div className="p-3.5 rounded-sm border border-border bg-surface-sunken space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-small font-bold text-ink">
                  Enable Team Formation
                </span>
                <p className="text-meta text-ink-muted">
                  Allows attendees to create teams and recruit teammates for hackathons/projects
                </p>
              </div>

              <input
                type="checkbox"
                checked={allowTeams}
                onChange={(e) => setAllowTeams(e.target.checked)}
                className="h-4 w-4 rounded-xs border-border text-ink focus:ring-ink"
              />
            </div>

            {allowTeams && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="block text-meta font-medium text-ink-muted mb-1">
                    Min Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(parseInt(e.target.value, 10))}
                    className="w-full text-small px-3 py-1.5 rounded-sm bg-surface border border-border text-ink"
                  />
                </div>
                <div>
                  <label className="block text-meta font-medium text-ink-muted mb-1">
                    Max Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(parseInt(e.target.value, 10))}
                    className="w-full text-small px-3 py-1.5 rounded-sm bg-surface border border-border text-ink"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-small font-medium rounded-sm border border-border bg-surface text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-small font-semibold rounded-sm bg-ink text-on-ink hover:opacity-90 active:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
