'use client'

import React, { useState } from 'react'
import { X, Calendar, Plus, Users, AlertCircle, Info, Sparkles } from 'lucide-react'
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
  const [capacity, setCapacity] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [allowTeams, setAllowTeams] = useState(false)
  const [minTeamSize, setMinTeamSize] = useState(2)
  const [maxTeamSize, setMaxTeamSize] = useState(4)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[var(--surface-paper)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-ground)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Propose Campus Event</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Submit an event for review and timetable publication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Approval Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Events require administrative approval before becoming visible college-wide on the campus calendar and directory.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-medium border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Event Kind Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Event Classification
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setKind('college')
                  setOrganizerType('club')
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  kind === 'college'
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-2xs'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
                }`}
              >
                <span>College Event</span>
                <span className="text-[10px] font-normal opacity-80">Clubs, departments, admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setKind('external')
                  setOrganizerType('external')
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  kind === 'external'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-2xs'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
                }`}
              >
                <span>External Hackathon / Contest</span>
                <span className="text-[10px] font-normal opacity-80">External partner or sponsor</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Campus Hackathon 2026: InnovateX"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
            />
          </div>

          {/* Organizer details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Organizer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Turing Computer Society"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Organizer Body *
              </label>
              <select
                value={organizerType}
                onChange={(e) => setOrganizerType(e.target.value as EventOrganizerType)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
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
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Venue / Location *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Seminar Hall 2, Block B or Online Google Meet"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Starts At *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                />
                <input
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-24 text-xs px-2 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Ends At *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                />
                <input
                  type="time"
                  required
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-24 text-xs px-2 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Full Description & Agenda *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Outline what attendees will learn, speakers, schedule, eligibility, and rules..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
            />
          </div>

          {/* Registration Link, Capacity & Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Registration Link
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={registrationLink}
                onChange={(e) => setRegistrationLink(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Attendee Capacity
              </label>
              <input
                type="number"
                placeholder="e.g. 150"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Banner Image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. AI, Workshop, Prizes, Robotics"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
            />
          </div>

          {/* Team formation toggle */}
          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Enable Team Formation
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Allows attendees to create teams and recruit teammates for hackathons/projects
                </p>
              </div>

              <input
                type="checkbox"
                checked={allowTeams}
                onChange={(e) => setAllowTeams(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </div>

            {allowTeams && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Min Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(parseInt(e.target.value, 10))}
                    className="w-full text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Max Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(parseInt(e.target.value, 10))}
                    className="w-full text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
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
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
