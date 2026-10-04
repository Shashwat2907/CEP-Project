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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-[var(--primary)]" />
            Campus Events & Hackathons
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Discover college club events, technical symposia, and national hackathons
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 active:scale-95 shadow-sm flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Propose Event</span>
        </button>
      </div>

      {/* Kind Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] gap-2">
        <button
          type="button"
          onClick={() => setSelectedKind('all')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            selectedKind === 'all'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Opportunities ({events.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedKind('college')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            selectedKind === 'college'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          College Events
        </button>

        <button
          type="button"
          onClick={() => setSelectedKind('external')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            selectedKind === 'external'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          External Hackathons & Summits
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, club, department, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowOnlyAttending(!showOnlyAttending)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
              showOnlyAttending
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'border-[var(--border-subtle)] bg-[var(--surface-paper)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>My RSVPs</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowPending(!showPending)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                showPending
                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-paper)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Review Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Tag Chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] mr-1">
            Filter by:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedTag === null
                ? 'bg-[var(--primary)] text-white shadow-2xs'
                : 'bg-[var(--surface-paper)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedTag === tag
                  ? 'bg-[var(--primary)] text-white shadow-2xs'
                  : 'bg-[var(--surface-paper)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-paper)] space-y-3">
          <Calendar className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No events match your criteria</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
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
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-sunken)] transition-colors"
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
