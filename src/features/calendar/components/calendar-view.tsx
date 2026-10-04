'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Edit2,
  ExternalLink,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import {
  CALENDAR_SOURCE_METAS,
  type CalendarEventItem,
  type CalendarViewMode,
  type SourceMeta,
} from '../schema'
import type { CalendarSourceType } from '@/shared/calendar/calendar'
import {
  createPersonalEntryAction,
  updatePersonalEntryAction,
  deletePersonalEntryAction,
} from '../actions'

export interface CalendarViewProps {
  initialEntries?: CalendarEventItem[]
  initialViewMode?: CalendarViewMode
}

export function CalendarView({
  initialEntries = [],
  initialViewMode = 'agenda',
}: CalendarViewProps) {
  const [entries, setEntries] = React.useState<CalendarEventItem[]>(initialEntries)
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>(initialViewMode)
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [activeSources, setActiveSources] = React.useState<CalendarSourceType[]>([
    'class',
    'meet',
    'event',
    'club_event',
    'personal',
    'lostfound',
    'complaints',
  ])

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<CalendarEventItem | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form fields
  const [formTitle, setFormTitle] = React.useState('')
  const [formDate, setFormDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [formStartTime, setFormStartTime] = React.useState('10:00')
  const [formEndTime, setFormEndTime] = React.useState('11:00')
  const [formLocation, setFormLocation] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')

  // Toggle filter
  const toggleSourceFilter = (type: CalendarSourceType) => {
    setActiveSources((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  // Filtered entries
  const filteredEntries = React.useMemo(() => {
    return entries.filter((e) => activeSources.includes(e.sourceType))
  }, [entries, activeSources])

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(selectedDate)
    if (viewMode === 'day') next.setDate(next.getDate() - 1)
    else if (viewMode === 'week') next.setDate(next.getDate() - 7)
    else next.setMonth(next.getMonth() - 1)
    setSelectedDate(next)
  }

  const handleNext = () => {
    const next = new Date(selectedDate)
    if (viewMode === 'day') next.setDate(next.getDate() + 1)
    else if (viewMode === 'week') next.setDate(next.getDate() + 7)
    else next.setMonth(next.getMonth() + 1)
    setSelectedDate(next)
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  // Create personal entry
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return
    setIsSubmitting(true)

    try {
      const startsAt = new Date(`${formDate}T${formStartTime}:00`).toISOString()
      const endsAt = new Date(`${formDate}T${formEndTime}:00`).toISOString()

      const res = await createPersonalEntryAction({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        location: formLocation.trim() || undefined,
        startsAt,
        endsAt,
      })

      if (res.ok && res.data) {
        setEntries((prev) => [...prev, res.data!].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()))
        setIsCreateOpen(false)
        resetForm()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit personal entry
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || !formTitle.trim()) return
    setIsSubmitting(true)

    try {
      const startsAt = new Date(`${formDate}T${formStartTime}:00`).toISOString()
      const endsAt = new Date(`${formDate}T${formEndTime}:00`).toISOString()

      const res = await updatePersonalEntryAction({
        id: editingItem.id,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        location: formLocation.trim() || undefined,
        startsAt,
        endsAt,
      })

      if (res.ok) {
        setEntries((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  title: formTitle.trim(),
                  description: formDescription.trim() || null,
                  location: formLocation.trim() || null,
                  startsAt,
                  endsAt,
                }
              : item
          )
        )
        setIsEditOpen(false)
        setEditingItem(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete personal entry
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this personal calendar entry?')) return
    await deletePersonalEntryAction(id)
    setEntries((prev) => prev.filter((item) => item.id !== id))
  }

  const openEditModal = (item: CalendarEventItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    const startDate = new Date(item.startsAt)
    const endDate = new Date(item.endsAt)
    setFormDate(startDate.toISOString().slice(0, 10))
    setFormStartTime(startDate.toTimeString().slice(0, 5))
    setFormEndTime(endDate.toTimeString().slice(0, 5))
    setFormLocation(item.location || '')
    setFormDescription(item.description || '')
    setIsEditOpen(true)
  }

  const resetForm = () => {
    setFormTitle('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormStartTime('10:00')
    setFormEndTime('11:00')
    setFormLocation('')
    setFormDescription('')
  }

  // Date formatting
  const formatRangeLabel = () => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    if (viewMode === 'week') {
      const startOfWeek = new Date(selectedDate)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Mon start
      startOfWeek.setDate(diff)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Group events by day for agenda view
  const groupedEventsByDay = React.useMemo(() => {
    const groups: { [dateStr: string]: CalendarEventItem[] } = {}
    filteredEntries.forEach((event) => {
      const d = new Date(event.startsAt).toDateString()
      if (!groups[d]) groups[d] = []
      groups[d].push(event)
    })
    return groups
  }, [filteredEntries])

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Controls */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-ink text-on-ink flex items-center justify-center font-display font-bold text-lg">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="font-display text-h1 font-bold text-ink tracking-tight">
                Campus Calendar
              </h1>
              <p className="text-small text-ink-muted">
                Unified schedule across classes, teacher meets, events, and personal items.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm()
                setIsCreateOpen(true)
              }}
            >
              <Plus size={15} />
              <span>Add Personal Item</span>
            </Button>
          </div>
        </div>

        {/* View Switcher, Date Controls, and Month Label */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Previous / Today / Next */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-sm border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-xs hover:bg-surface-sunken text-ink transition-colors cursor-pointer"
                title="Previous"
                aria-label="Previous period"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-meta font-mono font-medium hover:bg-surface-sunken text-ink transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-xs hover:bg-surface-sunken text-ink transition-colors cursor-pointer"
                title="Next"
                aria-label="Next period"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <span className="font-display text-base font-bold text-ink ml-1">
              {formatRangeLabel()}
            </span>
          </div>

          {/* View Mode Tabs: Day, Week, Agenda */}
          <div className="inline-flex rounded-sm border border-border bg-surface-sunken p-1">
            {(['day', 'week', 'agenda'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1 rounded-xs text-small font-medium capitalize transition-colors cursor-pointer',
                  viewMode === mode
                    ? 'bg-surface text-ink font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Source Categorical Filter Chips (DESIGN.MD §8) */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-ink-muted uppercase mr-1 flex items-center gap-1">
            <Filter size={12} /> Sources:
          </span>

          {(Object.keys(CALENDAR_SOURCE_METAS) as CalendarSourceType[]).map((sourceType) => {
            const meta = CALENDAR_SOURCE_METAS[sourceType]
            const isSelected = activeSources.includes(sourceType)

            return (
              <button
                key={sourceType}
                type="button"
                onClick={() => toggleSourceFilter(sourceType)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono font-medium border transition-all cursor-pointer',
                  isSelected
                    ? 'bg-surface text-ink border-border shadow-xs'
                    : 'bg-surface-sunken/50 text-ink-muted border-transparent opacity-60 hover:opacity-100'
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.hex }}
                />
                <span>{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Agenda View */}
      {viewMode === 'agenda' && (
        <div className="space-y-6">
          {Object.keys(groupedEventsByDay).length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-10 text-center space-y-3">
              <CalendarDays size={36} className="mx-auto text-ink-muted opacity-50" />
              <h3 className="font-display text-h2 font-bold text-ink">
                No entries matching active filters.
              </h3>
              <p className="text-small text-ink-muted max-w-md mx-auto">
                Try selecting more source filters or add a new personal calendar entry.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  resetForm()
                  setIsCreateOpen(true)
                }}
              >
                <Plus size={14} />
                <span>Create Entry</span>
              </Button>
            </div>
          ) : (
            Object.entries(groupedEventsByDay).map(([dayLabel, dayEvents]) => (
              <div key={dayLabel} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-small text-ink uppercase tracking-wide">
                    {dayLabel}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] font-mono text-ink-muted">
                    {dayEvents.length} items
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayEvents.map((item) => {
                    const meta: SourceMeta = CALENDAR_SOURCE_METAS[item.sourceType] || {
                      type: item.sourceType,
                      label: item.sourceType,
                      colorToken: 'var(--color-personal)',
                      hex: '#6B7280',
                      borderColor: '#6B7280',
                      badgeClass: 'bg-surface-sunken text-ink-muted',
                    }

                    const starts = new Date(item.startsAt)
                    const ends = new Date(item.endsAt)
                    const timeRange = `${starts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – ${ends.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`

                    return (
                      <div
                        key={item.id}
                        style={{ borderLeftColor: meta.hex }}
                        className="bg-surface border-l-4 border-t border-r border-b border-border rounded-r-md p-4 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={cn(
                                'text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-xs border',
                                meta.badgeClass
                              )}
                            >
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                              <Clock size={11} />
                              {timeRange}
                            </span>
                          </div>

                          <h3 className="font-display text-base font-bold text-ink leading-tight">
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="text-small text-ink-muted mt-1 leading-snug">
                              {item.description}
                            </p>
                          )}

                          {item.location && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-ink-muted">
                              <MapPin size={12} className="shrink-0" />
                              <span>{item.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.link && (
                            <Link
                              href={item.link}
                              className="px-2.5 py-1 text-meta font-mono font-semibold rounded-sm bg-surface-sunken border border-border text-ink hover:bg-border transition-colors flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink size={12} />
                            </Link>
                          )}

                          {item.isPersonal && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-sm hover:bg-surface-sunken text-ink-muted hover:text-ink transition-colors cursor-pointer"
                                title="Edit personal item"
                                aria-label="Edit item"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 rounded-sm hover:bg-danger/10 text-ink-muted hover:text-danger transition-colors cursor-pointer"
                                title="Delete personal item"
                                aria-label="Delete item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. Day View */}
      {viewMode === 'day' && (
        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h3 className="font-display font-bold text-h2 text-ink">
              Timeline for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <span className="text-[11px] font-mono text-ink-muted">
              {filteredEntries.filter((e) => new Date(e.startsAt).toDateString() === selectedDate.toDateString()).length} events
            </span>
          </div>

          <div className="space-y-3">
            {filteredEntries
              .filter((e) => new Date(e.startsAt).toDateString() === selectedDate.toDateString())
              .map((item) => {
                const meta = CALENDAR_SOURCE_METAS[item.sourceType] || {
                  type: item.sourceType,
                  label: item.sourceType,
                  colorToken: 'var(--color-personal)',
                  hex: '#6B7280',
                  borderColor: '#6B7280',
                  badgeClass: 'bg-surface-sunken text-ink-muted',
                }
                const starts = new Date(item.startsAt)
                const ends = new Date(item.endsAt)
                const timeRange = `${starts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – ${ends.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`

                return (
                  <div
                    key={item.id}
                    style={{ borderLeftColor: meta.hex }}
                    className="border-l-4 border-t border-r border-b border-border rounded-r-md p-4 bg-surface-sunken/40 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            'text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-xs border',
                            meta.badgeClass
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] font-mono text-ink-muted">
                          {timeRange}
                        </span>
                      </div>
                      <h4 className="font-display text-base font-bold text-ink">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-small text-ink-muted mt-0.5">{item.description}</p>
                      )}
                      {item.location && (
                        <p className="text-[11px] font-mono text-ink-muted mt-1.5 flex items-center gap-1">
                          <MapPin size={12} /> {item.location}
                        </p>
                      )}
                    </div>

                    {item.isPersonal && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-sm hover:bg-surface-sunken text-ink-muted hover:text-ink cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-sm hover:bg-danger/10 text-ink-muted hover:text-danger cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* 4. Week View */}
      {viewMode === 'week' && (
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-surface-sunken/40 text-center py-2.5 text-meta font-mono font-bold text-ink">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 min-h-[400px] divide-x divide-border">
            {Array.from({ length: 7 }).map((_, idx) => {
              const startOfWeek = new Date(selectedDate)
              const day = startOfWeek.getDay()
              const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + idx
              const cellDate = new Date(startOfWeek.setDate(diff))
              const isToday = cellDate.toDateString() === new Date().toDateString()
              const dayEvents = filteredEntries.filter(
                (e) => new Date(e.startsAt).toDateString() === cellDate.toDateString()
              )

              return (
                <div
                  key={idx}
                  className={cn(
                    'p-2 min-h-[160px] space-y-2 transition-colors',
                    isToday ? 'bg-highlight/5' : 'bg-surface'
                  )}
                >
                  <div className="text-right">
                    <span
                      className={cn(
                        'text-meta font-mono px-1.5 py-0.5 rounded-sm',
                        isToday
                          ? 'bg-highlight text-ink font-bold'
                          : 'text-ink-muted'
                      )}
                    >
                      {cellDate.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayEvents.map((ev) => {
                      const meta = CALENDAR_SOURCE_METAS[ev.sourceType]
                      return (
                        <div
                          key={ev.id}
                          style={{ borderLeftColor: meta?.hex || '#6B7280' }}
                          className="border-l-2 bg-surface-sunken p-1.5 rounded-r-xs text-[11px] leading-tight hover:bg-border transition-colors cursor-pointer"
                          onClick={() => ev.isPersonal && openEditModal(ev)}
                          title={`${ev.title} (${new Date(ev.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                        >
                          <span className="font-semibold block truncate text-ink">
                            {ev.title}
                          </span>
                          <span className="text-[10px] font-mono text-ink-muted">
                            {new Date(ev.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Personal Calendar Entry</DialogTitle>
            <DialogDescription>
              Schedule an assignment deadline, personal study block, or reminder.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Study Graph Algorithms"
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Central Library 2nd Floor"
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Description / Notes
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Key goals or checklist..."
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-body"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !formTitle.trim()}>
                <span>Create Entry</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Personal Entry</DialogTitle>
            <DialogDescription>
              Modify title, time slot, or location for this personal item.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Location
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Description / Notes
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink focus-visible:outline-2 focus-visible:outline-ink font-body"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !formTitle.trim()}>
                <span>Save Changes</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
