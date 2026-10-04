'use client'

import React from 'react'
import { Calendar, MapPin, Users, Check, Sparkles, Clock, ExternalLink } from 'lucide-react'
import type { EventItem } from '../schema'

interface EventCardProps {
  event: EventItem
  onSelect: (event: EventItem) => void
  onQuickRsvp?: (event: EventItem) => void
  isRsvping?: boolean
}

export function EventCard({ event, onSelect, onQuickRsvp, isRsvping }: EventCardProps) {
  const isAttending = event.userRsvpStatus === 'attending'
  const startDate = new Date(event.startsAt)
  const isPending = event.status === 'pending'

  // Format date nicely: e.g. "Sat, Oct 10 · 10:00 AM"
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  // Gradient fallback if banner is missing
  const fallbackGradients = [
    'from-blue-600 via-indigo-600 to-purple-700',
    'from-emerald-600 via-teal-600 to-cyan-700',
    'from-amber-600 via-orange-600 to-rose-700',
    'from-violet-600 via-purple-600 to-fuchsia-700',
  ]
  const gradientIdx = Math.abs(event.title.charCodeAt(0) % fallbackGradients.length)

  return (
    <div
      onClick={() => onSelect(event)}
      className="group relative flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Top Banner & Badges */}
      <div className="relative h-44 w-full bg-[var(--surface-sunken)] overflow-hidden">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-tr ${fallbackGradients[gradientIdx]} flex items-center justify-center p-4`}
          >
            <Sparkles className="w-12 h-12 text-white/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-md shadow-xs ${
                event.kind === 'college'
                  ? 'bg-blue-900/80 text-blue-200 border border-blue-400/30'
                  : 'bg-purple-900/80 text-purple-200 border border-purple-400/30'
              }`}
            >
              {event.kind === 'college' ? 'College Event' : 'External Hackathon'}
            </span>

            {isPending && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/90 text-navy-900 border border-amber-300/40">
                Pending Approval
              </span>
            )}
          </div>

          {event.allowTeams && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-black/60 text-white/90 backdrop-blur-md flex items-center gap-1 border border-white/20">
              <Users className="w-3 h-3 text-[var(--highlight)]" />
              Teams ({event.minTeamSize}-{event.maxTeamSize})
            </span>
          )}
        </div>

        {/* Organizer on banner bottom */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-xs font-medium text-white/80 line-clamp-1">
            {event.organizerName}
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-base line-clamp-2 group-hover:text-[var(--primary)] transition-colors mb-2">
            {event.title}
          </h3>

          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3 leading-relaxed">
            {event.description}
          </p>

          <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
              <span>
                {formattedDate} · {formattedTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-[11px] rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              >
                #{tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="text-[11px] text-[var(--text-secondary)] self-center">
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Users className="w-3.5 h-3.5" />
            <span>{event.rsvpCount || 0} attending</span>
          </div>

          <div className="flex items-center gap-2">
            {onQuickRsvp && (
              <button
                type="button"
                disabled={isRsvping}
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickRsvp(event)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isAttending
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 shadow-xs'
                }`}
              >
                {isAttending ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Attending</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>RSVP</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
