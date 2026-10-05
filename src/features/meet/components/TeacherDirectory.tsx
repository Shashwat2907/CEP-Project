'use client'

import * as React from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { EmptyState } from '@/shared/ui/empty-state'
import { Search, MapPin, Calendar, CheckCircle2 } from 'lucide-react'
import type { TeacherSummary, GeneratedSlot } from '../schema'
import { SlotGrid } from './SlotGrid'
import { RequestSessionModal } from './RequestSessionModal'

interface TeacherDirectoryProps {
  teachers: TeacherSummary[]
}

export function TeacherDirectory({ teachers }: TeacherDirectoryProps) {
  const [search, setSearch] = React.useState('')
  const [selectedTeacher, setSelectedTeacher] = React.useState<TeacherSummary | null>(null)
  const [bookingSlot, setBookingSlot] = React.useState<GeneratedSlot | null>(null)
  const [bookingSuccessNotice, setBookingSuccessNotice] = React.useState<string | null>(null)

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase()
    return (
      t.full_name.toLowerCase().includes(q) ||
      (t.department && t.department.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Booking Success Notice */}
      {bookingSuccessNotice && (
        <div className="flex items-center justify-between bg-success/10 border border-success/30 text-success p-4 rounded-lg">
          <div className="flex items-center gap-2 text-small font-medium">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{bookingSuccessNotice}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-success border-success/40 hover:bg-success/15"
            onClick={() => setBookingSuccessNotice(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            placeholder="Search teachers by name or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <span className="text-small text-ink-muted">
          Showing {filtered.length} faculty member{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Selected Teacher Open Slots Panel */}
      {selectedTeacher && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-semibold text-ink flex items-center gap-2">
              <span>Booking Availability for</span>
              <span className="text-accent">{selectedTeacher.full_name}</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTeacher(null)}
            >
              Close Slots View
            </Button>
          </div>

          <SlotGrid
            teacherId={selectedTeacher.id}
            teacherName={selectedTeacher.full_name}
            selectedSlotId={bookingSlot?.id}
            onSelectSlot={(slot) => setBookingSlot(slot)}
          />

          <RequestSessionModal
            teacher={selectedTeacher}
            slot={bookingSlot}
            isOpen={Boolean(bookingSlot)}
            onClose={() => setBookingSlot(null)}
            onSuccess={() => {
              setBookingSuccessNotice(
                `Your appointment request with ${selectedTeacher.full_name} has been sent! Check 'My Appointments' for status updates.`
              )
              setSelectedTeacher(null)
            }}
          />
        </div>
      )}

      {/* Teachers Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No faculty members found"
          description="Try searching with a different name or department."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const isSelected = selectedTeacher?.id === t.id
            return (
              <Card
                key={t.id}
                className={`bg-surface transition-all hover:border-border-strong ${
                  isSelected ? 'ring-2 ring-ink ring-offset-2' : ''
                }`}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-surface-sunken border border-border flex items-center justify-center text-ink font-semibold text-small shrink-0">
                        {t.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-ink text-small truncate">
                          {t.full_name}
                        </h3>
                        <p className="text-meta text-ink-muted truncate">
                          {t.department || 'Faculty Member'}
                        </p>
                      </div>
                    </div>

                    {t.office_hours_text && (
                      <div className="flex items-start gap-1.5 text-meta text-ink-muted bg-surface-sunken p-2.5 rounded-md border border-border/40">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
                        <span className="line-clamp-2">{t.office_hours_text}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant={isSelected ? 'primary' : 'outline'}
                      className="w-full gap-1.5"
                      onClick={() =>
                        setSelectedTeacher((prev) => (prev?.id === t.id ? null : t))
                      }
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{isSelected ? 'Viewing Slots' : 'View Open Slots'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
