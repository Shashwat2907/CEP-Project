'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { EmptyState } from '@/shared/ui/empty-state'
import { Clock, Calendar, Sparkles } from 'lucide-react'
import { fetchSlotsAction } from '../actions'
import type { GeneratedSlot } from '../schema'

interface SlotGridProps {
  teacherId: string
  teacherName: string
  initialDate?: string
  initialSlots?: GeneratedSlot[]
  onSelectSlot?: (slot: GeneratedSlot) => void
  selectedSlotId?: string
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getNext7Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    days.push(`${yyyy}-${mm}-${dd}`)
  }
  return days
}

export function SlotGrid({
  teacherId,
  teacherName,
  initialDate,
  initialSlots = [],
  onSelectSlot,
  selectedSlotId,
}: SlotGridProps) {
  const dateOptions = React.useMemo(() => getNext7Days(), [])
  const [selectedDate, setSelectedDate] = React.useState<string>(initialDate ?? dateOptions[0])
  const [slots, setSlots] = React.useState<GeneratedSlot[]>(initialSlots)
  const [isPending, startTransition] = React.useTransition()
  const [initialLoading, setInitialLoading] = React.useState(initialSlots.length === 0)

  // Initial slot load if not pre-populated
  React.useEffect(() => {
    if (initialSlots.length > 0) return
    let active = true

    fetchSlotsAction(teacherId, selectedDate)
      .then((res) => {
        if (active) {
          setSlots(res)
          setInitialLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setSlots([])
          setInitialLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [teacherId, selectedDate, initialSlots.length])

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    startTransition(async () => {
      try {
        const res = await fetchSlotsAction(teacherId, newDate)
        setSlots(res)
      } catch {
        setSlots([])
      }
    })
  }

  const loading = isPending || initialLoading

  return (
    <Card className="bg-surface">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-h3">
              <Calendar className="h-5 w-5 text-accent" /> Available Appointment Slots
            </CardTitle>
            <p className="text-small text-ink-muted mt-0.5">
              Select a date to preview open office hours with {teacherName}.
            </p>
          </div>

          <div className="text-meta text-ink-muted flex items-center gap-1.5 font-medium">
            <Clock className="h-4 w-4" />
            <span>Campus Standard Time</span>
          </div>
        </div>

        {/* Date Selector Quick Buttons */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {dateOptions.map((dateStr, idx) => {
            const isSelected = dateStr === selectedDate
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDateChange(dateStr)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-small font-medium border transition-all text-left ${
                  isSelected
                    ? 'border-ink bg-ink text-surface shadow-sm'
                    : 'border-border bg-surface hover:border-border-strong text-ink'
                }`}
              >
                <div className="text-meta opacity-80">
                  {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : dateStr.slice(5)}
                </div>
                <div className="font-semibold text-small leading-tight">
                  {formatDateDisplay(dateStr)}
                </div>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-small text-ink-muted">
            Generating availability slots...
          </div>
        ) : slots.length === 0 ? (
          <EmptyState
            title="No open slots on this date"
            description="The teacher does not have office hours or is on leave on this date. Please check another day."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-meta text-ink-muted">
              <span>{slots.length} open slot{slots.length === 1 ? '' : 's'} found</span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" /> Regular
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-success ml-2" /> Extra Slot
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id
                return (
                  <Button
                    key={slot.id}
                    type="button"
                    variant={isSelected ? 'primary' : 'outline'}
                    onClick={() => onSelectSlot?.(slot)}
                    className={`h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      isSelected ? 'ring-2 ring-ink ring-offset-2' : ''
                    }`}
                  >
                    <div className="font-semibold text-small flex items-center gap-1">
                      <span>{slot.start_time}</span>
                      <span className="text-meta opacity-60">→</span>
                      <span>{slot.end_time}</span>
                    </div>

                    <div className="flex items-center gap-1 text-meta">
                      {slot.override_type === 'extra' ? (
                        <Chip variant="success" className="text-[10px] py-0 px-1">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5 inline" /> Extra
                        </Chip>
                      ) : (
                        <span className="opacity-70">{slot.slot_minutes} min</span>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
