'use client'

import * as React from 'react'
import { Calendar, MapPin, Users, Check, Clock, Sparkles } from 'lucide-react'
import type { EventItem } from '../schema'
import { cn } from '@/lib/utils'

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

  return (
    <div
      onClick={() => onSelect(event)}
      className="group flex flex-col justify-between rounded-md border border-border bg-surface transition-colors hover:border-ink/60 overflow-hidden cursor-pointer"
    >
      {/* Top Banner & Badges (Clean Mist/Paper surface, NO gradients per DESIGN.MD §12) */}
      <div className="relative h-40 w-full bg-surface-sunken border-b border-border overflow-hidden">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-surface-sunken text-ink-muted">
            <Calendar className="w-8 h-8 opacity-40 mb-1" />
            <span className="text-[11px] font-mono opacity-60">Campus event</span>
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm border',
                event.kind === 'college'
                  ? 'bg-ink text-on-ink border-ink'
                  : 'bg-surface text-ink border-border'
              )}
            >
              {event.kind === 'college' ? 'College event' : 'External hackathon'}
            </span>

            {isPending && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-warning text-white border border-transparent">
                Pending approval
              </span>
            )}
          </div>

          {event.allowTeams && (
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-surface text-ink border border-border flex items-center gap-1">
              <Users className="w-3 h-3 text-highlight" />
              Teams ({event.minTeamSize}–{event.maxTeamSize})
            </span>
          )}
        </div>

        {/* Organizer Tag on Banner Bottom */}
        <div className="absolute bottom-2 left-2.5 right-2.5 bg-surface/90 backdrop-blur-xs px-2 py-0.5 rounded-xs border border-border inline-block self-start max-w-fit">
          <p className="text-[11px] font-mono text-ink line-clamp-1 font-semibold">
            {event.organizerName}
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-ink text-base line-clamp-2 leading-snug">
            {event.title}
          </h3>

          <p className="text-small text-ink-muted line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          <div className="space-y-1 text-meta font-mono text-ink-muted pt-1">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <span>
                {formattedDate}, {formattedTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-[10px] font-mono rounded-sm bg-surface-sunken text-ink-muted border border-border"
              >
                #{tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="text-[10px] font-mono text-ink-muted self-center">
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-meta font-mono text-ink-muted">
            <Users className="w-3.5 h-3.5" />
            <span>{event.rsvpCount || 0} attending</span>
          </div>

          <div>
            {onQuickRsvp && (
              <button
                type="button"
                disabled={isRsvping}
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickRsvp(event)
                }}
                className={cn(
                  'px-3 py-1 rounded-sm text-meta font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                  isAttending
                    ? 'bg-success/15 text-success border border-success/30'
                    : 'bg-ink text-on-ink border border-ink hover:opacity-90'
                )}
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
