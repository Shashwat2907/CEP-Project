'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  ArrowRight,
  ExternalLink,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import {
  CALENDAR_SOURCE_METAS,
  type CalendarEventItem,
  type SourceMeta,
} from '../schema'
import { createPersonalEntryAction } from '../actions'

export interface TodayScheduleBlockProps {
  initialEntries?: CalendarEventItem[]
  className?: string
}

export function TodayScheduleBlock({
  initialEntries = [],
  className,
}: TodayScheduleBlockProps) {
  const [entries, setEntries] = React.useState<CalendarEventItem[]>(initialEntries)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form fields
  const [title, setTitle] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [startTime, setStartTime] = React.useState('14:00')
  const [endTime, setEndTime] = React.useState('15:00')
  const [description, setDescription] = React.useState('')

  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  // Format start and end time
  const formatTimeRange = (startsAt: string, endsAt: string) => {
    const s = new Date(startsAt)
    const e = new Date(endsAt)
    return `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
  }

  const handleCreatePersonalEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const todayIso = today.toISOString().slice(0, 10)
      const startsAt = new Date(`${todayIso}T${startTime}:00`).toISOString()
      const endsAt = new Date(`${todayIso}T${endTime}:00`).toISOString()

      const res = await createPersonalEntryAction({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startsAt,
        endsAt,
      })

      if (res.ok && res.data) {
        setEntries((prev) => [...prev, res.data!].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()))
        setIsDialogOpen(false)
        setTitle('')
        setDescription('')
        setLocation('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      className={cn(
        'bg-surface border border-border rounded-md p-5 sm:p-6 space-y-5',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-highlight" />
            <h2 className="font-display text-h2 font-bold text-ink tracking-tight">
              Today on Campus
            </h2>
            <span className="text-small font-mono text-ink-muted">
              — {formattedDate}
            </span>
          </div>
          <p className="text-small text-ink-muted mt-0.5">
            Aggregated classes, 1:1 teacher meets, events, and personal items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="text-small h-8"
          >
            <Plus size={14} />
            <span>Add personal item</span>
          </Button>

          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="text-small h-8">
              <span>Full calendar</span>
              <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Events List with Colored Left Bar per Source (DESIGN.MD §8) */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="py-8 text-center bg-surface-sunken/40 rounded-md border border-dashed border-border p-6">
            <CalendarDays size={32} className="mx-auto text-ink-muted mb-2 opacity-50" />
            <p className="font-display text-small font-bold text-ink">
              No calendar entries scheduled for today.
            </p>
            <p className="text-meta text-ink-muted mt-0.5">
              Add a personal reminder, study block, or check the full timetable.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="mt-3"
            >
              <Plus size={14} />
              <span>Add personal item</span>
            </Button>
          </div>
        ) : (
          entries.map((item) => {
            const meta: SourceMeta = CALENDAR_SOURCE_METAS[item.sourceType] || {
              type: item.sourceType,
              label: item.sourceType,
              colorToken: 'var(--color-personal)',
              hex: '#6B7280',
              borderColor: '#6B7280',
              badgeClass: 'bg-surface-sunken text-ink-muted',
            }

            return (
              <div
                key={item.id}
                style={{ borderLeftColor: meta.hex }}
                className={cn(
                  'border-l-4 bg-surface-sunken/40 hover:bg-surface-sunken/80 border-t border-r border-b border-border rounded-r-md p-3.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3'
                )}
              >
                {/* Event info */}
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
                      {formatTimeRange(item.startsAt, item.endsAt)}
                    </span>
                  </div>

                  <h3 className="font-display text-small sm:text-base font-bold text-ink dark:text-white leading-snug">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-[12px] text-ink-muted dark:text-slate-300 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Location & Link */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-meta w-full sm:w-auto">
                  {item.location && (
                    <span className="inline-flex items-center gap-1 text-ink-muted dark:text-slate-300 font-mono text-[11px]">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-[150px]">{item.location}</span>
                    </span>
                  )}

                  {item.link && (
                    <Link
                      href={item.link}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-meta font-mono font-semibold rounded-sm bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 text-ink dark:text-white hover:bg-surface-sunken transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Quick Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Personal Calendar Item</DialogTitle>
            <DialogDescription>
              Quickly add a personal study slot, assignment reminder, or task to today's schedule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePersonalEntry} className="space-y-4 py-2">
            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Study algorithms for lab test"
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
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
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Library 2nd Floor, Room 102"
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Notes / Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Additional details..."
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-body"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !title.trim()}>
                <span>Add to Today</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
