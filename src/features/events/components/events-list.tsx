'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Sparkles,
  Users,
  Compass,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import type { EventItem, EventKind } from '../schema'
import { getEventsAction, getEventByIdAction, rsvpEventAction, cancelRsvpAction } from '../actions'
import { EventCard } from './event-card'
import { EventDetailModal } from './event-detail-modal'
import { CreateEventModal } from './create-event-modal'
import { Button } from '@/shared/ui/button'
import { cn } from '@/lib/utils'

interface EventsListProps {
  initialEvents?: EventItem[]
  isAdmin?: boolean
}

export function EventsList({ initialEvents = [], isAdmin = false }: EventsListProps) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents)
  const [selectedKind, setSelectedKind] = useState<'all' | 'college' | 'external'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showOnlyAttending, setShowOnlyAttending] = useState(false)
  const [showPending, setShowPending] = useState(false)

  // Modal states
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedEventDetail, setSelectedEventDetail] = useState<{
    event: EventItem | null
    teams: any[]
    messages: any[]
  } | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [rsvpingId, setRsvpingId] = useState<string | null>(null)

  const refreshEvents = async () => {
    setIsRefreshing(true)
    try {
      const data = await getEventsAction({
        kind: selectedKind === 'all' ? undefined : (selectedKind as EventKind),
        status: showPending ? 'all' : undefined,
      })
      setEvents(data)

      if (selectedEventId) {
        const detail = await getEventByIdAction(selectedEventId)
        setSelectedEventDetail(detail)
      }
    } catch {
      // Non-fatal
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    refreshEvents()
  }, [selectedKind, showPending])

  // Open detail modal
  const handleOpenDetail = async (item: EventItem) => {
    setSelectedEventId(item.id)
    setIsDetailOpen(true)
    const detail = await getEventByIdAction(item.id)
    setSelectedEventDetail(detail)
  }

  // Quick RSVP from card
  const handleQuickRsvp = async (item: EventItem) => {
    setRsvpingId(item.id)
    try {
      if (item.userRsvpStatus === 'attending') {
        await cancelRsvpAction(item.id)
      } else {
        await rsvpEventAction({
          eventId: item.id,
          status: 'attending',
          addToCalendar: true,
        })
      }
      await refreshEvents()
    } catch {
      // Non-fatal
    } finally {
      setRsvpingId(null)
    }
  }

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => e.tags?.forEach((t) => set.add(t)))
    return Array.from(set)
  }, [events])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedKind !== 'all' && e.kind !== selectedKind) return false
      if (selectedTag && !e.tags.includes(selectedTag)) return false
      if (showOnlyAttending && e.userRsvpStatus !== 'attending') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = e.title.toLowerCase().includes(q)
        const matchDesc = e.description.toLowerCase().includes(q)
        const matchOrg = e.organizerName.toLowerCase().includes(q)
        const matchLoc = e.location.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchOrg && !matchLoc) return false
      }

      return true
    })
  }, [events, selectedKind, selectedTag, showOnlyAttending, searchQuery])

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-display text-display font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-ink" />
            Campus Events & Hackathons
          </h1>
          <p className="text-small text-ink-muted mt-1 max-w-2xl">
            Discover college club events, technical symposia, and national hackathons. One-tap sync with your unified calendar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <a
            href="/organizer/sign-in"
            className="px-3 py-2 rounded-sm border border-border bg-surface text-ink text-meta font-mono font-medium hover:bg-surface-sunken transition-colors flex items-center gap-1.5"
          >
            <span>Hosting an event? Organizer access</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Propose event</span>
          </Button>
        </div>
      </div>

      {/* Kind Tabs (DESIGN.MD §8 segmented switcher) */}
      <div className="inline-flex rounded-sm border border-border bg-surface-sunken p-1 self-start">
        <button
          type="button"
          onClick={() => setSelectedKind('all')}
          className={cn(
            'px-3 py-1 rounded-xs text-small font-medium transition-colors cursor-pointer',
            selectedKind === 'all'
              ? 'bg-surface text-ink font-bold'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          All events ({events.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedKind('college')}
          className={cn(
            'px-3 py-1 rounded-xs text-small font-medium transition-colors cursor-pointer',
            selectedKind === 'college'
              ? 'bg-surface text-ink font-bold'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          College events
        </button>

        <button
          type="button"
          onClick={() => setSelectedKind('external')}
          className={cn(
            'px-3 py-1 rounded-xs text-small font-medium transition-colors cursor-pointer',
            selectedKind === 'external'
              ? 'bg-surface text-ink font-bold'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          External hackathons
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, club, department, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-small pl-9 pr-3 py-2 rounded-sm bg-surface border border-border text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowOnlyAttending(!showOnlyAttending)}
            className={cn(
              'px-3 py-2 rounded-sm text-meta font-mono font-medium border flex items-center gap-1.5 transition-colors cursor-pointer',
              showOnlyAttending
                ? 'border-ink bg-ink text-on-ink font-bold'
                : 'border-border bg-surface text-ink-muted hover:text-ink'
            )}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>My RSVPs</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowPending(!showPending)}
              className={cn(
                'px-3 py-2 rounded-sm text-meta font-mono font-medium border flex items-center gap-1.5 transition-colors cursor-pointer',
                showPending
                  ? 'border-warning bg-warning text-white font-bold'
                  : 'border-border bg-surface text-ink-muted hover:text-ink'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Review queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Tag Chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-meta font-mono no-scrollbar">
          <span className="text-[11px] font-mono text-ink-muted mr-1">
            Filter by:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={cn(
              'px-2.5 py-0.5 rounded-sm text-meta font-mono transition-colors cursor-pointer border',
              selectedTag === null
                ? 'bg-ink text-on-ink border-ink font-bold'
                : 'bg-surface text-ink-muted border-border hover:text-ink'
            )}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={cn(
                'px-2.5 py-0.5 rounded-sm text-meta font-mono transition-colors cursor-pointer border shrink-0',
                selectedTag === tag
                  ? 'bg-ink text-on-ink border-ink font-bold'
                  : 'bg-surface text-ink-muted border-border hover:text-ink'
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-md border border-dashed border-border bg-surface space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-ink-muted opacity-40" />
          <h3 className="font-display text-small font-bold text-ink">No events match your criteria</h3>
          <p className="text-small text-ink-muted max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or submit a new proposal.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSelectedTag(null)
              setSelectedKind('all')
              setShowOnlyAttending(false)
            }}
            className="px-3.5 py-1.5 rounded-sm text-small font-medium text-ink border border-border bg-surface-sunken hover:bg-surface transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={handleOpenDetail}
              onQuickRsvp={handleQuickRsvp}
              isRsvping={rsvpingId === event.id}
            />
          ))}
        </div>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEventDetail?.event || events.find((e) => e.id === selectedEventId) || null}
        teams={selectedEventDetail?.teams || []}
        messages={selectedEventDetail?.messages || []}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedEventId(null)
          setSelectedEventDetail(null)
        }}
        onEventUpdated={refreshEvents}
        isAdmin={isAdmin}
      />

      {/* Propose Event Modal */}
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={refreshEvents}
      />
    </div>
  )
}
