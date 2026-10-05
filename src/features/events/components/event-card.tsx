'use client'

import * as React from 'react'
import { Calendar, MapPin, Users, Check, Clock, ArrowRight, Building2, Sparkles, Trophy, Globe, FileText } from 'lucide-react'
import type { EventItem } from '../schema'
import { cn } from '@/lib/utils'

interface EventCardProps {
  event: EventItem
  onSelect: (event: EventItem) => void
  onQuickRsvp?: (event: EventItem) => void
  isRsvping?: boolean
  layout?: 'row' | 'card'
}

export function EventCard({
  event,
  onSelect,
  onQuickRsvp,
  isRsvping,
  layout = 'row',
}: EventCardProps) {
  const isAttending = event.userRsvpStatus === 'attending'
  const startDate = new Date(event.startsAt)
  const isPending = event.status === 'pending'

  const monthStr = startDate.toLocaleDateString('en-US', { month: 'short' })
  const dayNum = startDate.getDate()
  const weekdayStr = startDate.toLocaleDateString('en-US', { weekday: 'short' })
  const timeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  // Format date string for mobile / meta
  const fullDateStr = `${weekdayStr}, ${monthStr} ${dayNum}, ${timeStr}`

  // 1. Collegiate Row Layout (Default: highly scannable, clean typography, no giant image clutter)
  if (layout === 'row') {
    return (
      <div
        onClick={() => onSelect(event)}
        className="group relative bg-surface border border-border rounded-md hover:border-ink transition-all cursor-pointer p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden"
      >
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Left Date Block */}
          <div className="shrink-0 w-16 sm:w-20 text-center rounded-sm border border-border bg-surface-sunken p-2 flex flex-col items-center justify-center select-none">
            <span className="text-[11px] font-mono font-bold text-ink-muted leading-none">
              {monthStr}
            </span>
            <span className="font-display text-2xl font-bold text-ink leading-tight">
              {dayNum}
            </span>
            <span className="text-[10px] font-mono text-ink-muted leading-none">
              {weekdayStr}
            </span>
          </div>

          {/* Main Info */}
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
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
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-warning text-white">
                  Pending approval
                </span>
              )}

              {event.allowTeams && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-surface text-ink border border-border flex items-center gap-1">
                  <Users size={11} className="text-highlight" />
                  <span>Teams ({event.minTeamSize}–{event.maxTeamSize})</span>
                </span>
              )}

              <span className="text-meta font-mono text-ink-muted flex items-center gap-1">
                <Building2 size={12} className="text-ink-muted" />
                <span className="truncate max-w-[200px]">{event.organizerName}</span>
              </span>

              {event.prizePool && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm bg-highlight/15 text-ink border border-highlight/30 flex items-center gap-1">
                  <Trophy size={11} className="text-highlight" />
                  <span>{event.prizePool.split('+')[0].split('in')[0].trim()}</span>
                </span>
              )}

              {event.brochureUrl && (
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded-xs bg-surface-sunken text-ink-muted border border-border">
                  <FileText size={10} />
                  <span>Brochure</span>
                </span>
              )}

              {event.websiteUrl && (
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded-xs bg-surface-sunken text-ink-muted border border-border">
                  <Globe size={10} />
                  <span>Site</span>
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-display text-base sm:text-lg font-bold text-ink leading-snug group-hover:text-ink/80 transition-colors">
              {event.title}
            </h3>

            {/* Description */}
            <p className="text-small text-ink-muted line-clamp-2 leading-relaxed">
              {event.description}
            </p>

            {/* Meta Line: Time & Location & Tags */}
            <div className="flex items-center gap-3 text-meta font-mono text-ink-muted pt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                <span>{timeStr}</span>
              </span>
              <span className="flex items-center gap-1 truncate max-w-xs">
                <MapPin size={12} />
                <span className="truncate">{event.location}</span>
              </span>

              {event.tags && event.tags.length > 0 && (
                <div className="hidden md:flex items-center gap-1 pl-1">
                  {event.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.2 text-[10px] font-mono rounded-xs bg-surface-sunken text-ink-muted border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions & Attendee Cluster */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
          <div className="flex items-center gap-1 text-meta font-mono text-ink-muted">
            <Users size={13} />
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
                className={cn(
                  'px-3 py-1.5 rounded-sm text-meta font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                  isAttending
                    ? 'bg-success/15 text-success border border-success/30'
                    : 'bg-ink text-on-ink border border-ink hover:opacity-90'
                )}
              >
                {isAttending ? (
                  <>
                    <Check size={13} />
                    <span>Attending</span>
                  </>
                ) : (
                  <>
                    <Calendar size={13} />
                    <span>RSVP</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelect(event)}
              className="px-2.5 py-1.5 rounded-sm border border-border bg-surface hover:bg-surface-sunken text-meta font-mono font-medium text-ink flex items-center gap-1 transition-colors"
            >
              <span>Details</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 2. Card Grid Layout Option (Streamlined, no massive billboard clutter)
  return (
    <div
      onClick={() => onSelect(event)}
      className="group flex flex-col justify-between rounded-md border border-border bg-surface transition-colors hover:border-ink overflow-hidden cursor-pointer"
    >
      {/* Card Header with Badges */}
      <div className="p-4 pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
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

          <span className="text-[11px] font-mono text-ink-muted">
            {fullDateStr}
          </span>
        </div>

        <h3 className="font-display font-bold text-ink text-base line-clamp-2 leading-snug">
          {event.title}
        </h3>

        <p className="text-small text-ink-muted line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        <div className="space-y-1 text-meta font-mono text-ink-muted pt-1">
          <div className="flex items-center gap-1.5">
            <Building2 size={13} className="text-ink-muted shrink-0" />
            <span className="truncate">{event.organizerName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-ink-muted shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-meta font-mono text-ink-muted">
          <Users size={13} />
          <span>{event.rsvpCount || 0} attending</span>
        </div>

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
                <Check size={13} />
                <span>Attending</span>
              </>
            ) : (
              <>
                <Calendar size={13} />
                <span>RSVP</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
