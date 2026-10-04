'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
  Check,
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
import { motionMicro, motionPanel, reduceMotion } from '@/lib/motion'

export interface CalendarViewProps {
  initialEntries?: CalendarEventItem[]
  initialViewMode?: CalendarViewMode
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const HOUR_HEIGHT = 64 // pixels per hour row

export function CalendarView({
  initialEntries = [],
  initialViewMode = 'day',
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

  // Quick slot click handler to open Add modal prefilled
  const handleSlotClick = (dateStr: string, hour: number) => {
    const startStr = `${hour.toString().padStart(2, '0')}:00`
    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`
    setFormDate(dateStr)
    setFormStartTime(startStr)
    setFormEndTime(endStr)
    setFormTitle('')
    setFormDescription('')
    setFormLocation('')
    setIsCreateOpen(true)
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
        setEntries((prev) =>
          [...prev, res.data!].sort(
            (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          )
        )
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
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
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

  // Week days calculation
  const weekDays = React.useMemo(() => {
    const days = []
    const startOfWeek = new Date(selectedDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }, [selectedDate])

  // Current time position (for today indicator)
  const now = new Date()
  const isSelectedDateToday = selectedDate.toDateString() === now.toDateString()
  const currentHourDec = now.getHours() + now.getMinutes() / 60
  const isNowInVisibleHours = currentHourDec >= 8 && currentHourDec <= 20
  const nowTopPx = (currentHourDec - 8) * HOUR_HEIGHT

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Controls */}
      <div className="bg-surface border border-border rounded-md p-5 shadow-none space-y-4">
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
              <span>Add personal item</span>
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
                    ? 'bg-surface text-ink font-bold'
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
          <span className="text-[11px] font-mono text-ink-muted mr-1 flex items-center gap-1">
            <Filter size={12} /> Sources:
          </span>

          {(Object.keys(CALENDAR_SOURCE_METAS) as CalendarSourceType[]).map((sourceType) => {
            const meta = CALENDAR_SOURCE_METAS[sourceType]
            const isSelected = activeSources.includes(sourceType)
            const count = entries.filter((e) => e.sourceType === sourceType).length

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
                <span className="text-[10px] text-ink-muted font-normal">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Interactive Day View with Hourly Time Grid (08:00 - 20:00) */}
      {viewMode === 'day' && (
        <div className="bg-surface border border-border rounded-md overflow-hidden shadow-none space-y-0">
          {/* Day Header */}
          <div className="p-4 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-h2 text-ink">
                Timeline for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <p className="text-meta text-ink-muted mt-0.5">
                Click on any hour slot to schedule a personal task, study block, or assignment.
              </p>
            </div>
            <span className="text-meta font-mono font-bold px-2 py-0.5 rounded-sm bg-surface border border-border text-ink">
              {filteredEntries.filter((e) => new Date(e.startsAt).toDateString() === selectedDate.toDateString()).length} events
            </span>
          </div>

          {/* Time Canvas */}
          <div className="relative overflow-x-auto">
            <div className="min-w-[650px] relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
              {/* Hour Grid Rows */}
              {HOURS.map((hour, idx) => (
                <div
                  key={hour}
                  onClick={() => handleSlotClick(selectedDate.toISOString().slice(0, 10), hour)}
                  className="group absolute left-0 right-0 border-b border-border flex items-start hover:bg-surface-sunken/40 transition-colors cursor-pointer"
                  style={{
                    top: `${idx * HOUR_HEIGHT}px`,
                    height: `${HOUR_HEIGHT}px`,
                  }}
                >
                  {/* Hour Gutter */}
                  <div className="w-16 shrink-0 pr-3 pt-1 text-right text-meta font-mono text-ink-muted select-none">
                    {hour.toString().padStart(2, '0')}:00
                  </div>

                  {/* Half-hour dashed line */}
                  <div className="flex-1 h-full border-l border-border relative">
                    <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-border/30" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-mono text-ink-muted pl-2 pt-1 inline-block select-none">
                      + Add item at {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                </div>
              ))}

              {/* Red Current Time Line (if viewing today and in range) */}
              {isSelectedDateToday && isNowInVisibleHours && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                  style={{ top: `${nowTopPx}px` }}
                >
                  <div className="w-16 pr-2 text-right">
                    <span className="px-1.5 py-0.5 rounded-xs bg-danger text-white text-[9px] font-mono font-bold">
                      Now
                    </span>
                  </div>
                  <div className="flex-1 h-[2px] bg-danger relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-danger absolute -left-1 -top-1" />
                  </div>
                </div>
              )}

              {/* Event Blocks Placed on Canvas */}
              {filteredEntries
                .filter((e) => new Date(e.startsAt).toDateString() === selectedDate.toDateString())
                .map((item) => {
                  const meta = CALENDAR_SOURCE_METAS[item.sourceType] || {
                    type: item.sourceType,
                    label: item.sourceType,
                    hex: '#6B7280',
                    badgeClass: 'bg-surface-sunken text-ink-muted',
                  }

                  const starts = new Date(item.startsAt)
                  const ends = new Date(item.endsAt)
                  const startHour = starts.getHours() + starts.getMinutes() / 60
                  const endHour = ends.getHours() + ends.getMinutes() / 60
                  const duration = Math.max(0.75, endHour - startHour)

                  const clampedStart = Math.max(8, Math.min(20, startHour))
                  const top = (clampedStart - 8) * HOUR_HEIGHT
                  const height = Math.max(48, Math.min(HOURS.length * HOUR_HEIGHT - top, duration * HOUR_HEIGHT - 4))

                  const timeRange = `${starts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – ${ends.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`

                  return (
                    <div
                      key={item.id}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: '72px',
                        right: '16px',
                        borderLeftColor: meta.hex,
                      }}
                      className="absolute z-10 bg-surface border-l-4 border-t border-r border-b border-border rounded-r-md p-3 hover:border-ink/60 transition-all flex flex-col justify-between overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-xs border',
                                meta.badgeClass
                              )}
                            >
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                              <Clock size={11} /> {timeRange}
                            </span>
                          </div>

                          <h4 className="font-display text-small font-bold text-ink truncate leading-tight">
                            {item.title}
                          </h4>

                          {item.description && (
                            <p className="text-[12px] text-ink-muted truncate">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {item.link && (
                            <Link
                              href={item.link}
                              className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-xs bg-surface-sunken border border-border text-ink hover:bg-border transition-colors flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink size={10} />
                            </Link>
                          )}

                          {item.isPersonal && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditModal(item)
                                }}
                                className="p-1 rounded-xs hover:bg-surface-sunken text-ink-muted hover:text-ink cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(item.id)
                                }}
                                className="p-1 rounded-xs hover:bg-danger/10 text-ink-muted hover:text-danger cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {item.location && (
                        <p className="text-[11px] font-mono text-ink-muted flex items-center gap-1 pt-1 truncate">
                          <MapPin size={11} /> {item.location}
                        </p>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Interactive Week View with 7 Day Columns */}
      {viewMode === 'week' && (
        <div className="bg-surface border border-border rounded-md shadow-none overflow-hidden">
          {/* 7 Column Header */}
          <div className="grid grid-cols-7 border-b border-border bg-surface-sunken/40 text-center divide-x divide-border">
            {weekDays.map((d) => {
              const isToday = d.toDateString() === new Date().toDateString()
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div
                  key={d.toISOString()}
                  onClick={() => {
                    setSelectedDate(d)
                    setViewMode('day')
                  }}
                  className={cn(
                    'py-2.5 px-1 cursor-pointer transition-colors hover:bg-surface',
                    isToday && 'bg-highlight/10'
                  )}
                >
                  <span className="text-[11px] font-mono text-ink-muted block">
                    {dayName}
                  </span>
                  <span
                    className={cn(
                      'text-meta font-mono font-bold px-2 py-0.5 rounded-sm inline-block mt-0.5',
                      isToday
                        ? 'bg-highlight text-ink'
                        : 'text-ink'
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* 7 Columns Timetable Grid */}
          <div className="grid grid-cols-7 divide-x divide-border min-h-[520px]">
            {weekDays.map((colDate) => {
              const dateStr = colDate.toISOString().slice(0, 10)
              const isToday = colDate.toDateString() === new Date().toDateString()
              const dayEvents = filteredEntries.filter(
                (e) => new Date(e.startsAt).toDateString() === colDate.toDateString()
              )

              return (
                <div
                  key={dateStr}
                  onClick={() => handleSlotClick(dateStr, 10)}
                  className={cn(
                    'p-1.5 space-y-1.5 min-h-[520px] transition-colors hover:bg-surface-sunken/20 cursor-pointer',
                    isToday ? 'bg-highlight/5' : 'bg-surface'
                  )}
                >
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center opacity-30 select-none">
                      <span className="text-[10px] font-mono text-ink-muted">+ Free</span>
                    </div>
                  ) : (
                    dayEvents.map((ev) => {
                      const meta = CALENDAR_SOURCE_METAS[ev.sourceType]
                      const starts = new Date(ev.startsAt)
                      const timeStr = starts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (ev.isPersonal) openEditModal(ev)
                          }}
                          style={{ borderLeftColor: meta?.hex || '#6B7280' }}
                          className="border-l-3 bg-surface border border-border p-2 rounded-r-sm text-[11px] leading-tight hover:border-ink/40 transition-colors"
                        >
                          <span className="font-semibold block truncate text-ink">
                            {ev.title}
                          </span>
                          <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {timeStr}
                          </span>
                          {ev.location && (
                            <span className="text-[10px] font-mono text-ink-muted block truncate mt-0.5">
                              {ev.location}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Agenda View */}
      {viewMode === 'agenda' && (
        <div className="space-y-6">
          {Object.keys(groupedEventsByDay).length === 0 ? (
            <div className="bg-surface border border-border rounded-md p-10 text-center space-y-3">
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
                <span>Create entry</span>
              </Button>
            </div>
          ) : (
            Object.entries(groupedEventsByDay).map(([dayLabel, dayEvents]) => (
              <div key={dayLabel} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-small text-ink">
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
                        className="bg-surface border-l-4 border-t border-r border-b border-border rounded-r-md p-4 shadow-none hover:border-ink/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={cn(
                                'text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-xs border',
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-surface border border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-h2 font-bold text-ink">
              Add Personal Schedule Item
            </DialogTitle>
            <DialogDescription className="text-small text-ink-muted">
              Add assignment work, personal study time, or project tasks to your calendar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-meta font-mono font-bold text-ink">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Complete Operating Systems Paging Lab"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Main Library"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">Start Time</label>
                <input
                  type="time"
                  required
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">End Time</label>
                <input
                  type="time"
                  required
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-meta font-mono font-bold text-ink">Notes / Description</label>
              <textarea
                rows={2}
                placeholder="Details or references..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Save to Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-surface border border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-h2 font-bold text-ink">
              Edit Personal Item
            </DialogTitle>
            <DialogDescription className="text-small text-ink-muted">
              Update details or scheduled time for this task.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-meta font-mono font-bold text-ink">Title</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">Start Time</label>
                <input
                  type="time"
                  required
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-meta font-mono font-bold text-ink">End Time</label>
                <input
                  type="time"
                  required
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-meta font-mono font-bold text-ink">Notes</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
